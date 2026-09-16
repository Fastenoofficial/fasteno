import "server-only";

import { requireServiceClient } from "@/lib/supabase/service";

const BUCKET = "product-images";
const STORAGE_PAGE_SIZE = 1_000;
const DATABASE_PAGE_SIZE = 1_000;
const MAX_STORAGE_DEPTH = 20;
const MAX_STORAGE_OBJECTS = 100_000;
const MAX_DATABASE_ROWS_PER_SOURCE = 100_000;
const MAX_MEDIA_REFERENCES = 250_000;
const MAX_REPORT_ROWS = 250_000;

type MediaReferenceKind = "storage" | "external" | "local" | "invalid";

export type MediaInventoryStatus =
  | "referenced"
  | "unreferenced"
  | "missing"
  | "external"
  | "local"
  | "invalid";

interface MediaReference {
  value: string;
  source: string;
}

interface StorageObject {
  path: string;
  publicUrl: string;
  bytes: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MediaInventoryRow {
  status: MediaInventoryStatus;
  objectPath: string | null;
  value: string;
  publicUrl: string | null;
  referenceCount: number;
  sources: string[];
  bytes: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MediaInventoryReport {
  generatedAt: string;
  summary: {
    storageObjects: number;
    referencedObjects: number;
    unreferencedObjects: number;
    missingObjects: number;
    externalValues: number;
    localValues: number;
    invalidValues: number;
    totalReferences: number;
  };
  rows: MediaInventoryRow[];
}

interface StorageListItem {
  id?: string | null;
  name: string;
  metadata?: { size?: unknown } | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface ProductReferenceRow {
  id: string;
  slug: string;
  active: boolean;
  images: string[] | null;
}

interface CategoryReferenceRow {
  id: string;
  slug: string;
  image_url: string | null;
}

interface BannerReferenceRow {
  id: string;
  enabled: boolean | null;
  image_url: string;
  mobile_image_url: string | null;
}

interface OrderItemReferenceRow {
  id: string;
  image: string;
}

interface PageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

async function loadAllRows<T>(
  label: string,
  loadPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += DATABASE_PAGE_SIZE) {
    const { data, error } = await loadPage(
      from,
      from + DATABASE_PAGE_SIZE - 1,
    );
    if (error) throw new Error(`Could not inventory ${label}: ${error.message}`);
    const page = data ?? [];
    rows.push(...page);
    if (rows.length > MAX_DATABASE_ROWS_PER_SOURCE) {
      throw new Error(
        `Media inventory exceeded ${MAX_DATABASE_ROWS_PER_SOURCE.toLocaleString()} ${label} rows.`,
      );
    }
    if (page.length < DATABASE_PAGE_SIZE) return rows;
  }
}

function safeObjectPath(path: string): string | null {
  if (!path || path.startsWith("/") || path.includes("\\")) return null;
  const segments = path.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    return null;
  }
  return segments.join("/");
}

function storageUrlClassifier(publicProbeUrl: string) {
  const probeName = "__media_inventory_probe__";
  const probe = new URL(publicProbeUrl);
  const suffix = `/${probeName}`;
  if (!probe.pathname.endsWith(suffix)) {
    throw new Error("Could not determine the product-images public URL prefix.");
  }
  const publicPathPrefix = probe.pathname.slice(0, -probeName.length);

  return (rawValue: string): { kind: MediaReferenceKind; path: string | null } => {
    const value = rawValue.trim();
    if (!value) return { kind: "invalid", path: null };
    if (value.startsWith("/")) return { kind: "local", path: null };

    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      return { kind: "invalid", path: null };
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { kind: "invalid", path: null };
    }

    const exactPublicObjectUrl =
      parsed.origin === probe.origin &&
      !parsed.username &&
      !parsed.password &&
      !parsed.search &&
      !parsed.hash &&
      parsed.pathname.startsWith(publicPathPrefix);

    if (!exactPublicObjectUrl) return { kind: "external", path: null };

    const encodedPath = parsed.pathname.slice(publicPathPrefix.length);
    try {
      const path = safeObjectPath(decodeURIComponent(encodedPath));
      return path
        ? { kind: "storage", path }
        : { kind: "invalid", path: null };
    } catch {
      return { kind: "invalid", path: null };
    }
  };
}

