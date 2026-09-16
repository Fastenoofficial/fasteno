"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  BANNER_FIELD_LIMITS,
  HERO_BANNER_LOCATION,
  isBannerLocation,
  parseIstDateTimeLocal,
  type BannerLocation,
} from "@/lib/banner-types";
import {
  normalizeImageSource,
  normalizeOutboundUrl,
} from "@/lib/image-security";
import { createClient } from "@/lib/supabase/server";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class BannerValidationError extends Error {}

interface BannerInput {
  location: BannerLocation;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  image_url: string;
  mobile_image_url: string | null;
  product_1_id: string | null;
  product_2_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  enabled: boolean;
  sort_order: number;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function field(
  formData: FormData,
  name: string,
  label: string,
  maxLength: number,
): string {
  const raw = formData.get(name);
  if (raw === null) return "";
  if (typeof raw !== "string") {
    throw new BannerValidationError(`${label} must be text.`);
  }
  const value = raw.normalize("NFKC").trim();
  if (value.length > maxLength) {
    throw new BannerValidationError(
      `${label} must be ${maxLength} characters or fewer.`,
    );
  }
  return value;
}

function optionalProductId(
  formData: FormData,
  name: "product_1_id" | "product_2_id",
  label: string,
): string | null {
  const value = field(formData, name, label, 36);
  if (!value) return null;
  if (!UUID.test(value)) {
    throw new BannerValidationError(`${label} is invalid.`);
  }
  return value.toLowerCase();
}

function optionalIstInstant(
  formData: FormData,
  name: "starts_at" | "ends_at",
  label: string,
): string | null {
  const value = field(formData, name, label, 16);
  if (!value) return null;
  const instant = parseIstDateTimeLocal(value);
  if (!instant) {
    throw new BannerValidationError(
      `${label} must be a valid date and time in IST.`,
    );
  }
  return instant;
}

function parseBannerInput(
  formData: FormData,
  allowedLocations: readonly BannerLocation[],
): BannerInput {
  const locationValue = field(formData, "location", "Location", 32);
  if (
    !isBannerLocation(locationValue) ||
    !allowedLocations.includes(locationValue)
  ) {
    throw new BannerValidationError(
      "Only the implemented Home Hero placement can be selected.",
    );
  }

  const title = field(
    formData,
    "title",
    "Title",
    BANNER_FIELD_LIMITS.title,
  );
  const subtitle = field(
    formData,
    "subtitle",
    "Subtitle",
    BANNER_FIELD_LIMITS.subtitle,
  );
  const cta_text = field(
    formData,
    "cta_text",
    "CTA text",
    BANNER_FIELD_LIMITS.ctaText,
  );
  const ctaLinkInput = field(
    formData,
    "cta_link",
    "CTA link",
    BANNER_FIELD_LIMITS.url,
  );
  const cta_link = normalizeOutboundUrl(ctaLinkInput, {
    allowExternal: true,
    optional: true,
  });
  if (cta_link === null) {
    throw new BannerValidationError(
      "CTA link must be a safe local path or HTTPS URL.",
    );
  }
  if (Boolean(cta_text) !== Boolean(cta_link)) {
    throw new BannerValidationError(
      "CTA text and CTA link must either both be set or both be empty.",
    );
  }

  const imageInput = field(
    formData,
    "image_url",
    "Desktop image",
    BANNER_FIELD_LIMITS.url,
  );
  const image_url = normalizeImageSource(imageInput);
  if (!image_url) {
    throw new BannerValidationError(
      "Use a valid local desktop image path or approved HTTPS image URL.",
    );
  }

  const mobileImageInput = field(
    formData,
    "mobile_image_url",
    "Mobile image",
    BANNER_FIELD_LIMITS.url,
  );
  const mobile_image_url = mobileImageInput
    ? normalizeImageSource(mobileImageInput)
    : null;
  if (mobileImageInput && !mobile_image_url) {
    throw new BannerValidationError(
      "Use a valid local mobile image path or approved HTTPS image URL.",
    );
  }

  const product_1_id = optionalProductId(
    formData,
    "product_1_id",
    "Primary product",
  );
  const product_2_id = optionalProductId(
    formData,
    "product_2_id",
    "Secondary product",
  );
  if (product_1_id && product_1_id === product_2_id) {
    throw new BannerValidationError(
      "Primary and secondary products must be different.",
    );
  }

  const starts_at = optionalIstInstant(
    formData,
    "starts_at",
    "Start time",
  );
  const ends_at = optionalIstInstant(formData, "ends_at", "End time");
  if (
    starts_at &&
    ends_at &&
    new Date(ends_at).getTime() <= new Date(starts_at).getTime()
  ) {
    throw new BannerValidationError("End time must be later than start time.");
  }

  const sortOrderInput = field(formData, "sort_order", "Sort order", 10);
  if (!/^(0|[1-9]\d{0,9})$/.test(sortOrderInput)) {
    throw new BannerValidationError("Sort order must be a whole number from 0 upward.");
  }
  const sort_order = Number(sortOrderInput);
  if (!Number.isSafeInteger(sort_order) || sort_order > BANNER_FIELD_LIMITS.sortOrder) {
    throw new BannerValidationError("Sort order is too large.");
  }

  return {
    location: locationValue,
    title,
    subtitle,
    cta_text,
    cta_link,
    image_url,
    mobile_image_url,
    product_1_id,
    product_2_id,
    starts_at,
    ends_at,
    enabled: formData.get("enabled") === "on",
    sort_order,
  };
}

async function selectedProductError(
  supabase: SupabaseServerClient,
  input: Pick<BannerInput, "product_1_id" | "product_2_id">,
): Promise<string | null> {
  const ids = [input.product_1_id, input.product_2_id].filter(
    (id): id is string => Boolean(id),
  );
  if (ids.length === 0) return null;

  const { data, error } = await supabase
    .from("products")
    .select("id")
    .in("id", ids);
  if (error) {
    console.error("banner action: product validation failed —", error.message);
    return "Unable to validate selected products. Please try again.";
  }
  const found = new Set(
    ((data ?? []) as { id: string }[]).map((product) => product.id.toLowerCase()),
  );
  return ids.every((id) => found.has(id))
    ? null
    : "A selected product no longer exists. Refresh and choose again.";
}

function validationMessage(error: unknown): string {
  return error instanceof BannerValidationError
    ? error.message
    : "Banner details are invalid.";
}

function redirectFormError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function redirectListError(message: string): never {
  redirect(`/admin/banners?error=${encodeURIComponent(message)}`);
}

function revalidateBanners() {
  revalidatePath("/admin/banners");
  revalidatePath("/");
}

export async function createBanner(formData: FormData) {
  await requireAdmin();

  let input: BannerInput;
  try {
    input = parseBannerInput(formData, [HERO_BANNER_LOCATION]);
  } catch (error) {
    redirectFormError("/admin/banners/new", validationMessage(error));
  }

  const supabase = await createClient();
  const productError = await selectedProductError(supabase, input);
  if (productError) redirectFormError("/admin/banners/new", productError);

  const { error } = await supabase.from("site_banners").insert(input);
  if (error) {
    console.error("banner action: create failed —", error.message);
    redirectFormError(
      "/admin/banners/new",
      "Unable to create the banner. Please try again.",
    );
  }

  revalidateBanners();
  redirect("/admin/banners?created=true");
}

export async function updateBanner(id: string, formData: FormData) {
  await requireAdmin();
  if (!UUID.test(id)) redirectListError("Banner id is invalid.");

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("site_banners")
    .select("id, location")
    .eq("id", id)
    .maybeSingle();
  if (currentError) {
    console.error("banner action: current banner lookup failed —", currentError.message);
    redirectListError("Unable to load that banner. Please try again.");
  }
  if (!current || !isBannerLocation(current.location)) {
    redirectListError("Banner not found.");
  }

  const allowedLocations: BannerLocation[] = [HERO_BANNER_LOCATION];
  if (!allowedLocations.includes(current.location)) {
    allowedLocations.push(current.location);
  }

  let input: BannerInput;
  try {
    input = parseBannerInput(formData, allowedLocations);
  } catch (error) {
    redirectFormError(`/admin/banners/${id}`, validationMessage(error));
  }

  const productError = await selectedProductError(supabase, input);
  if (productError) redirectFormError(`/admin/banners/${id}`, productError);

  const { data: updated, error } = await supabase
    .from("site_banners")
    .update(input)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("banner action: update failed —", error.message);
    redirectFormError(
      `/admin/banners/${id}`,
      "Unable to update the banner. Please try again.",
    );
  }
  if (!updated) redirectListError("Banner not found.");

