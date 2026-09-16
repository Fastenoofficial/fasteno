"use client";

import { Trash2 } from "lucide-react";
import { deleteBanner } from "@/components/admin/banner-actions";

export function BannerDeleteButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  return (
    <form
      action={deleteBanner.bind(null, id)}
      onSubmit={(event) => {
        if (!window.confirm(`Delete “${title || "Untitled Banner"}”?`)) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs text-danger transition-colors hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
      >
        <Trash2 aria-hidden size={14} />
        Delete
      </button>
    </form>
  );
}
