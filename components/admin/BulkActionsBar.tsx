"use client";

import { useState } from "react";
import { Archive, Check, Grid, Star, X } from "lucide-react";
import {
  bulkActivateProducts,
  bulkArchiveProducts,
  bulkChangeCategoryProducts,
  bulkDeactivateProducts,
  bulkFeatureProducts,
  bulkUnfeatureProducts,
} from "@/components/admin/bulk-actions";

interface BulkActionsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  categories: Array<{ id: string; name: string }>;
}

export function BulkActionsBar({
  selectedIds,
  onClearSelection,
  categories,
}: BulkActionsBarProps) {
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (selectedIds.length === 0) return null;

  async function handleAction(action: () => Promise<void>) {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await action();
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleArchive() {
    if (
      !confirm(
        `Archive ${selectedIds.length} products? They will be hidden from the storefront and can be activated again later.`,
      )
    ) {
      return;
    }
    await handleAction(() => bulkArchiveProducts(selectedIds));
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-50 max-w-[calc(100vw-2rem)] -translate-x-1/2 transform">
      <div className="flex items-center gap-3 overflow-x-auto rounded-lg border border-gold-light bg-card px-6 py-4 shadow-2xl">
        <span className="shrink-0 text-sm font-medium text-ivory">
          {selectedIds.length} selected
        </span>

        <div className="h-6 w-px shrink-0 bg-line" />

        <button
          onClick={() => handleAction(() => bulkActivateProducts(selectedIds))}
          disabled={isProcessing}
          className="inline-flex shrink-0 items-center gap-2 px-3 py-1.5 text-xs text-success transition-colors hover:text-success-light disabled:opacity-50"
          title="Activate selected products"
        >
          <Check size={14} />
          Activate
        </button>

        <button
          onClick={() => handleAction(() => bulkDeactivateProducts(selectedIds))}
          disabled={isProcessing}
          className="inline-flex shrink-0 items-center gap-2 px-3 py-1.5 text-xs text-muted transition-colors hover:text-ivory disabled:opacity-50"
          title="Deactivate selected products"
        >
          <X size={14} />
          Deactivate
        </button>

        <button
          onClick={() => handleAction(() => bulkFeatureProducts(selectedIds))}
          disabled={isProcessing}
          className="inline-flex shrink-0 items-center gap-2 px-3 py-1.5 text-xs text-gold transition-colors hover:text-gold-light disabled:opacity-50"
          title="Mark as featured"
        >
          <Star size={14} />
          Feature
        </button>

        <button
          onClick={() => handleAction(() => bulkUnfeatureProducts(selectedIds))}
          disabled={isProcessing}
          className="inline-flex shrink-0 items-center gap-2 px-3 py-1.5 text-xs text-muted transition-colors hover:text-ivory disabled:opacity-50"
          title="Remove featured status"
        >
          <Star size={14} fill="currentColor" />
          Unfeature
        </button>

        <div className="relative shrink-0">
          <button
            onClick={() => setShowCategoryMenu(!showCategoryMenu)}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs text-muted transition-colors hover:text-ivory disabled:opacity-50"
            title="Change category"
            aria-expanded={showCategoryMenu}
          >
            <Grid size={14} />
            Category
          </button>

          {showCategoryMenu && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setShowCategoryMenu(false)}
                aria-label="Close category menu"
              />
              <div className="absolute bottom-full left-0 z-50 mb-2 w-48 rounded border border-line bg-card shadow-xl">
                <div className="max-h-64 overflow-y-auto p-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setShowCategoryMenu(false);
                        handleAction(() =>
                          bulkChangeCategoryProducts(selectedIds, category.id),
                        );
                      }}
                      className="block w-full rounded px-3 py-2 text-left text-xs text-ivory transition-colors hover:bg-surface"
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="h-6 w-px shrink-0 bg-line" />

        <button
          onClick={handleArchive}
          disabled={isProcessing}
          className="inline-flex shrink-0 items-center gap-2 px-3 py-1.5 text-xs text-danger transition-colors hover:text-danger-light disabled:opacity-50"
          title="Archive selected products"
        >
          <Archive size={14} />
          Archive
        </button>

        <button
          onClick={onClearSelection}
          className="ml-2 shrink-0 rounded p-1 text-muted transition-colors hover:bg-surface hover:text-ivory"
          title="Clear selection"
          aria-label="Clear product selection"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
