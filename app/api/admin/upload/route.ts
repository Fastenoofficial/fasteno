import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/config";
import { getCurrentUser, getProfile } from "@/lib/auth";
import { detectImageType } from "@/lib/image-security";
import { readBoundedBytes } from "@/lib/request-body";
import {
  clientIp,
  rateLimit,
  rateLimitKey,
  RATE_LIMIT_MESSAGE,
  RATE_LIMIT_UNAVAILABLE_MESSAGE,
} from "@/lib/rate-limit";
import { requireServiceClient } from "@/lib/supabase/service";

/** Admin product-image upload — POST multipart/form-data with fields
 *  `file` (the image) and optional `slug` (folder hint). Re-verifies the
 *  admin role server-side, validates type + size, uploads to the public
 *  `product-images` Supabase Storage bucket and returns the public URL. */

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_MULTIPART_BYTES = MAX_BYTES + 64 * 1024;
const BUCKET = "product-images";

function sanitizeSegment(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function multipartError(status: 400 | 413 | 415, error: string) {
  return NextResponse.json(
    {
      error:
        status === 413 ? "Images must be 5 MB or smaller." : error,
    },
    { status },
  );
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "Image upload needs a connected Supabase project (demo mode)." },
      { status: 503 },
    );
  }

  // Never trust the client — verify the session AND the admin role before
  // accepting or parsing a potentially expensive multipart body.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const profile = await getProfile(user.id);
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const limited = await rateLimit(
    rateLimitKey("admin-upload", user.id, clientIp(request)),
    { limit: 30, windowMs: 10 * 60_000, mode: "strict" },
  );
  if (!limited.ok) {
    if (limited.outcome === "unavailable") {
      return NextResponse.json(
        { error: RATE_LIMIT_UNAVAILABLE_MESSAGE },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: RATE_LIMIT_MESSAGE },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000)),
        },
      },
    );
  }

  let supabase: ReturnType<typeof requireServiceClient>;
  try {
    supabase = requireServiceClient();
  } catch (error) {
    console.error(
      "admin upload: service client unavailable —",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: "Image upload is temporarily unavailable." },
      { status: 503 },
    );
  }

  const body = await readBoundedBytes(request, {
    maxBytes: MAX_MULTIPART_BYTES,
    allowedContentTypes: ["multipart/form-data"],
    contentTypeError: "Expected multipart/form-data.",
  });
  if (!body.ok) return multipartError(body.status, body.error);

  let form: FormData;
  try {
    const multipartType = request.headers.get("content-type") ?? "";
    const multipartBuffer = new ArrayBuffer(body.value.byteLength);
    new Uint8Array(multipartBuffer).set(body.value);
    form = await new Response(multipartBuffer, {
      headers: { "Content-Type": multipartType },
    }).formData();
  } catch {
    return multipartError(400, "Expected valid multipart/form-data.");
  }

  const allFiles = Array.from(form.values()).filter(
    (value): value is File => value instanceof File,
  );
  const fileFields = form.getAll("file");
  if (fileFields.length === 0 || !(fileFields[0] instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (allFiles.length !== 1 || fileFields.length !== 1) {
    return NextResponse.json(
      { error: "Upload exactly one image at a time." },
      { status: 400 },
    );
  }
  const file = fileFields[0];

  if (file.size === 0) {
    return NextResponse.json({ error: "The file is empty." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Images must be 5 MB or smaller." },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectImageType(bytes);
  if (!detected) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP or AVIF images are allowed." },
      { status: 415 },
    );
  }
  if (file.type.toLowerCase() !== detected.contentType) {
    return NextResponse.json(
      { error: "The file content does not match its declared image type." },
      { status: 415 },
    );
  }

  // The optional product slug is a folder hint only; all path segments and
  // the original basename are reduced to a single safe storage segment.
  const slugRaw = form.get("slug");
  const folder =
    (typeof slugRaw === "string" && sanitizeSegment(slugRaw)) ||
    crypto.randomUUID().slice(0, 8);
  const base =
    sanitizeSegment(file.name.replace(/\.[a-z0-9]+$/i, "")) || "image";
  const path = `${folder}/${Date.now()}-${base}.${detected.extension}`;

  // Recheck immediately before the privileged storage write so a changed or
  // expired session cannot rely on the earlier authorization decision.
  const recheckedUser = await getCurrentUser();
  if (!recheckedUser || recheckedUser.id !== user.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const recheckedProfile = await getProfile(recheckedUser.id);
  if (!recheckedProfile || recheckedProfile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: detected.contentType,
    upsert: false,
  });
  if (error) {
    console.error("admin upload: storage upload failed —", error.message);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 },
    );
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path });
}