async function listStorageObjects(
  client: ReturnType<typeof requireServiceClient>,
): Promise<StorageObject[]> {
  const bucket = client.storage.from(BUCKET);
  const objects: StorageObject[] = [];
  const seenFolders = new Set<string>();
  const seenObjects = new Set<string>();

  async function visit(prefix: string, depth: number): Promise<void> {
    if (depth > MAX_STORAGE_DEPTH) {
      throw new Error("Storage inventory exceeded the supported folder depth.");
    }
    if (prefix) {
      if (seenFolders.has(prefix)) return;
      seenFolders.add(prefix);
    }

    for (let offset = 0; ; offset += STORAGE_PAGE_SIZE) {
      const { data, error } = await bucket.list(prefix, {
        limit: STORAGE_PAGE_SIZE,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) {
        throw new Error(
          `Could not list ${prefix || "the bucket root"}: ${error.message}`,
        );
      }

      const page = (data ?? []) as StorageListItem[];
      for (const item of page) {
        const path = safeObjectPath(prefix ? `${prefix}/${item.name}` : item.name);
        if (!path) continue;

        const isFolder = item.id == null && item.metadata == null;
        if (isFolder) {
          await visit(path, depth + 1);
          continue;
        }

        if (seenObjects.has(path)) continue;
        seenObjects.add(path);
        if (seenObjects.size > MAX_STORAGE_OBJECTS) {
          throw new Error("Storage inventory exceeded 100,000 objects.");
        }

        const size = item.metadata?.size;
        objects.push({
          path,
          publicUrl: bucket.getPublicUrl(path).data.publicUrl,
          bytes: typeof size === "number" && Number.isFinite(size) ? size : null,
          createdAt: typeof item.created_at === "string" ? item.created_at : null,
          updatedAt: typeof item.updated_at === "string" ? item.updated_at : null,
        });
      }

      if (page.length < STORAGE_PAGE_SIZE) break;
    }
  }

  await visit("", 0);
  return objects;
}

function collectReferences(
  products: ProductReferenceRow[],
  categories: CategoryReferenceRow[],
  banners: BannerReferenceRow[],
  orderItems: OrderItemReferenceRow[],
): MediaReference[] {
  const references: MediaReference[] = [];
  const add = (value: string | null | undefined, source: string) => {
    // Null means an optional field is absent. A present empty/whitespace value
    // is still a persisted reference and must be reported as invalid.
    if (typeof value !== "string") return;
    references.push({ value, source });
    if (references.length > MAX_MEDIA_REFERENCES) {
      throw new Error(
        `Media inventory exceeded ${MAX_MEDIA_REFERENCES.toLocaleString()} persisted references.`,
      );
    }
  };

  for (const product of products) {
    (product.images ?? []).forEach((image, index) =>
      add(
        image,
        `product:${product.slug}:images[${index}]${product.active ? "" : ":archived"}`,
      ),
    );
  }
  for (const category of categories) {
    add(category.image_url, `category:${category.slug}:image_url`);
  }
  for (const banner of banners) {
    const state = banner.enabled ? "" : ":disabled";
    add(banner.image_url, `banner:${banner.id}:image_url${state}`);
    add(
      banner.mobile_image_url,
      `banner:${banner.id}:mobile_image_url${state}`,
    );
  }
  for (const item of orderItems) {
    add(item.image, `order_item:${item.id}:image`);
  }
  return references;
}

function uniqueSources(references: MediaReference[]): string[] {
  return Array.from(new Set(references.map((reference) => reference.source))).sort();
}

/**
 * Builds a complete, read-only inventory. Callers must authenticate an admin
 * before invoking this function because it uses the server-only service client
 * to include hidden rows and recursively list every bucket object.
 */
export async function getAdminMediaInventory(): Promise<MediaInventoryReport> {
  const client = requireServiceClient();
  const bucket = client.storage.from(BUCKET);
  const probeUrl = bucket.getPublicUrl("__media_inventory_probe__").data.publicUrl;
  const classify = storageUrlClassifier(probeUrl);

  const [objects, products, categories, banners, orderItems] = await Promise.all([
    listStorageObjects(client),
    loadAllRows<ProductReferenceRow>("product images", (from, to) =>
      client
        .from("products")
        .select("id, slug, active, images")
        .order("id", { ascending: true })
        .range(from, to) as unknown as PromiseLike<PageResult<ProductReferenceRow>>,
    ),
    loadAllRows<CategoryReferenceRow>("category images", (from, to) =>
      client
        .from("categories")
        .select("id, slug, image_url")
        .order("id", { ascending: true })
        .range(from, to) as unknown as PromiseLike<PageResult<CategoryReferenceRow>>,
    ),
    loadAllRows<BannerReferenceRow>("banner images", (from, to) =>
      client
        .from("site_banners")
        .select("id, enabled, image_url, mobile_image_url")
        .order("id", { ascending: true })
        .range(from, to) as unknown as PromiseLike<PageResult<BannerReferenceRow>>,
    ),
    loadAllRows<OrderItemReferenceRow>("order item images", (from, to) =>
      client
        .from("order_items")
        .select("id, image")
        .order("id", { ascending: true })
        .range(from, to) as unknown as PromiseLike<PageResult<OrderItemReferenceRow>>,
    ),
  ]);

  const references = collectReferences(products, categories, banners, orderItems);
  const storageReferences = new Map<string, MediaReference[]>();
  const otherReferences = new Map<string, { kind: Exclude<MediaReferenceKind, "storage">; references: MediaReference[] }>();

  for (const reference of references) {
    const classified = classify(reference.value);
    if (classified.kind === "storage" && classified.path) {
      const grouped = storageReferences.get(classified.path) ?? [];
      grouped.push(reference);
      storageReferences.set(classified.path, grouped);
      continue;
    }

    const key = `${classified.kind}\u0000${reference.value}`;
    const grouped = otherReferences.get(key) ?? {
      kind: classified.kind as Exclude<MediaReferenceKind, "storage">,
      references: [],
    };
    grouped.references.push(reference);
    otherReferences.set(key, grouped);
  }

  const objectPaths = new Set(objects.map((object) => object.path));
  const rows: MediaInventoryRow[] = objects.map((object) => {
    const matching = storageReferences.get(object.path) ?? [];
    return {
      status: matching.length > 0 ? "referenced" : "unreferenced",
      objectPath: object.path,
      value: object.publicUrl,
      publicUrl: object.publicUrl,
      referenceCount: matching.length,
      sources: uniqueSources(matching),
      bytes: object.bytes,
      createdAt: object.createdAt,
      updatedAt: object.updatedAt,
    };
  });

  for (const [path, matching] of storageReferences) {
    if (objectPaths.has(path)) continue;
    rows.push({
      status: "missing",
      objectPath: path,
      value: matching[0]?.value ?? path,
      publicUrl: bucket.getPublicUrl(path).data.publicUrl,
      referenceCount: matching.length,
      sources: uniqueSources(matching),
      bytes: null,
      createdAt: null,
      updatedAt: null,
    });
  }

  for (const grouped of otherReferences.values()) {
    const first = grouped.references[0];
    if (!first) continue;
    rows.push({
      status: grouped.kind,
      objectPath: null,
      value: first.value,
      publicUrl: null,
      referenceCount: grouped.references.length,
      sources: uniqueSources(grouped.references),
      bytes: null,
      createdAt: null,
      updatedAt: null,
    });
  }

  if (rows.length > MAX_REPORT_ROWS) {
    throw new Error(
      `Media inventory exceeded ${MAX_REPORT_ROWS.toLocaleString()} unique report rows.`,
    );
  }

  const priority: Record<MediaInventoryStatus, number> = {
    missing: 0,
    unreferenced: 1,
    invalid: 2,
    external: 3,
    local: 4,
    referenced: 5,
  };
  rows.sort(
    (left, right) =>
      priority[left.status] - priority[right.status] ||
      (left.objectPath ?? left.value).localeCompare(right.objectPath ?? right.value),
  );

  const countStatus = (status: MediaInventoryStatus) =>
    rows.filter((row) => row.status === status).length;

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      storageObjects: objects.length,
      referencedObjects: countStatus("referenced"),
      unreferencedObjects: countStatus("unreferenced"),
      missingObjects: countStatus("missing"),
      externalValues: countStatus("external"),
      localValues: countStatus("local"),
      invalidValues: countStatus("invalid"),
      totalReferences: references.length,
    },
    rows,
  };
}