  revalidateBanners();
  redirect("/admin/banners?updated=true");
}

export async function deleteBanner(id: string) {
  await requireAdmin();
  if (!UUID.test(id)) redirectListError("Banner id is invalid.");
  const supabase = await createClient();

  const { data: deleted, error } = await supabase
    .from("site_banners")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("banner action: delete failed —", error.message);
    redirectListError("Unable to delete the banner. Please try again.");
  }
  if (!deleted) redirectListError("Banner not found.");

  revalidateBanners();
  redirect("/admin/banners?deleted=true");
}

export async function toggleBanner(id: string, enabled: boolean) {
  await requireAdmin();
  if (!UUID.test(id) || typeof enabled !== "boolean") {
    redirectListError("Banner update is invalid.");
  }
  const supabase = await createClient();

  const { data: updated, error } = await supabase
    .from("site_banners")
    .update({ enabled })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("banner action: toggle failed —", error.message);
    redirectListError("Unable to change banner status. Please try again.");
  }
  if (!updated) redirectListError("Banner not found.");

  revalidateBanners();
}

interface OrderedBannerRow {
  id: string;
  sort_order: number | null;
  created_at: string | null;
}

export async function moveBanner(id: string, direction: -1 | 1) {
  await requireAdmin();
  if (!UUID.test(id) || (direction !== -1 && direction !== 1)) {
    redirectListError("Banner move is invalid.");
  }
  const supabase = await createClient();

  const { data: current, error: currentError } = await supabase
    .from("site_banners")
    .select("id, location")
    .eq("id", id)
    .maybeSingle();
  if (currentError) {
    console.error("banner action: move lookup failed —", currentError.message);
    redirectListError("Unable to move that banner. Please try again.");
  }
  if (!current || !isBannerLocation(current.location)) {
    redirectListError("Banner not found.");
  }

  const { data, error } = await supabase
    .from("site_banners")
    .select("id, sort_order, created_at")
    .eq("location", current.location)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });
  if (error || !data) {
    if (error) console.error("banner action: move group failed —", error.message);
    redirectListError("Unable to load banner order. Please try again.");
  }

  const ordered = [...(data as OrderedBannerRow[])];
  const index = ordered.findIndex((banner) => banner.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ordered.length) {
    redirectListError("That banner cannot move any farther.");
  }

  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  const { error: reorderError } = await supabase.rpc(
    "reorder_site_banners",
    {
      p_location: current.location,
      p_ordered_ids: ordered.map((banner) => banner.id),
    },
  );
  if (reorderError) {
    console.error("banner action: reorder failed —", reorderError.message);
    redirectListError("Banner ordering could not be saved. Refresh and try again.");
  }

  revalidateBanners();
  redirect("/admin/banners?moved=true");
}
