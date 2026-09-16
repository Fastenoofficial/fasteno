"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CartItem, Product } from "@/lib/types";

const CART_KEY = "fs-cart";
const WISHLIST_KEY = "fs-wishlist";
const MAX_CART_ITEMS = 100;
const MAX_WISHLIST_ITEMS = 200;
const MAX_STORED_PRICE = 100_000_000; // ₹10,00,000 in paise
const SAFE_ID = /^[a-zA-Z0-9_-]{1,128}$/;
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_LOCAL_IMAGE = /^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:avif|gif|jpe?g|png|webp|svg)$/i;
const SAFE_REMOTE_IMAGE = /\.(?:avif|gif|jpe?g|png|webp)$/i;

export interface AddItemResult {
  addedQuantity: number;
  reason: "cart_limit" | "quantity_limit" | null;
}

function normalizedText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.normalize("NFKC").trim();
  if (
    !text ||
    Array.from(text).length > maxLength ||
    /[\u0000-\u001f\u007f]/.test(text)
  ) {
    return null;
  }
  return text;
}

function safeImage(value: unknown): string {
  if (typeof value !== "string") return "";
  const source = value.normalize("NFKC").trim();
  if (!source || source.length > 2_048 || source.includes("\\")) return "";

  if (source.startsWith("/")) {
    return !source.startsWith("//") &&
      !source.includes("?") &&
      !source.includes("#") &&
      SAFE_LOCAL_IMAGE.test(source)
      ? source
      : "";
  }

  try {
    const url = new URL(source);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443") &&
      !url.hash &&
      SAFE_REMOTE_IMAGE.test(url.pathname)
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(10, Math.trunc(value)));
}

function parseStoredCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];

  const items: CartItem[] = [];
  const seen = new Set<string>();
  for (const value of parsed.slice(0, MAX_CART_ITEMS)) {
    if (!value || typeof value !== "object") continue;
    const candidate = value as Record<string, unknown>;
    const productId = normalizedText(candidate.productId, 128);
    const slug = normalizedText(candidate.slug, 160);
    const name = normalizedText(candidate.name, 200);
    const price = candidate.price;
    const quantity = candidate.quantity;

    if (
      !productId ||
      !SAFE_ID.test(productId) ||
      seen.has(productId) ||
      !slug ||
      !SAFE_SLUG.test(slug) ||
      !name ||
      typeof price !== "number" ||
      !Number.isSafeInteger(price) ||
      price < 0 ||
      price > MAX_STORED_PRICE ||
      typeof quantity !== "number" ||
      !Number.isFinite(quantity)
    ) {
      continue;
    }

    seen.add(productId);
    items.push({
      productId,
      slug,
      name,
      price,
      image: safeImage(candidate.image),
      quantity: clampQuantity(quantity),
    });
  }
  return items;
}

function parseStoredWishlist(raw: string | null): string[] {
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const value of parsed.slice(0, MAX_WISHLIST_ITEMS)) {
    const id = normalizedText(value, 128);
    if (!id || !SAFE_ID.test(id) || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function writeStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be blocked or full. Keep the in-memory cart usable.
  }
}

interface CartContextValue {
  hydrated: boolean;
  items: CartItem[];
  count: number;
  subtotal: number; // paise
  addItem: (product: Product, quantity?: number) => AddItemResult;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  wishlist: string[];
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (productId: string) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const itemsRef = useRef<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);

  const replaceItems = useCallback((next: CartItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  useEffect(() => {
    try {
      const restoredItems = parseStoredCart(localStorage.getItem(CART_KEY));
      itemsRef.current = restoredItems;
      setItems(restoredItems);
      setWishlist(parseStoredWishlist(localStorage.getItem(WISHLIST_KEY)));
    } catch {
      itemsRef.current = [];
      setItems([]);
      setWishlist([]);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) writeStorage(CART_KEY, items);
  }, [items, hydrated]);

  useEffect(() => {
    if (hydrated) writeStorage(WISHLIST_KEY, wishlist);
  }, [wishlist, hydrated]);

  const addItem = useCallback(
    (product: Product, quantity = 1): AddItemResult => {
      const requestedQuantity = clampQuantity(quantity);
      const current = itemsRef.current;
      const existingIndex = current.findIndex(
        (item) => item.productId === product.id,
      );

      if (existingIndex >= 0) {
        const existing = current[existingIndex];
        const addedQuantity = Math.min(
          requestedQuantity,
          Math.max(0, 10 - existing.quantity),
        );
        if (addedQuantity === 0) {
          return { addedQuantity: 0, reason: "quantity_limit" };
        }
        const next = current.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: item.quantity + addedQuantity }
            : item,
        );
        replaceItems(next);
        return {
          addedQuantity,
          reason:
            addedQuantity < requestedQuantity ? "quantity_limit" : null,
        };
      }

      if (current.length >= MAX_CART_ITEMS) {
        return { addedQuantity: 0, reason: "cart_limit" };
      }

      replaceItems([
        ...current,
        {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          image: product.images[0] ?? "",
          quantity: requestedQuantity,
        },
      ]);
      return { addedQuantity: requestedQuantity, reason: null };
    },
    [replaceItems],
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (!Number.isFinite(quantity)) return;
      const normalized = Math.trunc(quantity);
      const current = itemsRef.current;
      const next =
        normalized <= 0
          ? current.filter((item) => item.productId !== productId)
          : current.map((item) =>
              item.productId === productId
                ? { ...item, quantity: clampQuantity(normalized) }
                : item,
            );
      replaceItems(next);
    },
    [replaceItems],
  );

  const removeItem = useCallback(
    (productId: string) => {
      replaceItems(
        itemsRef.current.filter((item) => item.productId !== productId),
      );
    },
    [replaceItems],
  );

  const clearCart = useCallback(() => replaceItems([]), [replaceItems]);

  const isWishlisted = useCallback(
    (productId: string) => wishlist.includes(productId),
    [wishlist],
  );

  const toggleWishlist = useCallback((productId: string) => {
    if (!SAFE_ID.test(productId)) return;
    setWishlist((previous) =>
      previous.includes(productId)
        ? previous.filter((id) => id !== productId)
        : [...previous, productId].slice(0, MAX_WISHLIST_ITEMS),
    );
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      hydrated,
      items,
      count: items.reduce((total, item) => total + item.quantity, 0),
      subtotal: items.reduce(
        (total, item) => total + item.price * item.quantity,
        0,
      ),
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      wishlist,
      isWishlisted,
      toggleWishlist,
    }),
    [
      hydrated,
      items,
      wishlist,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      isWishlisted,
      toggleWishlist,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within <CartProvider>");
  return context;
}
