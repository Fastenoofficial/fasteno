import type { Metadata } from "next";
import { DeliveryEstimate } from "@/components/product/DeliveryEstimate";
import { CartClient } from "./CartClient";

export const metadata: Metadata = {
  title: "Shopping Cart",
};

/** /cart — server shell so the (server-only) delivery estimate can be
 *  rendered and handed to the interactive client cart. */
export default function CartPage() {
  return <CartClient deliveryEstimate={<DeliveryEstimate />} />;
}
