"use client";

import type { Order } from "@/lib/types";

/** Local order cache — localStorage key `fs-orders`.
 *  Demo mode: the only order store. Live mode: a courtesy cache so guests
 *  (whose orders RLS hides from anonymous reads) still see their
 *  confirmation page. */

const ORDERS_KEY = "fs-orders";
const MAX_ORDERS = 20;

export function readLocalOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Order[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalOrder(order: Order): void {
  try {
    const orders = [
      order,
      ...readLocalOrders().filter((o) => o.id !== order.id),
    ].slice(0, MAX_ORDERS);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch {
    // storage full / unavailable — confirmation still renders from state
  }
}

export function findLocalOrder(id: string): Order | null {
  return readLocalOrders().find((o) => o.id === id) ?? null;
}
