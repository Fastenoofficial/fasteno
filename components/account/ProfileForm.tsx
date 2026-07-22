"use client";

import { useState, useTransition, type FormEvent } from "react";
import { updateProfile } from "@/components/account/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Profile } from "@/lib/types";

/** Edit full name + phone on the profiles table. */
export function ProfileForm({
  profile,
  email,
}: {
  profile: Profile;
  email: string;
}) {
  const [fullName, setFullName] = useState(profile.fullName ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateProfile({ fullName, phone });
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-5" noValidate>
      <Input label="Email" type="email" value={email} disabled readOnly />
      <Input
        label="Full name"
        type="text"
        name="fullName"
        autoComplete="name"
        required
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Arjun Mehta"
      />
      <Input
        label="Phone (optional)"
        type="tel"
        name="phone"
        autoComplete="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+91 98765 43210"
        error={error ?? undefined}
      />
      <div className="flex items-center gap-4">
        <Button type="submit" variant="primary" size="md" disabled={pending}>
          {pending ? "Saving…" : "Save Changes"}
        </Button>
        {saved && <span className="text-sm text-success">Profile saved.</span>}
      </div>
    </form>
  );
}
