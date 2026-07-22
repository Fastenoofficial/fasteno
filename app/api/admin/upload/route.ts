import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/config";
import { getCurrentUser, getProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

/** Admin product-image upload — POST multipart/form-data with fields
 *  `file` (the image) and optional `slug` (folder hint). Re-verifies the
 *  admin role server-side, validates type + size, uploads to the public
 *  `product-images` Supabase Storage bucket and returns the public URL. */

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const BUCKET = "product-images";

function sanitizeSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "Image upload needs a connected Supabase project (demo mode)." },
      { status: 503 },
    );
  }

  // Never trust the client — re-verify the session AND the admin role.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const profile = await getProfile(user.id);
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP or AVIF images are allowed." },
      { status: 415 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "The file is empty." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Images must be 5 MB or smaller." },
      { status: 413 },
    );
  }

  // Folder = product slug when provided, random otherwise.
  const slugRaw = form.get("slug");
  const folder =
    (typeof slugRaw === "string" && sanitizeSegment(slugRaw)) ||
    crypto.randomUUID().slice(0, 8);

  // Safe file name: sanitized base + extension derived from the MIME type.
  const base =
    sanitizeSegment(file.name.replace(/\.[a-z0-9]+$/i, "")) || "image";
  const path = `${folder}/${Date.now()}-${base}.${ext}`;

  // Prefer the service client (bypasses RLS); fall back to the session
  // client — storage RLS grants admins insert on this bucket anyway.
  const service = createServiceClient();
  const supabase =
    service ??
    (await (await import("@/lib/supabase/server")).createClient());

  const bytes = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) {
    return NextResponse.json(
      { error: `Upload failed: ${error.message}` },
      { status: 500 },
    );
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path });
}
