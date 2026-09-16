"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { trackStorefrontEvent } from "@/lib/analytics-client";
import { formatINR, titleCase } from "@/lib/format";
import {
  hasActiveFilters,
  listingHref,
  type ListingParams,
  type ListingSort,
} from "@/components/catalog/query";

/** Client island: filter + sort controls that push URL searchParams so every
 * listing state stays shareable. Analytics receives filter names/counts only,
 * never selected values or URL parameters. */

interface PriceBand {
  value: string;
  label: string;
  min?: number; // rupees
  max?: number; // rupees
}

type TrackedFilter =
  | "all"
  | "colour"
  | "material"
  | "pattern"
  | "price"
  | "occasion"
  | "sort";
type TrackedAction = "apply" | "remove" | "clear" | "sort";

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

function activeFilterCount(params: ListingParams): number {
  return (
    Number(Boolean(params.color)) +
    Number(Boolean(params.material)) +
    Number(Boolean(params.pattern)) +
    Number(Boolean(params.tag)) +
    Number(params.min !== undefined || params.max !== undefined)
  );
}

export function FilterBar({ basePath, options, params }: FilterBarProps) {
  const router = useRouter();

  const apply = (
    patch: Partial<ListingParams>,
    filter: TrackedFilter,
    action: TrackedAction,
  ) => {
    const next = { ...params, ...patch };
    trackStorefrontEvent({
      type: "filter",
      filter,
      action,
      activeCount: activeFilterCount(next),
    });
    router.push(listingHref(basePath, next), { scroll: false });
  };

  const priceLabel =
    PRICE_BANDS.find((band) => band.min === params.min && band.max === params.max)
      ?.label ??
    [
      params.min !== undefined ? `From ${formatINR(params.min * 100)}` : null,
      params.max !== undefined ? `Up to ${formatINR(params.max * 100)}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

  const bandValue =
    PRICE_BANDS.find((band) => band.min === params.min && band.max === params.max)
      ?.value ?? "";

  const chips: {
    key: string;
    label: string;
    filter: Exclude<TrackedFilter, "all" | "sort">;
    patch: Partial<ListingParams>;
  }[] = [];
  if (params.color) {
    chips.push({
      key: "color",
      label: titleCase(params.color),
      filter: "colour",
      patch: { color: undefined },
    });
  }
  if (params.material) {
    chips.push({
      key: "material",
      label: titleCase(params.material),
      filter: "material",
      patch: { material: undefined },
    });
  }
  if (params.pattern) {
    chips.push({
      key: "pattern",
      label: titleCase(params.pattern),
      filter: "pattern",
      patch: { pattern: undefined },
    });
  }
  if (params.min !== undefined || params.max !== undefined) {
    chips.push({
      key: "price",
      label: priceLabel,
      filter: "price",
      patch: { min: undefined, max: undefined },
    });
  }
  if (params.tag) {
    chips.push({
      key: "tag",
      label: titleCase(params.tag),
      filter: "occasion",
      patch: { tag: undefined },
    });
  }

  const toOptions = (values: string[], anyLabel: string) => [
    { value: "", label: anyLabel },
    ...values.map((value) => ({ value, label: titleCase(value) })),
  ];

  return (
    <div className="rounded-2xl border border-line-soft bg-card p-4 shadow-[var(--shadow-card)] sm:p-5 lg:sticky lg:top-24">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-1 lg:gap-4">
        <Select
          label="Colour"
          options={toOptions(options.colors, "All colours")}
          value={params.color ?? ""}
          onChange={(event) =>
            apply(
              { color: event.target.value || undefined },
              "colour",
              event.target.value ? "apply" : "remove",
            )
          }
        />
        <Select
          label="Material"
          options={toOptions(options.materials, "All materials")}
          value={params.material ?? ""}
          onChange={(event) =>
            apply(
              { material: event.target.value || undefined },
              "material",
              event.target.value ? "apply" : "remove",
            )
          }
        />
        <Select
          label="Pattern"
          options={toOptions(options.patterns, "All patterns")}
          value={params.pattern ?? ""}
          onChange={(event) =>
            apply(
              { pattern: event.target.value || undefined },
              "pattern",
              event.target.value ? "apply" : "remove",
            )
          }
        />
        <Select
          label="Price"
          options={[
            { value: "", label: "Any price" },
            ...PRICE_BANDS.map((band) => ({ value: band.value, label: band.label })),
          ]}
          value={bandValue}
          onChange={(event) => {
            const band = PRICE_BANDS.find(
              (candidate) => candidate.value === event.target.value,
            );
            apply(
              { min: band?.min, max: band?.max },
              "price",
              band ? "apply" : "remove",
            );
          }}
        />
        <Select
          label="Occasion"
          options={toOptions(OCCASIONS, "All occasions")}
          value={params.tag && OCCASIONS.includes(params.tag) ? params.tag : ""}
          onChange={(event) =>
            apply(
              { tag: event.target.value || undefined },
              "occasion",
              event.target.value ? "apply" : "remove",
            )
          }
        />
        <Select
          label="Sort by"
          options={SORT_OPTIONS}
          value={params.sort}
          onChange={(event) =>
            apply({ sort: event.target.value as ListingSort }, "sort", "sort")
          }
        />
      </div>

      {hasActiveFilters(params) && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
          {chips.map((chip) => {
            const next = { ...params, ...chip.patch };
            return (
              <Link
                key={chip.key}
                href={listingHref(basePath, next)}
                scroll={false}
                onClick={() =>
                  trackStorefrontEvent({
                    type: "filter",
                    filter: chip.filter,
                    action: "remove",
                    activeCount: activeFilterCount(next),
                  })
                }
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-gold-light/60 bg-gold-light/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-gold transition-colors hover:border-action hover:bg-action hover:text-white"
              >
                {chip.label}
                <X size={11} aria-hidden />
              </Link>
            );
          })}
          <Link
            href={listingHref(basePath, { sort: params.sort })}
            scroll={false}
            onClick={() =>
              trackStorefrontEvent({
                type: "filter",
                filter: "all",
                action: "clear",
                activeCount: 0,
              })
            }
            className="ml-1 rounded-full px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-muted underline-offset-4 transition-colors hover:text-gold hover:underline"
          >
            Clear all
          </Link>
        </div>
      )}
    </div>
  );
}
