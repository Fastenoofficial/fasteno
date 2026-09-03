"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { formatINR, titleCase } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { DuplicateProductButton } from "@/components/admin/DuplicateProductButton";
import { BulkActionsBar } from "@/components/admin/BulkActionsBar";

interface AdminProductRow {
  id: string;
  slug: string;
  name: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  featured: boolean;
  active: boolean;
  images: string[] | null;
  categories: { slug: string; name: string } | { slug: string; name: string }[] | null;
}

interface Category {
  id: string;
  name: string;
}

function categoryName(row: AdminProductRow): string {
  if (!row.categories) return "";
  return Array.isArray(row.categories)
    ? (row.categories[0]?.name ?? "")
    : row.categories.name;
}

interface ProductsTableProps {
  products: AdminProductRow[];
  categories: Category[];
}

export function ProductsTable({ products, categories }: ProductsTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p.id));
    }
  };

  const clearSelection = () => setSelectedIds([]);

  return (
    <>
      <div className="overflow-x-auto border border-line bg-card">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-widest text-muted">
              <th className="px-4 py-3 font-medium">
                <input
                  type="checkbox"
                  checked={selectedIds.length === products.length && products.length > 0}
                  onChange={toggleAll}
                  className="h-4 w-4 cursor-pointer accent-gold"
                  title="Select all"
                />
              </th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => (
              <tr
                key={p.id}
                className={`transition-colors hover:bg-surface ${
                  selectedIds.includes(p.id) ? "bg-surface" : ""
                }`}
              >
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(p.id)}
                    onChange={() => toggleSelection(p.id)}
                    className="h-4 w-4 cursor-pointer accent-gold"
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    {p.images?.[0] ? (
                      <img
                        src={p.images[0]}
                        alt=""
                        className="h-10 w-10 rounded border border-line object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded border border-line bg-surface" />
                    )}
                    <div>
                      <Link
                        href={`/product/${p.slug}`}
                        className="font-medium text-ivory hover:text-gold"
                        target="_blank"
                      >
                        {p.name}
                      </Link>
                      {p.featured && (
                        <span className="ml-2 inline-block">
                          <Badge tone="gold">Featured</Badge>
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-muted">{titleCase(categoryName(p))}</td>
                <td className="px-4 py-4">
                  <span className="text-ivory">{formatINR(p.price)}</span>
                  {p.compare_at_price && (
                    <span className="ml-2 text-xs text-muted line-through">
                      {formatINR(p.compare_at_price)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={p.stock <= 5 ? "text-danger" : "text-muted"}
                  >
                    {p.stock}
                  </span>
                </td>
                <td className="px-4 py-4">
                  {p.active ? (
                    <Badge tone="success">
                      Active
                    </Badge>
                  ) : (
                    <Badge tone="muted">
                      Inactive
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-muted transition-colors hover:text-ivory"
                    >
                      <Pencil size={12} />
                      Edit
                    </Link>
                    <DuplicateProductButton productId={p.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <BulkActionsBar
        selectedIds={selectedIds}
        onClearSelection={clearSelection}
        categories={categories}
      />
    </>
  );
}
