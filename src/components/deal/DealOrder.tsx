"use client";

import { useState } from "react";
import { can } from "@/config/roles";
import type { DealDetail } from "@/lib/api/crm";
import { type OrderStatus, updateOrderStatus, useDealOrder } from "@/lib/api/deal-work";
import { formatDate, humanize } from "@/lib/format";
import { useSession } from "@/store/session";
import { INPUT } from "@/components/forms";
import { Button, DetailList, Section } from "@/components/ui";

/** The step after each order status (§15.3): in production → ready → shipped → delivered. */
const NEXT_STATUS: Record<string, OrderStatus | undefined> = {
  in_production: "ready",
  ready: "shipped",
  shipped: "delivered",
};

/** The order a WON deal created, and (manager / MD) moving it along. The buyer is told if configured. */
export function DealOrder({ deal }: { deal: DealDetail }) {
  const { role } = useSession();
  const { data: order } = useDealOrder(deal.id, deal.stage === "WON");
  const [trackingRef, setTrackingRef] = useState("");

  if (!order) return null;
  const nextStatus = NEXT_STATUS[order.status];
  const canUpdate = can(role, "UPDATE_ORDERS") && nextStatus;

  return (
    <Section title={`Order ${order.number}`} index={5}>
      <DetailList
        items={[
          ["Status", humanize(order.status)],
          ["Production started", order.production_started_on && formatDate(order.production_started_on)],
          ["Ready", order.ready_on && formatDate(order.ready_on)],
          ["Shipped", order.shipped_on && formatDate(order.shipped_on)],
          ["Delivered", order.delivered_on && formatDate(order.delivered_on)],
          ["Tracking", order.tracking_ref],
        ]}
      />
      {canUpdate && (
        <form
          className="mt-5 flex flex-wrap items-center gap-2 border-t border-dashed border-neutral-200 pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            void updateOrderStatus(order, nextStatus, trackingRef.trim()).then(() => setTrackingRef(""));
          }}
        >
          {nextStatus === "shipped" && (
            <input value={trackingRef} onChange={(event) => setTrackingRef(event.target.value)} placeholder="Tracking number (optional)" aria-label="Tracking number" className={`${INPUT} w-56`} />
          )}
          <Button type="submit">Mark {humanize(nextStatus).toLowerCase()}</Button>
        </form>
      )}
    </Section>
  );
}
