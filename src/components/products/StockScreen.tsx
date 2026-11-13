"use client";

import { useState } from "react";
import { can } from "@/config/roles";
import { type StockItem, setStock, useProducts, useStock } from "@/lib/api/catalogue";
import { formatCount, humanize } from "@/lib/format";
import { useSession } from "@/store/session";
import { type Column, DataTable } from "@/components/DataTable";
import { INPUT } from "@/components/forms";
import { Button, ErrorState, LoadingState, PageHeader } from "@/components/ui";

/** Quantity on hand, edited in place (manager / admin; every change is logged). */
function QuantityCell({ item, canEdit }: { item: StockItem; canEdit: boolean }) {
  const [draft, setDraft] = useState<string | null>(null);
  if (draft === null) {
    return (
      <span className="flex items-center justify-end gap-2">
        {formatCount(item.quantity)} {item.unit}
        {canEdit && (
          <button onClick={() => setDraft(item.quantity)} className="press rounded-full px-2.5 py-1 text-xs text-neutral-500 hover:bg-black/5 hover:text-black">
            Edit
          </button>
        )}
      </span>
    );
  }
  return (
    <form
      className="flex items-center justify-end gap-1"
      onSubmit={(event) => {
        event.preventDefault();
        void setStock(item, draft).then((result) => result && setDraft(null));
      }}
    >
      <input autoFocus type="number" min="0" step="any" value={draft} onChange={(event) => setDraft(event.target.value)} aria-label="Quantity on hand" className={`${INPUT} h-9 w-32`} />
      <Button type="submit" className="h-9 px-4" disabled={draft === "" || Number(draft) < 0}>
        Save
      </Button>
      <button type="button" onClick={() => setDraft(null)} className="press rounded-full px-2.5 py-1 text-xs text-neutral-500 hover:bg-black/5">
        Cancel
      </button>
    </form>
  );
}

/** §20.8 stock table: quantity on hand per product or material. */
export function StockScreen() {
  const { role } = useSession();
  const { data: stock, error } = useStock();
  const { data: products } = useProducts();
  const canEdit = can(role, "SET_STOCK");
  const nameOf = (item: StockItem) => products?.find((product) => product.id === item.product_id)?.name ?? item.material_code ?? "—";

  const columns: Column<StockItem>[] = [
    { label: "Item", cell: (item) => nameOf(item), sub: (item) => humanize(item.item_type), width: "40%" },
    { label: "Reserved", cell: (item) => `${formatCount(item.reserved_quantity)} ${item.unit}`, width: "20%", alignRight: true },
    { label: "On hand", cell: (item) => <QuantityCell item={item} canEdit={canEdit} />, width: "40%", alignRight: true },
  ];

  return (
    <>
      <PageHeader title="Stock" subtitle={stock ? `${stock.length} items` : undefined} />
      {error && !stock ? <ErrorState message={error.message} /> : stock ? <DataTable rows={stock} columns={columns} rowKey={(item) => item.id} minWidth={560} emptyText="No stock yet" /> : <LoadingState />}
    </>
  );
}
