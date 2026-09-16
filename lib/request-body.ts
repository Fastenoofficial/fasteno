import "server-only";

export interface BodyLimitOptions {
  maxBytes: number;
  /** Lowercase media types, without parameters (for example application/json). */
  allowedContentTypes?: readonly string[];
  /** Message returned for a missing or incompatible Content-Type. */
  contentTypeError?: string;
}

export type BodyReadError = {
  ok: false;
  status: 400 | 413 | 415;
  error: string;
};

export type BodyReadResult<T> = { ok: true; value: T; bytes: number } | BodyReadError;

function contentType(request: Request): string {
  return (request.headers.get("content-type") ?? "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
}

function validateBodyHeaders(
  request: Request,
  options: BodyLimitOptions,
): BodyReadError | null {
  if (!Number.isSafeInteger(options.maxBytes) || options.maxBytes < 1) {
    throw new Error("maxBytes must be a positive safe integer");
  }

  const rawLength = request.headers.get("content-length");
  if (rawLength !== null) {
    const length = Number(rawLength);
    if (!Number.isSafeInteger(length) || length < 0) {
      return { ok: false, status: 400, error: "Invalid Content-Length header." };
    }
    if (length > options.maxBytes) {
      return { ok: false, status: 413, error: "Request body is too large." };
    }
  }

  if (options.allowedContentTypes?.length) {
    const actual = contentType(request);
    if (!actual || !options.allowedContentTypes.includes(actual)) {
      return {
        ok: false,
        status: 415,
        error: options.contentTypeError ?? "Unsupported request content type.",
      };
    }
  }
  return null;
}

/**
 * Read a request body with both an early Content-Length check and a hard
 * streaming ceiling. The returned bytes are exactly those received, making
 * this suitable for webhook HMAC verification before any decoding/parsing.
 */
export async function readBoundedBytes(
  request: Request,
  options: BodyLimitOptions,
): Promise<BodyReadResult<Uint8Array>> {
  const headerError = validateBodyHeaders(request, options);
  if (headerError) return headerError;

  if (!request.body) return { ok: true, value: new Uint8Array(), bytes: 0 };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > options.maxBytes) {
        await reader.cancel("request body exceeds limit").catch(() => {});
        return { ok: false, status: 413, error: "Request body is too large." };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, error: "Could not read request body." };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, value: bytes, bytes: total };
}

export async function readBoundedText(
  request: Request,
  options: BodyLimitOptions,
): Promise<BodyReadResult<string>> {
  const result = await readBoundedBytes(request, options);
  if (!result.ok) return result;
  try {
    return {
      ok: true,
      value: new TextDecoder("utf-8", { fatal: true }).decode(result.value),
      bytes: result.bytes,
    };
  } catch {
    return { ok: false, status: 400, error: "Request body is not valid UTF-8." };
  }
}

export async function readBoundedJson<T = unknown>(
  request: Request,
  options: Omit<BodyLimitOptions, "allowedContentTypes"> & {
    allowedContentTypes?: readonly string[];
  },
): Promise<BodyReadResult<T>> {
  const result = await readBoundedText(request, {
    ...options,
    allowedContentTypes: options.allowedContentTypes ?? ["application/json"],
    contentTypeError: options.contentTypeError ?? "Expected application/json.",
  });
  if (!result.ok) return result;
  try {
    return { ok: true, value: JSON.parse(result.value) as T, bytes: result.bytes };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON body." };
  }
}
