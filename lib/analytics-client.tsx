"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { CartItem, OrderItem, PaymentMethod, Product } from "@/lib/types";

export type StorefrontListContext =
  | "home_featured"
  | "shop_all"
  | "shop_category"
  | "search_results"
  | "search_suggestions"
  | "related_products"
  | "recently_viewed"
  | "wishlist";

type SearchSource = "autocomplete" | "search_page" | "recent" | "popular";
type FilterName = "all" | "colour" | "material" | "pattern" | "price" | "occasion" | "sort";
type FilterAction = "apply" | "remove" | "clear" | "sort";
type CheckoutStage = "submitted" | "payment_opened" | "payment_verified" | "order_confirmed";

type Merchandise = Pick<Product, "id" | "name" | "price"> & {
  category?: string | null;
};

type CartLine = Pick<CartItem, "price" | "quantity">;

type PurchaseLine = Pick<OrderItem, "productId" | "name" | "price" | "quantity">;

export type StorefrontAnalyticsEvent =
  | { type: "view_item_list"; list: StorefrontListContext; products: readonly Merchandise[] }
  | { type: "select_item"; list: StorefrontListContext; product: Merchandise; index: number }
  | { type: "view_item"; product: Merchandise }
  | { type: "add_to_cart"; product: Merchandise; quantity: number }
  | { type: "remove_from_cart"; item: CartLine }
  | {
      type: "change_cart_quantity";
      item: CartLine;
      previousQuantity: number;
      nextQuantity: number;
    }
  | { type: "view_cart"; items: readonly CartLine[]; value: number }
  | { type: "begin_checkout"; items: readonly CartLine[]; value: number }
  | { type: "payment_method"; method: PaymentMethod }
  | { type: "checkout_stage"; stage: CheckoutStage; method: PaymentMethod }
  | {
      type: "purchase";
      transactionId: string;
      value: number;
      items: readonly PurchaseLine[];
    }
  | {
      type: "search";
      source: SearchSource;
      queryLength: number;
      resultCount?: number;
    }
  | {
      type: "filter";
      filter: FilterName;
      action: FilterAction;
      activeCount: number;
    };

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __fastenoGaId?: string;
    __fastenoGaConfigured?: boolean;
  }
}

const LIST_NAMES: Record<StorefrontListContext, string> = {
  home_featured: "Home featured pieces",
  shop_all: "Shop all",
  shop_category: "Category collection",
  search_results: "Search results",
  search_suggestions: "Search suggestions",
  related_products: "Related products",
  recently_viewed: "Recently viewed",
  wishlist: "Wishlist",
};

const IDENTIFIER_RE = /^[a-zA-Z0-9_-]{1,128}$/;
const MAX_ITEMS = 24;

function cleanIdentifier(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.normalize("NFKC").trim();
  return IDENTIFIER_RE.test(normalized) ? normalized : null;
}

function cleanCatalogText(value: unknown, maxLength = 120): string | null {
  if (typeof value !== "string") return null;
  const normalized = value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
  if (!normalized) return null;
  return Array.from(normalized).slice(0, maxLength).join("");
}

function moneyInRupees(paise: unknown): number | null {
  if (typeof paise !== "number" || !Number.isSafeInteger(paise) || paise < 0) {
    return null;
  }
  return paise / 100;
}

function safeQuantity(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const quantity = Math.trunc(value);
  return quantity > 0 && quantity <= 10 ? quantity : null;
}

function productItem(
  product: Merchandise,
  options: {
    list?: StorefrontListContext;
    index?: number;
    quantity?: number;
  } = {},
) {
  const itemId = cleanIdentifier(product.id);
  const itemName = cleanCatalogText(product.name);
  const price = moneyInRupees(product.price);
  if (!itemId || !itemName || price === null) return null;

  const item: Record<string, string | number> = {
    item_id: itemId,
    item_name: itemName,
    price,
  };
  const category = cleanCatalogText(product.category, 80);
  if (category) item.item_category = category;
  if (options.list) {
    item.item_list_id = options.list;
    item.item_list_name = LIST_NAMES[options.list];
  }
  if (typeof options.index === "number" && Number.isFinite(options.index)) {
    item.index = Math.max(0, Math.trunc(options.index));
  }
  const quantity = safeQuantity(options.quantity);
  if (quantity !== null) item.quantity = quantity;
  return item;
}

function purchaseItem(item: PurchaseLine) {
  return productItem(
    { id: item.productId, name: item.name, price: item.price },
    { quantity: item.quantity },
  );
}

