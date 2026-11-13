"use client";

import Link from "next/link";
import { useState } from "react";
import { can } from "@/config/roles";
import { useDeals } from "@/lib/api/crm";
import { type Order, type OrderStatus, updateOrderStatus } from "@/lib/api/deal-work";
import { useOrders } from "@/lib/api/records";
import { formatDate, humanize } from "@/lib/format";
import { useSession } from "@/store/session";
import { type Column, DataTable } from "@/components/DataTable";
import { ExportButtons } from "@/components/ExportButtons";
import { ErrorState, LoadingState, PageHeader, SegmentedControl } from "@/components/ui";

const FILTERS = [
  { id: "", label: "All" },
  { id: "in_production", label: "In production" },
  { id: "ready", label: "Ready" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
] as const;

/** §15.3: the step after each status. */
const NEXT_STATUS: Record<string, OrderStatus | undefined> = { in_production: "ready", ready: "shipped", shipped: "delivered" };

const latestDate = (order: Order) => order.delivered_on ?? order.shipped_on ?? order.ready_on ?? order.production_started_on;

/** §20.9 orders, newest first (a salesperson sees their own deals' orders). Manager / MD move them along. */
export function OrdersScreen() {
  const { role } = useSession();
  const [status, setStatus] = useState<string>("");
  const { data: orders, error } = useOrders(status);
  const { data: deals } = useDeals();
  const canUpdate = can(role, "UPDATE_ORDERS");

  const columns: Column<Order>[] = [
    { label: "Order", cell: (order) => order.number, sub: (order) => formatDate(order.created_at), width: "18%" },
    {
      label: "Deal",
      cell: (order) => (
        <Link href={`/deals/${order.deal_id}`} onClick={(event) => event.stopPropagation()} className="hover:underline">
          {deals?.find((deal) => deal.id === order.deal_id)?.number ?? "Open deal"}
        </Link>
      ),
      width: "18%",
    },
    { label: "Status", cell: (order) => humanize(order.status), sub: (order) => (latestDate(order) ? formatDate(latestDate(order)!) : undefined), width: "22%" },
    { label: "Tracking", cell: (order) => order.tracking_ref ?? "—", width: "20%" },
    {
      label: "",
      width: "22%",
      alignRight: true,
      cell: (order) => {
        const next = NEXT_STATUS[order.status];
        return canUpdate && next ? (
          <button
            onClick={(event) => {
              event.stopPropagation();
              // The tracking number is added on the deal page.
              void updateOrderStatus(order, next);
            }}
            className="press rounded-full bg-black px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
          >
            Mark {humanize(next).toLowerCase()}
          </button>
        ) : null;
      },
    },
  ];

  return (
    <>
      <PageHeader title="Orders">
        <ExportButtons entity="orders" />
      </PageHeader>
      <div className="mb-4 overflow-x-auto">
        <SegmentedControl options={FILTERS} value={status as (typeof FILTERS)[number]["id"]} onChange={setStatus} label="Status" />
      </div>
      {error && !orders ? <ErrorState message={error.message} /> : orders ? <DataTable rows={orders} columns={columns} rowKey={(order) => order.id} emptyText="No orders" /> : <LoadingState />}
    </>
  );
}
