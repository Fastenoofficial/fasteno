/** Shared domain types — the contract every feature area codes against.
 *  All money values are integer paise (₹1,899.00 → 189900). */

export type CategorySlug =
  | "ties"
  | "cufflinks"
  | "brooches"
  | "pocket-squares"
  | "buttons"
  | "gift-sets";

export interface Category {
  id: string;
  slug: CategorySlug;
  name: string;
  description: string;
  sortOrder: number;
  image_url?: string;
  display_on_home?: boolean;
}

export type Pattern = "solid" | "striped" | "textured" | "printed";

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: CategorySlug;
  price: number; // paise
  compareAtPrice: number | null; // paise, for sale strikethrough
  description: string;
  details: string[]; // material / craft bullet points
  material: string;
  color: string; // primary colour name, lowercase (e.g. "navy")
  pattern: Pattern;
  tags: string[]; // e.g. ["wedding", "office", "gift"]
  images: string[]; // public paths, e.g. "/products/midnight-navy-silk-tie.svg"
  stock: number;
  featured: boolean;
  active: boolean;
  createdAt: string; // ISO
  /** SEO <title> override for the PDP — empty/undefined falls back to name. */
  metaTitle?: string;
  /** SEO meta-description override for the PDP. */
  metaDescription?: string;
}

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  price: number; // paise, unit price at time of add
  image: string;
  quantity: number;
}

export interface Address {
  id?: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

export type PaymentMethod = "razorpay" | "cod" | "demo";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  productId: string;
  name: string;
  price: number; // paise
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "FS-10023"
  userId: string | null; // null = guest order
  email: string;
  phone: string;
  shippingAddress: Address;
  items: OrderItem[];
  subtotal: number; // paise
  shippingFee: number; // paise
  total: number; // paise
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  status: OrderStatus;
  createdAt: string; // ISO
}

export interface Profile {
  id: string;
  fullName: string | null;
  phone: string | null;
  role: "customer" | "admin";
}

/** Query options accepted by lib/catalog.ts getProducts(). */
export interface ProductQuery {
  category?: CategorySlug | string;
  color?: string;
  material?: string;
  pattern?: Pattern | string;
  minPrice?: number; // paise
  maxPrice?: number; // paise
  query?: string; // free-text search
  tag?: string;
  sort?: "featured" | "newest" | "price-asc" | "price-desc";
  limit?: number;
}
