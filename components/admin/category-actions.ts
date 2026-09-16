"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { normalizeImageSource } from "@/lib/image-security";
import { createClient } from "@/lib/supabase/server";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CATEGORY_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface CategoryValues {
  name: string;
  slug: string;
  description: string;
  display_on_home: boolean;
  image_url: string | null;
}

function optionalImageReference(
  value: FormDataEntryValue | null,
): string | null | undefined {
  if (value === null || (typeof value === "string" && !value.trim())) return null;
  if (typeof value !== "string") return undefined;
  return normalizeImageSource(value) ?? undefined;
}

function parseCategory(formData: FormData):
  | { values: CategoryValues }
  | { error: string } {
  const rawName = formData.get("name");
  const rawSlug = formData.get("slug");
  const rawDescription = formData.get("description");
  const image_url = optionalImageReference(formData.get("image_url"));

  if (typeof rawName !== "string" || typeof rawSlug !== "string") {
    return { error: "Name and slug are required." };
  }

  const name = rawName.normalize("NFKC").trim();
  const slug = rawSlug.normalize("NFKC").trim().toLowerCase();
  const description =
    typeof rawDescription === "string"
      ? rawDescription.normalize("NFKC").trim()
      : "";

  if (!name || !slug) return { error: "Name and slug are required." };
  if (name.length > 120) return { error: "Name must be 120 characters or fewer." };
  if (slug.length > 120 || !CATEGORY_SLUG.test(slug)) {
    return { error: "Slug must be lowercase words separated by hyphens." };
  }
  if (description.length > 1_000) {
    return { error: "Description must be 1,000 characters or fewer." };
  }
  if (image_url === undefined) {
    return {
      error: "Use a valid local image path or an approved HTTPS image URL.",
    };
  }

  return {
    values: {
      name,
      slug,
      description,
      display_on_home: formData.get("display_on_home") === "on",
      image_url,
    },
  };
}

function revalidateCategories(...slugs: Array<string | undefined>) {
  revalidatePath("/admin/categories");
  revalidatePath("/shop");
  for (const slug of new Set(slugs.filter(Boolean))) {
    revalidatePath(`/shop/${slug}`);
  }
  revalidatePath("/");
}

function redirectFormError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function redirectListError(message: string): never {
  redirect(`/admin/categories?error=${encodeURIComponent(message)}`);
}

export async function createCategory(formData: FormData) {
  await requireAdmin();
  const parsed = parseCategory(formData);
  if ("error" in parsed) redirectFormError("/admin/categories/new", parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_category", {
    p_name: parsed.values.name,
    p_slug: parsed.values.slug,
    p_description: parsed.values.description,
    p_image_url: parsed.values.image_url,
    p_display_on_home: parsed.values.display_on_home,
  });

  if (error) {
    console.error("category action: create failed —", error.message);
    redirectFormError(
      "/admin/categories/new",
      error.code === "23505"
        ? "That category slug is already in use."
        : "Unable to create the category. Please try again.",
    );
  }

  revalidateCategories(parsed.values.slug);
  redirect("/admin/categories?created=true");
}

export async function updateCategory(id: string, formData: FormData) {
  await requireAdmin();
  if (!UUID.test(id)) redirectListError("Category id is invalid.");

  const parsed = parseCategory(formData);
  if ("error" in parsed) {
    redirectFormError(`/admin/categories/${id}`, parsed.error);
  }

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("categories")
    .select("slug")
    .eq("id", id)
    .maybeSingle();
  if (currentError) {
    console.error("category action: current lookup failed —", currentError.message);
    redirectFormError(
      `/admin/categories/${id}`,
      "Unable to load the category. Please try again.",
    );
  }
  if (!current) redirectListError("Category not found.");

  // Ordering is deliberately excluded: the list-page arrows use the locked
  // move_category RPC, so metadata edits cannot create duplicate positions.
  const { data: updated, error } = await supabase
    .from("categories")
    .update(parsed.values)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("category action: update failed —", error.message);
    redirectFormError(
      `/admin/categories/${id}`,
      error.code === "23505"
        ? "That category slug is already in use."
        : "Unable to save the category. Please try again.",
    );
  }
  if (!updated) redirectListError("Category not found.");

  revalidateCategories(current.slug, parsed.values.slug);
  redirect("/admin/categories?updated=true");
}

export async function deleteCategory(id: string) {
  await requireAdmin();
  if (!UUID.test(id)) redirectListError("Category id is invalid.");

  const supabase = await createClient();
  const { data: deletedSlug, error } = await supabase.rpc("delete_category", {
    p_category_id: id,
  });

  if (error) {
    console.error("category action: delete failed —", error.message);
    redirectListError(
      error.code === "23503"
        ? "Cannot delete a category with products. Reassign products first."
        : "Unable to delete the category. Please try again.",
    );
  }

  revalidateCategories(
    typeof deletedSlug === "string" ? deletedSlug : undefined,
  );
  redirect("/admin/categories?deleted=true");
}

export async function moveCategory(id: string, direction: -1 | 1) {
  await requireAdmin();
  if (!UUID.test(id) || (direction !== -1 && direction !== 1)) {
    redirectListError("Category move is invalid.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("move_category", {
    p_category_id: id,
    p_direction: direction,
  });
  if (error) {
    console.error("category action: reorder failed —", error.message);
    redirectListError(
      "Category ordering could not be saved. Refresh and try again.",
    );
  }

  revalidateCategories();
  redirect("/admin/categories?moved=true");
}
