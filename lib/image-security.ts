import "server-only";
import {
  allowedImageHosts,
  configuredSupabaseHost,
} from "@/lib/image-hosts";

export { allowedImageHosts } from "@/lib/image-hosts";

const MAX_URL_LENGTH = 2_048;
const SAFE_LOCAL_IMAGE = /^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:avif|gif|jpe?g|png|webp|svg)$/i;
const SAFE_REMOTE_IMAGE = /\.(?:avif|gif|jpe?g|png|webp)$/i;
const PRODUCT_BUCKET_PREFIX = "/storage/v1/object/public/product-images/";

function hasTraversal(pathname: string): boolean {
  try {
    return decodeURIComponent(pathname)
      .split("/")
      .some((segment) => segment === "." || segment === "..");
  } catch {
    return true;
  }
}

/** Normalize one persisted image source or return null when it is unsafe. */
export function normalizeImageSource(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const source = value.normalize("NFKC").trim();
  if (!source || source.length > MAX_URL_LENGTH || source.includes("\\")) return null;

  if (source.startsWith("/")) {
    if (source.startsWith("//") || source.includes("?") || source.includes("#")) return null;
    if (hasTraversal(source) || !SAFE_LOCAL_IMAGE.test(source)) return null;
    return source;
  }

  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return null;
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    url.hash ||
    hasTraversal(url.pathname) ||
    !SAFE_REMOTE_IMAGE.test(url.pathname)
  ) {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (!allowedImageHosts().has(host)) return null;
  const supabaseHost = configuredSupabaseHost();
  if (host === supabaseHost && !url.pathname.startsWith(PRODUCT_BUCKET_PREFIX)) {
    return null;
  }
  return url.toString();
}

export function normalizeImageSources(values: unknown): string[] | null {
  if (!Array.isArray(values) || values.length === 0 || values.length > 12) return null;
  const normalized: string[] = [];
  for (const value of values) {
    const image = normalizeImageSource(value);
    if (!image) return null;
    if (!normalized.includes(image)) normalized.push(image);
  }
  return normalized.length > 0 ? normalized : null;
}

/** Safe CTA: local path or absolute HTTPS URL. Rejects script/data schemes. */
export function normalizeOutboundUrl(
  value: unknown,
  options: { allowExternal?: boolean; optional?: boolean } = {},
): string | null {
  if (typeof value !== "string") return options.optional ? "" : null;
  const input = value.normalize("NFKC").trim();
  if (!input) return options.optional ? "" : null;
  if (input.length > MAX_URL_LENGTH || input.includes("\\")) return null;

  if (input.startsWith("/") && !input.startsWith("//")) {
    try {
      const url = new URL(input, "https://local.invalid");
      if (url.origin !== "https://local.invalid" || hasTraversal(url.pathname)) return null;
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return null;
    }
  }
  if (!options.allowExternal) return null;
  try {
    const url = new URL(input);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export type DetectedImageType = Readonly<{
  contentType: "image/jpeg" | "image/png" | "image/webp" | "image/avif";
  extension: "jpg" | "png" | "webp" | "avif";
}>;

function matchesBytes(
  bytes: Uint8Array,
  offset: number,
  expected: readonly number[],
): boolean {
  return (
    bytes.length >= offset + expected.length &&
    expected.every((value, index) => bytes[offset + index] === value)
  );
}

function matchesAscii(bytes: Uint8Array, offset: number, value: string): boolean {
  return matchesBytes(
    bytes,
    offset,
    Array.from(value, (character) => character.charCodeAt(0)),
  );
}

function isAvif(bytes: Uint8Array): boolean {
  if (bytes.length < 16 || !matchesAscii(bytes, 4, "ftyp")) return false;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let boxSize = view.getUint32(0, false);
  let brandOffset = 8;

  // ISO BMFF extended-size box. Uploaded files are capped at 5 MB, so a
  // non-zero high word cannot describe a valid in-memory box here.
  if (boxSize === 1) {
    if (bytes.length < 24 || view.getUint32(8, false) !== 0) return false;
    boxSize = view.getUint32(12, false);
    brandOffset = 16;
  }

  if (boxSize < brandOffset + 8 || boxSize > bytes.length) return false;
  const isAvifBrand = (offset: number) =>
    matchesAscii(bytes, offset, "avif") || matchesAscii(bytes, offset, "avis");
  if (isAvifBrand(brandOffset)) return true;

  // Skip the four-byte minor version after the major brand.
  for (let offset = brandOffset + 8; offset + 4 <= boxSize; offset += 4) {
    if (isAvifBrand(offset)) return true;
  }
  return false;
}

/** Detect supported raster formats from file bytes, never from a filename. */
export function detectImageType(bytes: Uint8Array): DetectedImageType | null {
  if (matchesBytes(bytes, 0, [0xff, 0xd8, 0xff])) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }
  if (matchesBytes(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { contentType: "image/png", extension: "png" };
  }
  if (matchesAscii(bytes, 0, "RIFF") && matchesAscii(bytes, 8, "WEBP")) {
    return { contentType: "image/webp", extension: "webp" };
  }
  if (isAvif(bytes)) {
    return { contentType: "image/avif", extension: "avif" };
  }
  return null;
}