function emit(name: string, parameters: Record<string, unknown>): boolean {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return false;
  }
  const safePath = analyticsPath(window.location.pathname);
  if (!safePath) return false;

  const safeMetadata = {
    page_location: `${window.location.origin}${safePath}`,
    page_path: safePath,
    page_referrer: "",
    page_title: safePath,
  };
  if (!window.__fastenoGaConfigured) {
    const measurementId = window.__fastenoGaId;
    if (!measurementId || !/^G-[A-Z0-9]{6,20}$/.test(measurementId)) {
      return false;
    }
    window.gtag("config", measurementId, {
      anonymize_ip: true,
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      ...safeMetadata,
    });
    window.__fastenoGaConfigured = true;
  }

  // Override GA's automatic document metadata on every explicit event.
  const safeParameters = Object.assign({}, parameters, safeMetadata);
  window.gtag("event", name, safeParameters);
  return true;
}

function queryLengthBucket(length: number): "0-1" | "2-3" | "4-7" | "8-15" | "16-30" | "31+" {
  if (length < 2) return "0-1";
  if (length < 4) return "2-3";
  if (length < 8) return "4-7";
  if (length < 16) return "8-15";
  if (length < 31) return "16-30";
  return "31+";
}

/**
 * The only public event API. Every payload is built from an allowlisted event
 * shape; callers cannot spread form state, query text, URLs, errors, tokens,
 * coupons, payment identifiers, or order objects into analytics.
 */
export function trackStorefrontEvent(event: StorefrontAnalyticsEvent): void {
  switch (event.type) {
    case "view_item_list": {
      const items = event.products
        .slice(0, MAX_ITEMS)
        .map((product, index) => productItem(product, { list: event.list, index }))
        .filter((item): item is NonNullable<typeof item> => item !== null);
      if (items.length > 0) {
        emit("view_item_list", {
          item_list_id: event.list,
          item_list_name: LIST_NAMES[event.list],
          items,
        });
      }
      return;
    }
    case "select_item": {
      const item = productItem(event.product, {
        list: event.list,
        index: event.index,
      });
      if (item) {
        emit("select_item", {
          item_list_id: event.list,
          item_list_name: LIST_NAMES[event.list],
          items: [item],
        });
      }
      return;
    }
    case "view_item": {
      const item = productItem(event.product);
      if (item) emit("view_item", { currency: "INR", value: item.price, items: [item] });
      return;
    }
    case "add_to_cart": {
      const quantity = safeQuantity(event.quantity);
      const item = productItem(event.product, { quantity: event.quantity });
      const price = moneyInRupees(event.product.price);
      if (item && quantity !== null && price !== null) {
        emit("add_to_cart", {
          currency: "INR",
          value: price * quantity,
          items: [item],
        });
      }
      return;
    }
    case "remove_from_cart": {
      const price = moneyInRupees(event.item.price);
      const quantity = safeQuantity(event.item.quantity);
      if (price !== null && quantity !== null) {
        emit("remove_from_cart", {
          currency: "INR",
          value: price * quantity,
          quantity,
        });
      }
      return;
    }
    case "change_cart_quantity": {
      const price = moneyInRupees(event.item.price);
      const previous = safeQuantity(event.previousQuantity);
      const next = safeQuantity(event.nextQuantity);
      if (
        price !== null &&
        previous !== null &&
        next !== null &&
        previous !== next
      ) {
        emit("cart_quantity_changed", {
          currency: "INR",
          value: price * next,
          previous_quantity: previous,
          new_quantity: next,
        });
      }
      return;
    }
    case "view_cart":
    case "begin_checkout": {
      const value = moneyInRupees(event.value);
      const itemCount = event.items.reduce((total, item) => {
        const quantity = safeQuantity(item.quantity);
        return total + (quantity ?? 0);
      }, 0);
      if (value !== null && itemCount > 0) {
        emit(event.type, {
          currency: "INR",
          value,
          item_count: Math.min(itemCount, MAX_ITEMS * 10),
        });
      }
      return;
    }
    case "payment_method":
      emit("payment_method_selected", { payment_type: event.method });
      return;
    case "checkout_stage":
      emit("checkout_progress", {
        checkout_stage: event.stage,
        payment_type: event.method,
      });
      return;
    case "purchase": {
      const transactionId = cleanIdentifier(event.transactionId);
      const value = moneyInRupees(event.value);
      const items = event.items
        .slice(0, MAX_ITEMS)
        .map(purchaseItem)
        .filter((item): item is NonNullable<typeof item> => item !== null);
      if (!transactionId || value === null || items.length === 0) return;

      const dedupeKey = `fs-analytics-purchase:${transactionId}`;
      try {
        if (sessionStorage.getItem(dedupeKey) === "1") return;
      } catch {
        // Analytics remains non-blocking when browser storage is unavailable.
      }
      if (
        emit("purchase", {
          transaction_id: transactionId,
          currency: "INR",
          value,
          items,
        })
      ) {
        try {
          sessionStorage.setItem(dedupeKey, "1");
        } catch {
          // A failed dedupe write must never interrupt checkout navigation.
        }
      }
      return;
    }
    case "search": {
      const resultCount =
        typeof event.resultCount === "number" && Number.isFinite(event.resultCount)
          ? Math.max(0, Math.min(1_000, Math.trunc(event.resultCount)))
          : undefined;
      emit("storefront_search", {
        search_source: event.source,
        query_length_bucket: queryLengthBucket(
          Math.max(0, Math.trunc(event.queryLength)),
        ),
        ...(resultCount === undefined
          ? {}
          : { result_count: resultCount, has_results: resultCount > 0 }),
      });
      return;
    }
    case "filter":
      emit("catalog_filter_changed", {
        filter_name: event.filter,
        filter_action: event.action,
        active_filter_count: Math.max(0, Math.min(6, Math.trunc(event.activeCount))),
      });
  }
}

