"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy } from "lucide-react";
import { duplicateProduct } from "@/components/admin/actions";

/** Per-row "Duplicate" action on the admin products table. On success the
 *  new archived "(Copy)" product opens straight in the editor. */
export function DuplicateProductButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await duplicateProduct(productId);
      if (result.error || !result.id) {
        setError(result.error ?? "Could not duplicate the product.");
        return;
      }
      router.push(`/admin/products/${result.id}`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        title="Duplicate this product (the copy starts archived)"
        className="inline-flex cursor-pointer items-center gap-1.5 border border-line px-3 py-1.5 text-xs uppercase tracking-[0.05em] text-muted transition-colors hover:bg-surface hover:text-ivory disabled:pointer-events-none disabled:opacity-45"
      >
        <Copy size={12} />
        {pending ? "Copying…" : "Duplicate"}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
