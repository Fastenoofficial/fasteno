"use client";

import { useState, useTransition, type FormEvent } from "react";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import {
  deleteAddress,
  saveAddress,
  setDefaultAddress,
  type AddressInput,
} from "@/components/account/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import type { Address } from "@/lib/types";

const emptyForm: AddressInput = {
  name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: false,
};

function toForm(a: Address): AddressInput {
  return {
    name: a.name,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2 ?? "",
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    isDefault: a.isDefault ?? false,
  };
}

/** Address book CRUD. Server actions revalidate /account/addresses so the
 *  server-fetched `addresses` prop refreshes after each mutation. */
export function AddressBook({ addresses }: { addresses: Address[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<AddressInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openNew() {
    setForm({ ...emptyForm, isDefault: addresses.length === 0 });
    setError(null);
    setEditing("new");
  }

  function openEdit(address: Address) {
    setForm(toForm(address));
    setError(null);
    setEditing(address.id ?? null);
  }

  function set<K extends keyof AddressInput>(key: K, value: AddressInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveAddress(
        form,
        editing === "new" ? undefined : (editing ?? undefined),
      );
      if (result.error) setError(result.error);
      else setEditing(null);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteAddress(id);
      if (result.error) setError(result.error);
    });
  }

  function handleMakeDefault(id: string) {
    startTransition(async () => {
      const result = await setDefaultAddress(id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-ivory">Address Book</h2>
          <p className="mt-1 text-sm text-muted">
            Saved addresses for faster checkout.
          </p>
        </div>
        {editing === null && (
          <Button variant="outline" size="sm" onClick={openNew}>
            <Plus size={14} />
            Add Address
          </Button>
        )}
      </div>

      {editing !== null && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 border border-line bg-card p-6"
          noValidate
        >
          <h3 className="font-display text-lg text-ivory">
            {editing === "new" ? "New address" : "Edit address"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
            <Input
              label="Phone"
              type="tel"
              required
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>
          <Input
            label="Address line 1"
            required
            value={form.line1}
            onChange={(e) => set("line1", e.target.value)}
            placeholder="Flat / house no., building, street"
          />
          <Input
            label="Address line 2 (optional)"
            value={form.line2}
            onChange={(e) => set("line2", e.target.value)}
            placeholder="Area, landmark"
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="City"
              required
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
            />
            <Input
              label="State"
              required
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
            />
            <Input
              label="PIN code"
              required
              inputMode="numeric"
              maxLength={6}
              value={form.pincode}
              onChange={(e) => set("pincode", e.target.value)}
              placeholder="400001"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => set("isDefault", e.target.checked)}
              className="h-4 w-4 accent-[var(--color-gold)]"
            />
            Set as default address
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="submit" variant="primary" size="md" disabled={pending}>
              {pending ? "Saving…" : "Save Address"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setEditing(null)}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {error && editing === null && (
        <p className="text-sm text-danger">{error}</p>
      )}

      {addresses.length === 0 && editing === null ? (
        <EmptyState
          icon={<MapPin size={32} strokeWidth={1.5} />}
          title="No saved addresses"
          description="Add a delivery address to breeze through checkout."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <div
              key={address.id}
              className="flex flex-col border border-line bg-card p-5"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <span className="font-display text-lg text-ivory">
                  {address.name}
                </span>
                {address.isDefault && <Badge tone="gold">Default</Badge>}
              </div>
              <p className="text-sm leading-relaxed text-muted">
                {address.line1}
                {address.line2 && (
                  <>
                    <br />
                    {address.line2}
                  </>
                )}
                <br />
                {address.city}, {address.state} — {address.pincode}
                <br />
                {address.phone}
              </p>
              <div className="mt-auto flex items-center gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => openEdit(address)}
                  disabled={pending}
                  className="inline-flex cursor-pointer items-center gap-1.5 border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-gold hover:text-gold disabled:opacity-45"
                >
                  <Pencil size={12} />
                  Edit
                </button>
                {!address.isDefault && address.id && (
                  <button
                    type="button"
                    onClick={() => handleMakeDefault(address.id!)}
                    disabled={pending}
                    className="inline-flex cursor-pointer items-center gap-1.5 border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-gold hover:text-gold disabled:opacity-45"
                  >
                    <Star size={12} />
                    Make default
                  </button>
                )}
                {address.id && (
                  <button
                    type="button"
                    onClick={() => handleDelete(address.id!)}
                    disabled={pending}
                    aria-label={`Delete address for ${address.name}`}
                    className="ml-auto inline-flex cursor-pointer items-center gap-1.5 border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-danger hover:text-danger disabled:opacity-45"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
