"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { formatINR, titleCase } from "@/lib/format";
import {
  hasActiveFilters,
  listingHref,
  type ListingParams,
  type ListingSort,
} from "@/components/catalog/query";

/** Client island: filter + sort controls that push URL searchParams so every
 *  listing state stays shareable. The server re-renders the grid on change. */

interface PriceBand {
  value: string;
  label: string;
  min?: number; // rupees
  max?: number; // rupees
}

const PRICE_BANDS: PriceBand[] = [
  { value: "u1000", label: "Under ₹1,000", max: 999 },
  { value: "1000-1999", label: "₹1,000 – ₹1,999", min: 1000, max: 1999 },
  { value: "2000-2999", label: "₹2,000 – ₹2,999", min: 2000, max: 2999 },
  { value: "3000up", label: "₹3,000 & above", min: 3000 },
];

const OCCASIONS = ["wedding", "office", "festive", "gift", "evening", "interview"];

const SORT_OPTIONS: { value: ListingSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

interface FilterBarProps {
  basePath: string;
  options: {
    colors: string[];
    materials: string[];
    patterns: string[];
    maxPrice: number;
  };
  params: ListingParams;
}

export function FilterBar({ basePath, options, params }: FilterBarProps) {
  const router = useRouter();

  const apply = (patch: Partial<ListingParams>) => {
    router.push(listingHref(basePath, { ...params, ...patch }), {
      scroll: false,
    });
  };

  const priceLabel =
    PRICE_BANDS.find((b) => b.min === params.min && b.max === params.max)
      ?.label ??
    [
      params.min !== undefined ? `From ${formatINR(params.min * 100)}` : null,
      params.max !== undefined ? `Up to ${formatINR(params.max * 100)}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

  const bandValue =
    PRICE_BANDS.find((b) => b.min === params.min && b.max === params.max)
      ?.value ?? "";

  // Removable chips for every active filter
  const chips: { key: string; label: string; patch: Partial<ListingParams> }[] =
    [];
  if (params.color)
    chips.push({
      key: "color",
      label: titleCase(params.color),
      patch: { color: undefined },
    });
  if (params.material)
    chips.push({
      key: "material",
      label: titleCase(params.material),
      patch: { material: undefined },
    });
  if (params.pattern)
    chips.push({
      key: "pattern",
      label: titleCase(params.pattern),
      patch: { pattern: undefined },
    });
  if (params.min !== undefined || params.max !== undefined)
    chips.push({
      key: "price",
      label: priceLabel,
      patch: { min: undefined, max: undefined },
    });
  if (params.tag)
    chips.push({
      key: "tag",
      label: titleCase(params.tag),
      patch: { tag: undefined },
    });

  const toOptions = (values: string[], anyLabel: string) => [
    { value: "", label: anyLabel },
    ...values.map((v) => ({ value: v, label: titleCase(v) })),
  ];

  return (
    <div className="border border-line bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Select
          label="Colour"
          options={toOptions(options.colors, "All colours")}
          value={params.color ?? ""}
          onChange={(e) => apply({ color: e.target.value || undefined })}
        />
        <Select
          label="Material"
          options={toOptions(options.materials, "All materials")}
          value={params.material ?? ""}
          onChange={(e) => apply({ material: e.target.value || undefined })}
        />
        <Select
          label="Pattern"
          options={toOptions(options.patterns, "All patterns")}
          value={params.pattern ?? ""}
          onChange={(e) => apply({ pattern: e.target.value || undefined })}
        />
        <Select
          label="Price"
          options={[
            { value: "", label: "Any price" },
            ...PRICE_BANDS.map((b) => ({ value: b.value, label: b.label })),
          ]}
          value={bandValue}
          onChange={(e) => {
            const band = PRICE_BANDS.find((b) => b.value === e.target.value);
            apply({ min: band?.min, max: band?.max });
          }}
        />
        <Select
          label="Occasion"
          options={toOptions(OCCASIONS, "All occasions")}
          value={params.tag && OCCASIONS.includes(params.tag) ? params.tag : ""}
          onChange={(e) => apply({ tag: e.target.value || undefined })}
        />
        <Select
          label="Sort by"
          options={SORT_OPTIONS}
          value={params.sort}
          onChange={(e) => apply({ sort: e.target.value as ListingSort })}
        />
      </div>

      {hasActiveFilters(params) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          {chips.map((chip) => (
            <Link
              key={chip.key}
              href={listingHref(basePath, { ...params, ...chip.patch })}
              scroll={false}
              className="inline-flex items-center gap-1.5 border border-gold/60 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-gold transition-colors hover:border-block hover:bg-block hover:text-block-text"
            >
              {chip.label}
              <X size={11} />
            </Link>
          ))}
          <Link
            href={listingHref(basePath, { sort: params.sort })}
            scroll={false}
            className="ml-1 text-[11px] uppercase tracking-[0.14em] text-muted underline-offset-4 transition-colors hover:text-gold hover:underline"
          >
            Clear all
          </Link>
        </div>
      )}
    </div>
  );
}
