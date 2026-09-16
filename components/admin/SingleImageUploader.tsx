"use client";

import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { ImagePlus, Loader2, UploadCloud, X } from "lucide-react";
import { isDemoMode } from "@/lib/config";
import {
  ADMIN_IMAGE_ACCEPT,
  ADMIN_IMAGE_MAX_BYTES,
  uploadAdminImageWithProgress,
} from "@/components/admin/ImageUploader";

interface SingleImageUploaderProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  helpText?: string;
  slug?: string;
  onUploadingChange?: (uploading: boolean) => void;
}

export function SingleImageUploader({
  name,
  label,
  value,
  onChange,
  required = false,
  helpText,
  slug = "banners",
  onUploadingChange,
}: SingleImageUploaderProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const helpId = `${name}-help`;
  const errorId = `${name}-error`;

  function setUploadState(next: boolean) {
    setUploading(next);
    onUploadingChange?.(next);
  }

  async function upload(file: File) {
    setError("");
    if (!ADMIN_IMAGE_ACCEPT.split(",").includes(file.type)) {
      setError("Only JPEG, PNG, WebP or AVIF images are allowed.");
      return;
    }
    if (file.size > ADMIN_IMAGE_MAX_BYTES) {
      setError("Images must be 5 MB or smaller.");
      return;
    }

    setProgress(0);
    setUploadState(true);
    try {
      const result = await uploadAdminImageWithProgress(file, slug, setProgress);
      if (result.url) {
        onChange(result.url);
        setProgress(100);
      } else {
        setError(result.error ?? "Upload failed. Please try again.");
        setProgress(0);
      }
    } catch {
      setError("Upload failed. Please try again.");
      setProgress(0);
    } finally {
      setUploadState(false);
    }
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void upload(file);
  }

  function addUrl() {
    const next = urlDraft.normalize("NFKC").trim();
    if (!next) {
      setError("Enter an image URL or local image path.");
      return;
    }
    onChange(next);
    setUrlDraft("");
    setShowUrlInput(false);
    setError("");
  }

  function handleUrlKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addUrl();
    }
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
        {label} {required && <span className="text-danger">*</span>}
      </legend>
      <input type="hidden" name={name} value={value} />

      {value ? (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:items-center">
          <img
            src={value}
            alt={`${label} preview`}
            className="aspect-[16/9] w-full rounded-lg border border-line object-cover sm:w-48"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted" title={value}>
              {value}
            </p>
            <button
              type="button"
              onClick={() => {
                onChange("");
                setError("");
              }}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-danger/40 px-4 text-xs font-medium text-danger transition-colors hover:bg-danger hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
            >
              <X aria-hidden size={14} />
              Remove image
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-line bg-surface px-4 py-6 text-center text-sm text-muted">
          <ImagePlus aria-hidden size={22} className="mx-auto mb-2" />
          No image selected
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isDemoMode || uploading}
          onClick={() => fileInput.current?.click()}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-card px-4 text-xs font-medium uppercase tracking-[0.05em] text-ivory transition-colors hover:border-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light disabled:cursor-not-allowed disabled:opacity-45"
        >
          {uploading ? (
            <Loader2 aria-hidden size={15} className="animate-spin motion-reduce:animate-none" />
          ) : (
            <UploadCloud aria-hidden size={15} />
          )}
          {uploading ? `Uploading ${progress}%` : "Upload image"}
        </button>
        <button
          type="button"
          onClick={() => setShowUrlInput((shown) => !shown)}
          className="inline-flex min-h-11 items-center rounded-full border border-line bg-card px-4 text-xs font-medium uppercase tracking-[0.05em] text-ivory transition-colors hover:border-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
          aria-expanded={showUrlInput}
          aria-controls={`${name}-url-controls`}
        >
          Add by URL
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={ADMIN_IMAGE_ACCEPT}
          onChange={handleFile}
          className="sr-only"
          tabIndex={-1}
          aria-describedby={`${helpId}${error ? ` ${errorId}` : ""}`}
        />
      </div>

      {uploading && (
        <div
          role="progressbar"
          aria-label={`Uploading ${label}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="h-2 overflow-hidden rounded-full bg-line"
        >
          <div
            className="h-full bg-gold-light transition-[width] motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {showUrlInput && (
        <div id={`${name}-url-controls`} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={urlDraft}
            onChange={(event) => setUrlDraft(event.target.value)}
            onKeyDown={handleUrlKeyDown}
            maxLength={2_048}
            placeholder="/products/image.svg or approved https://..."
            aria-label={`${label} URL`}
            className="min-h-11 flex-1 rounded-xl border border-line bg-card px-4 text-sm text-ivory placeholder:text-muted-soft focus:border-gold-light focus:outline-none focus:ring-2 focus:ring-gold-light/20"
          />
          <button
            type="button"
            onClick={addUrl}
            className="min-h-11 rounded-full border border-gold-light px-5 text-xs font-medium uppercase tracking-[0.05em] text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
          >
            Use URL
          </button>
        </div>
      )}

      <p id={helpId} className="text-xs text-muted">
        {isDemoMode
          ? "Direct upload is disabled in demo mode; add an existing safe path or URL."
          : helpText ?? "JPEG, PNG, WebP or AVIF, up to 5 MB; safe existing paths can be added by URL."}
      </p>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
