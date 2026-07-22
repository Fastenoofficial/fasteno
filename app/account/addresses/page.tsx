import type { Metadata } from "next";
import { isDemoMode } from "@/lib/config";
import { requireUser } from "@/lib/auth";
import type { Address } from "@/lib/types";
import { DemoNotice } from "@/components/account/DemoNotice";
import { AddressBook } from "@/components/account/AddressBook";

export const metadata: Metadata = {
  title: "Addresses",
  description: "Manage your saved delivery addresses.",
};

interface AddressRow {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

export default async function AddressesPage() {
  if (isDemoMode) {
    return (
      <DemoNotice
        title="Addresses are disabled in demo mode"
        description="Saved addresses live in Supabase. In demo mode you can still enter a delivery address during checkout — it just isn't stored."
      />
    );
  }

  const user = await requireUser("/account/addresses");
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase
    .from("addresses")
    .select("id, name, phone, line1, line2, city, state, pincode, is_default")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  const addresses: Address[] = ((data ?? []) as AddressRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    line1: row.line1,
    line2: row.line2 ?? undefined,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    isDefault: row.is_default,
  }));

  return <AddressBook addresses={addresses} />;
}
