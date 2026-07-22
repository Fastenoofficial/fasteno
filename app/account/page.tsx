import type { Metadata } from "next";
import { isDemoMode } from "@/lib/config";
import { getProfile, requireUser } from "@/lib/auth";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DemoNotice } from "@/components/account/DemoNotice";
import { ProfileForm } from "@/components/account/ProfileForm";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your Fasteno Shyama profile.",
};

export default async function AccountPage() {
  if (isDemoMode) {
    return (
      <DemoNotice
        title="Profiles are disabled in demo mode"
        description="Your profile, orders and addresses live in Supabase. The wishlist below works right now — it's saved in your browser."
        showWishlistLink
      />
    );
  }

  const user = await requireUser("/account");
  const profile = await getProfile(user.id);

  return (
    <div className="border border-line bg-card p-6 sm:p-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-ivory">Profile</h2>
          <p className="mt-1 text-sm text-muted">
            Your details for faster checkout.
          </p>
        </div>
        {profile?.role === "admin" && (
          <div className="flex items-center gap-3">
            <Badge tone="gold">Admin</Badge>
            <Button href="/admin" variant="outline" size="sm">
              Open Admin
            </Button>
          </div>
        )}
      </div>
      {profile ? (
        <ProfileForm profile={profile} email={user.email ?? ""} />
      ) : (
        <p className="text-sm text-muted">
          We couldn&apos;t load your profile. Please refresh the page.
        </p>
      )}
    </div>
  );
}
