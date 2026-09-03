"use client";

import { useState } from "react";
import { Trash2, Check, X, Star, Grid } from "lucide-react";
import {
  bulkDeleteProducts,
  bulkActivateProducts,
  bulkDeactivateProducts,
  bulkFeatureProducts,
  bulkUnfeatureProducts,
  bulkChangeCategoryProducts,
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

  async function handleDelete() {
    if (!confirm(`Delete ${selectedIds.length} products? This cannot be undone.`)) {
      return;
    }
    await handleAction(() => bulkDeleteProducts(selectedIds));
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform">
      <div className="flex items-center gap-3 rounded-lg border border-gold-light bg-card px-6 py-4 shadow-2xl">
        <span className="text-sm font-medium text-ivory">
          {selectedIds.length} selected
        </span>

        <div className="h-6 w-px bg-line" />

        <button
          onClick={() => handleAction(() => bulkActivateProducts(selectedIds))}
          disabled={isProcessing}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs text-success transition-colors hover:text-success-light disabled:opacity-50"
          title="Activate selected products"
        >
          <Check size={14} />
          Activate
        </button>

        <button
          onClick={() => handleAction(() => bulkDeactivateProducts(selectedIds))}
          disabled={isProcessing}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs text-muted transition-colors hover:text-ivory disabled:opacity-50"
          title="Deactivate selected products"
        >
          <X size={14} />
          Deactivate
        </button>

        <button
          onClick={() => handleAction(() => bulkFeatureProducts(selectedIds))}
          disabled={isProcessing}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs text-gold transition-colors hover:text-gold-light disabled:opacity-50"
          title="Mark as featured"
        >
          <Star size={14} />
          Feature
        </button>

        <button
          onClick={() => handleAction(() => bulkUnfeatureProducts(selectedIds))}
          disabled={isProcessing}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs text-muted transition-colors hover:text-ivory disabled:opacity-50"
          title="Remove featured status"
        >
          <Star size={14} fill="currentColor" />
          Unfeature
        </button>

        <div className="relative">
          <button
            onClick={() => setShowCategoryMenu(!showCategoryMenu)}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs text-muted transition-colors hover:text-ivory disabled:opacity-50"
            title="Change category"
          >
            <Grid size={14} />
            Category
          </button>

          {showCategoryMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowCategoryMenu(false)}
              />
              <div className="absolute bottom-full left-0 mb-2 w-48 rounded border border-line bg-card shadow-xl z-50">
                <div className="max-h-64 overflow-y-auto p-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setShowCategoryMenu(false);
                        handleAction(() =>
                          bulkChangeCategoryProducts(selectedIds, cat.id)
                        );
                      }}
                      className="block w-full rounded px-3 py-2 text-left text-xs text-ivory transition-colors hover:bg-surface"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="h-6 w-px bg-line" />

        <button
          onClick={handleDelete}
          disabled={isProcessing}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs text-danger transition-colors hover:text-danger-light disabled:opacity-50"
          title="Delete selected products"
        >
          <Trash2 size={14} />
          Delete
        </button>

        <button
          onClick={onClearSelection}
          className="ml-2 rounded p-1 text-muted transition-colors hover:bg-surface hover:text-ivory"
          title="Clear selection"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
