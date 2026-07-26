"use client";

import { useState, useTransition } from "react";
import {
  shipOrderWithShiprocket,
  syncShiprocketStatus,
  updateOrderTracking,
} from "@/components/admin/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { OrderStatus } from "@/lib/types";

/** Admin "Shipping / Tracking" card — courier, AWB number and tracking URL.
 *  Auto-suggests the tracking URL from a per-courier template when the AWB
 *  is entered. Saving also (optionally) marks the order shipped, which
 *  triggers the "shipped" email server-side. */

const OTHER = "Other";

/** Common Indian couriers with tracking-URL templates ({awb} placeholder). */
const COURIERS: { name: string; template: string | null }[] = [
  { name: "Delhivery", template: "https://www.delhivery.com/track/package/{awb}" },
  { name: "Blue Dart", template: "https://www.bluedart.com/tracking?trackFor=0&trackNo={awb}" },
  { name: "DTDC", template: "https://www.dtdc.in/trace.asp?strCnno={awb}" },
  {
    name: "India Post",
    template:
      "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?LT={awb}",
  },
  { name: "Shiprocket", template: "https://www.shiprocket.in/shipment-tracking/{awb}" },
  { name: "Ecom Express", template: "https://www.ecomexpress.in/tracking/?awb_field={awb}" },
  { name: "XpressBees", template: "https://www.xpressbees.com/shipment/tracking?awbNo={awb}" },
  { name: OTHER, template: null },
];

function templateFor(courier: string): string | null {
  return COURIERS.find((c) => c.name === courier)?.template ?? null;
}

function buildUrl(courier: string, awb: string): string {
  const template = templateFor(courier);
  if (!template || !awb.trim()) return "";
  return template.replace("{awb}", encodeURIComponent(awb.trim()));
}

interface ShippingTrackingCardProps {
  orderId: string;
  status: OrderStatus;
  courier: string | null;
  awbNumber: string | null;
  trackingUrl: string | null;
  /** Whether Shiprocket credentials are present (resolved on the server —
   *  the client must never see the credentials themselves). */
  shiprocketEnabled?: boolean;
  /** Latest raw courier status, when Shiprocket has reported one. */
  shiprocketStatus?: string | null;
  shiprocketSyncedAt?: string | null;
}

