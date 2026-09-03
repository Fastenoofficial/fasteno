"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createBanner(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const location = formData.get("location") as string;
  const title = formData.get("title") as string;
  const subtitle = formData.get("subtitle") as string;
  const cta_text = formData.get("cta_text") as string;
  const cta_link = formData.get("cta_link") as string;
  const image_url = formData.get("image_url") as string;
  const mobile_image_url = formData.get("mobile_image_url") as string;
  const enabled = formData.get("enabled") === "on";
  const sort_order = parseInt(formData.get("sort_order") as string) || 0;

  if (!location || !image_url) {
    redirect("/admin/banners/new?error=Location and image URL are required");
  }

  const { error } = await supabase.from("site_banners").insert({
    location,
    title,
    subtitle,
    cta_text,
    cta_link,
    image_url,
    mobile_image_url: mobile_image_url || null,
    enabled,
    sort_order,
  });

  if (error) {
    redirect(`/admin/banners/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/banners");
  revalidatePath("/");
  redirect("/admin/banners?created=true");
}

export async function updateBanner(id: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const location = formData.get("location") as string;
  const title = formData.get("title") as string;
  const subtitle = formData.get("subtitle") as string;
  const cta_text = formData.get("cta_text") as string;
  const cta_link = formData.get("cta_link") as string;
  const image_url = formData.get("image_url") as string;
  const mobile_image_url = formData.get("mobile_image_url") as string;
  const enabled = formData.get("enabled") === "on";
  const sort_order = parseInt(formData.get("sort_order") as string) || 0;

  if (!location || !image_url) {
    redirect(`/admin/banners/${id}?error=Location and image URL are required`);
  }

  const { error } = await supabase
    .from("site_banners")
    .update({
      location,
      title,
      subtitle,
      cta_text,
      cta_link,
      image_url,
      mobile_image_url: mobile_image_url || null,
      enabled,
      sort_order,
    })
    .eq("id", id);

  if (error) {
    redirect(`/admin/banners/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/banners");
  revalidatePath("/");
  redirect("/admin/banners?updated=true");
}

export async function deleteBanner(id: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("site_banners").delete().eq("id", id);

  if (error) {
    redirect(`/admin/banners?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/banners");
  revalidatePath("/");
  redirect("/admin/banners?deleted=true");
}

export async function toggleBanner(id: string, enabled: boolean) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("site_banners")
    .update({ enabled })
    .eq("id", id);

  if (error) {
    redirect(`/admin/banners?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/banners");
  revalidatePath("/");
}
