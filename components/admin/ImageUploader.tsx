"use client";

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import { isDemoMode } from "@/lib/config";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

/** Drag-and-drop multi-file image uploader for the admin product form.
 *  Uploads to /api/admin/upload (Supabase Storage `product-images` bucket)
 *  and manages an ordered list of image URLs — the first one is primary.
 *  Existing URL/path-based images (e.g. seed /products/*.svg) render in the
 *  same grid, so nothing downstream changes. */

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";
const MAX_BYTES = 5 * 1024 * 1024;

interface UploadingFile {
  id: string;
  name: string;
  /** 0-100, or null before the request starts */
  progress: number | null;
  error?: string;
}

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  /** Product slug — used as the storage folder when set. */
  slug?: string;
}

let uid = 0;

function uploadWithProgress(
  file: File,
  slug: string | undefined,
  onProgress: (percent: number) => void,
): Promise<{ url?: string; error?: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText) as {
          url?: string;
          error?: string;
        };
        if (xhr.status >= 200 && xhr.status < 300 && body.url) {
          resolve({ url: body.url });
        } else {
          resolve({ error: body.error ?? `Upload failed (${xhr.status}).` });
        }
      } catch {
        resolve({ error: `Upload failed (${xhr.status}).` });
      }
    };
    xhr.onerror = () => resolve({ error: "Network error during upload." });
    const form = new FormData();
    form.append("file", file);
    if (slug) form.append("slug", slug);
    xhr.send(form);
  });
}

export function ImageUploader({ images, onChange, slug }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [showUrlField, setShowUrlField] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");

  // Ref mirrors the latest images so parallel upload callbacks don't
  // clobber each other when appending.
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const appendImage = useCallback(
    (url: string) => {
      const next = [...imagesRef.current, url];
      imagesRef.current = next;
      onChange(next);
    },
    [onChange],
  );

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      if (isDemoMode) return;
      const files = Array.from(fileList);
      for (const file of files) {
        const id = `up-${++uid}`;
        if (!ACCEPT.split(",").includes(file.type)) {
          setUploading((u) => [
            ...u,
            {
              id,
              name: file.name,
              progress: null,
              error: "Only JPEG, PNG, WebP or AVIF.",
            },
          ]);
          continue;
        }
        if (file.size > MAX_BYTES) {
          setUploading((u) => [
            ...u,
            { id, name: file.name, progress: null, error: "Over 5 MB." },
          ]);
          continue;
        }
        setUploading((u) => [...u, { id, name: file.name, progress: 0 }]);
        void uploadWithProgress(file, slug, (percent) => {
          setUploading((u) =>
            u.map((f) => (f.id === id ? { ...f, progress: percent } : f)),
          );
        }).then(({ url, error }) => {
          if (url) {
            appendImage(url);
            setUploading((u) => u.filter((f) => f.id !== id));
          } else {
            setUploading((u) =>
              u.map((f) =>
                f.id === id
                  ? { ...f, progress: null, error: error ?? "Upload failed." }
                  : f,
              ),
            );
          }
        });
      }
    },
    [appendImage, slug],
  );

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (isDemoMode) return;
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    e.target.value = ""; // allow re-selecting the same file
  }

  function removeAt(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function addUrl() {
    const url = urlDraft.trim();
    if (!url) return;
    appendImage(url);
    setUrlDraft("");
    setShowUrlField(false);
  }

  return (
    <div className="space-y-4">
      <span className="block text-xs uppercase tracking-widest text-muted">
        Images{" "}
        <span className="normal-case tracking-normal">
          (first image is the primary photo)
        </span>
      </span>

      {/* thumbnail grid */}
      {images.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {images.map((url, i) => (
            <li
              key={`${url}-${i}`}
              className="group relative border border-line bg-surface"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Product image ${i + 1}`}
                loading="lazy"
                className="aspect-[4/5] w-full object-cover"
              />
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 border border-gold/50 bg-ink/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-gold">
                  Primary
                </span>
              )}
              <button
                type="button"
                aria-label={`Remove image ${i + 1}`}
                onClick={() => removeAt(i)}
                className="absolute right-1 top-1 flex h-6 w-6 cursor-pointer items-center justify-center border border-line bg-ink/80 text-muted transition-colors hover:border-danger/60 hover:text-danger"
              >
                <X size={12} />
              </button>
              <div className="absolute bottom-1 right-1 flex gap-1">
                <button
                  type="button"
                  aria-label={`Move image ${i + 1} earlier`}
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="flex h-6 w-6 cursor-pointer items-center justify-center border border-line bg-ink/80 text-muted transition-colors hover:text-gold disabled:pointer-events-none disabled:opacity-35"
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  type="button"
                  aria-label={`Move image ${i + 1} later`}
                  onClick={() => move(i, 1)}
                  disabled={i === images.length - 1}
                  className="flex h-6 w-6 cursor-pointer items-center justify-center border border-line bg-ink/80 text-muted transition-colors hover:text-gold disabled:pointer-events-none disabled:opacity-35"
                >
                  <ArrowDown size={12} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* dropzone */}
      {isDemoMode ? (
        <div className="border border-dashed border-line bg-surface px-4 py-6 text-center text-sm text-muted">
          <ImagePlus size={20} className="mx-auto mb-2 text-muted" />
          Direct upload is disabled in demo mode — image storage needs a
          connected Supabase project. Use “Add by URL” below for existing
          paths.
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center gap-2 border border-dashed px-4 py-8 text-center transition-colors ${
            dragOver
              ? "border-gold/70 bg-surface text-gold"
              : "border-line bg-surface text-muted hover:border-gold/50 hover:text-ivory"
          }`}
        >
          <UploadCloud size={22} />
          <span className="text-sm">
            Drag &amp; drop images here, or click to select
          </span>
          <span className="text-xs text-muted">
            JPEG, PNG, WebP or AVIF · up to 5 MB each
          </span>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      )}

      {/* in-flight / failed uploads */}
      {uploading.length > 0 && (
        <ul className="space-y-2">
          {uploading.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-3 border border-line bg-surface px-3 py-2 text-xs"
            >
              {f.error ? (
                <>
                  <X size={14} className="shrink-0 text-danger" />
                  <span className="min-w-0 flex-1 truncate text-muted">
                    {f.name}
                  </span>
                  <span className="text-danger">{f.error}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setUploading((u) => u.filter((x) => x.id !== f.id))
                    }
                    className="cursor-pointer text-muted transition-colors hover:text-ivory"
                    aria-label="Dismiss"
                  >
                    <X size={12} />
                  </button>
                </>
              ) : (
                <>
                  <Loader2
                    size={14}
                    className="shrink-0 animate-spin text-gold"
                  />
                  <span className="min-w-0 flex-1 truncate text-muted">
                    {f.name}
                  </span>
                  <span className="tabular-nums text-muted">
                    {f.progress === null || f.progress >= 100
                      ? "Processing…"
                      : `${f.progress}%`}
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* add-by-URL fallback */}
      {showUrlField ? (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label="Image URL or path"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addUrl();
                }
              }}
              placeholder="/products/midnight-navy-silk-tie.svg"
            />
          </div>
          <Button type="button" variant="outline" size="md" onClick={addUrl}>
            Add
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => {
              setShowUrlField(false);
              setUrlDraft("");
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowUrlField(true)}
          className="cursor-pointer text-xs uppercase tracking-widest text-gold transition-colors hover:text-gold-light"
        >
          + Add by URL
        </button>
      )}
    </div>
  );
}
