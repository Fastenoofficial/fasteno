import { Badge } from "@/components/ui/Badge";
import type { OrderStatus, PaymentStatus } from "@/lib/types";

const statusTones: Record<
  OrderStatus,
  "gold" | "muted" | "success" | "danger"
> = {
  pending: "muted",
  confirmed: "gold",
  shipped: "gold",
  delivered: "success",
  cancelled: "danger",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={statusTones[status] ?? "muted"}>{status}</Badge>;
}

const paymentTones: Record<
  PaymentStatus,
  "gold" | "muted" | "success" | "danger"
> = {
  pending: "muted",
  paid: "success",
  failed: "danger",
  refunded: "muted",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={paymentTones[status] ?? "muted"}>{status}</Badge>;
}