export function ShippingTrackingCard({
  orderId,
  status,
  courier: initialCourier,
  awbNumber: initialAwb,
  trackingUrl: initialUrl,
  shiprocketEnabled = false,
  shiprocketStatus = null,
  shiprocketSyncedAt = null,
}: ShippingTrackingCardProps) {
  const knownCourier = COURIERS.some((c) => c.name === initialCourier);
  const [courierChoice, setCourierChoice] = useState(
    initialCourier ? (knownCourier ? initialCourier : OTHER) : COURIERS[0].name,
  );
  const [customCourier, setCustomCourier] = useState(
    initialCourier && !knownCourier ? initialCourier : "",
  );
  const [awb, setAwb] = useState(initialAwb ?? "");
  const [url, setUrl] = useState(initialUrl ?? "");
  const [urlTouched, setUrlTouched] = useState(Boolean(initialUrl));
  const [markShipped, setMarkShipped] = useState(status !== "shipped");

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const courier = courierChoice === OTHER ? customCourier : courierChoice;

  function suggestUrl(nextCourier: string, nextAwb: string) {
    if (urlTouched) return;
    setUrl(buildUrl(nextCourier, nextAwb));
  }

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateOrderTracking(orderId, {
        courier,
        awbNumber: awb,
        trackingUrl: url,
        markShipped: markShipped && status !== "shipped",
      });
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  // ── Shiprocket ──
  const [srError, setSrError] = useState<string | null>(null);
  const [srNote, setSrNote] = useState<string | null>(null);
  const [srPending, startSrTransition] = useTransition();
  const alreadyBooked = Boolean(initialAwb?.trim());

  function handleShipNow() {
    setSrError(null);
    setSrNote(null);
    startSrTransition(async () => {
      const result = await shipOrderWithShiprocket(orderId);
      if (result.error) {
        setSrError(result.error);
        return;
      }
      setSrNote(
        `Booked with ${result.courier ?? "courier"} — AWB ${result.awbNumber}. The customer has been emailed.`,
      );
      // Reflect the booking in the manual fields without a full reload.
      if (result.awbNumber) setAwb(result.awbNumber);
      if (result.courier) {
        const known = COURIERS.some((c) => c.name === result.courier);
        setCourierChoice(known ? result.courier! : OTHER);
        if (!known) setCustomCourier(result.courier!);
      }
    });
  }

  function handleRefreshStatus() {
    setSrError(null);
    setSrNote(null);
    startSrTransition(async () => {
      const result = await syncShiprocketStatus(orderId);
      if (result.error) setSrError(result.error);
      else setSrNote(`Courier status: ${result.rawStatus ?? "unknown"}.`);
    });
  }

  return (
    <div className="space-y-4 border border-line bg-card p-5">
      <h3 className="font-display text-lg text-ivory">Shipping / Tracking</h3>

      {shiprocketEnabled && (
        <div className="space-y-3 border border-line/60 bg-ink/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
              Shiprocket
            </p>
            {shiprocketStatus && (
              <span className="text-xs text-muted">{shiprocketStatus}</span>
            )}
          </div>

          {alreadyBooked ? (
            <p className="text-xs leading-relaxed text-muted">
              Already booked — AWB{" "}
              <span className="text-ivory">{initialAwb}</span>. Cancel the
              shipment in Shiprocket before booking again.
            </p>
          ) : (
            <p className="text-xs leading-relaxed text-muted">
              Creates the shipment, books a courier and emails the customer —
              in one step.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant={alreadyBooked ? "ghost" : "primary"}
              size="sm"
              onClick={handleShipNow}
              disabled={srPending || pending || alreadyBooked || status === "cancelled"}
            >
              {srPending ? "Working…" : "Ship with Shiprocket"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRefreshStatus}
              disabled={srPending || pending || !alreadyBooked}
            >
              Refresh status
            </Button>
          </div>

          {shiprocketSyncedAt && (
            <p className="text-[11px] text-muted">
              Last synced {new Date(shiprocketSyncedAt).toLocaleString("en-IN")}
            </p>
          )}
          {srNote && <p className="text-xs text-success">{srNote}</p>}
          {srError && <p className="text-xs text-danger">{srError}</p>}
        </div>
      )}

      <Select
        label="Courier"
        value={courierChoice}
        disabled={pending}
        onChange={(e) => {
          setCourierChoice(e.target.value);
          suggestUrl(e.target.value, awb);
        }}
        options={COURIERS.map((c) => ({ value: c.name, label: c.name }))}
      />
      {courierChoice === OTHER && (
        <Input
          label="Courier name"
          value={customCourier}
          disabled={pending}
          onChange={(e) => setCustomCourier(e.target.value)}
          placeholder="e.g. Trackon"
        />
      )}
      <Input
        label="AWB number"
        value={awb}
        disabled={pending}
        onChange={(e) => {
          setAwb(e.target.value);
          suggestUrl(courierChoice, e.target.value);
        }}
        placeholder="e.g. 1234567890"
      />
      <Input
        label="Tracking URL"
        type="url"
        value={url}
        disabled={pending}
        onChange={(e) => {
          setUrlTouched(true);
          setUrl(e.target.value);
        }}
        placeholder="https://…"
      />

      {status !== "shipped" && (
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted">
          <input
            type="checkbox"
            checked={markShipped}
            disabled={pending}
            onChange={(e) => setMarkShipped(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-gold)]"
          />
          Mark order as shipped (emails the customer)
        </label>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={pending || !courier.trim() || !awb.trim()}
        >
          {pending ? "Saving…" : "Save Tracking"}
        </Button>
        {saved && !pending && (
          <span className="text-xs text-success">Tracking saved.</span>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