const SENSITIVE_ROUTE = /^\/(?:admin|account|auth|login|signup|register|forgot-password|reset-password|order|invoice|access|track-order|payments)(?:\/|$)/i;
const PUBLIC_STATIC_ROUTES = new Set([
  "/",
  "/about",
  "/cart",
  "/checkout",
  "/contact",
  "/faq",
  "/guides",
  "/privacy",
  "/search",
  "/shipping-returns",
  "/shop",
  "/terms",
]);

function analyticsPath(pathname: string): string | null {
  if (!pathname.startsWith("/") || SENSITIVE_ROUTE.test(pathname)) return null;
  const normalized =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : "/";
  if (PUBLIC_STATIC_ROUTES.has(normalized)) return normalized;
  if (/^\/product\/[^/]+\/?$/i.test(pathname)) return "/product/:product";
  if (/^\/shop\/[^/]+\/?$/i.test(pathname)) return "/shop/:category";
  if (/^\/guides\/[^/]+\/?$/i.test(pathname)) return "/guides/:guide";
  return "/unknown";
}

/** Emits manual page views from a redacted pathname only. */
export function AnalyticsRouteTracker() {
  const pathname = usePathname();
  const lastRawPath = useRef<string | null>(null);

  useEffect(() => {
    const safePath = analyticsPath(pathname);
    if (!safePath || pathname === lastRawPath.current) return;
    if (
      emit("page_view", {
        page_path: safePath,
        page_location: `${window.location.origin}${safePath}`,
        page_referrer: "",
        page_title: safePath,
      })
    ) {
      // Compare the raw value only in memory so two different products or
      // categories still produce views; only the redacted template is sent.
      lastRawPath.current = pathname;
    }
  }, [pathname]);

  return null;
}

export function ProductListAnalytics({
  list,
  products,
}: {
  list: StorefrontListContext;
  products: readonly Merchandise[];
}) {
  const lastSignature = useRef("");

  useEffect(() => {
    const signature = `${list}:${products.map((product) => product.id).join(",")}`;
    if (!products.length || signature === lastSignature.current) return;
    lastSignature.current = signature;
    trackStorefrontEvent({ type: "view_item_list", list, products });
  }, [list, products]);

  return null;
}

export function ProductViewAnalytics({ product }: { product: Merchandise }) {
  const trackedId = useRef<string | null>(null);

  useEffect(() => {
    if (trackedId.current === product.id) return;
    trackedId.current = product.id;
    trackStorefrontEvent({ type: "view_item", product });
  }, [product]);

  return null;
}

export function SearchResultsAnalytics({
  queryLength,
  resultCount,
}: {
  queryLength: number;
  resultCount: number;
}) {
  const lastSignature = useRef("");

  useEffect(() => {
    const signature = `${queryLength}:${resultCount}`;
    if (queryLength < 1 || signature === lastSignature.current) return;
    lastSignature.current = signature;
    trackStorefrontEvent({
      type: "search",
      source: "search_page",
      queryLength,
      resultCount,
    });
  }, [queryLength, resultCount]);

  return null;
}
