"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { type PriceTier, type Product, addPriceTier, editPriceTier, removePriceTier, usePriceTiers } from "@/lib/api/catalogue";
import { formatCount, formatDate, formatMoney } from "@/lib/format";
import { DatePicker, INPUT } from "@/components/forms";
import { Button } from "@/components/ui";

interface TierDraft {
  minQty: string;
  maxQty: string;
  listPrice: string;
  minPrice: string;
  /** Only when adding a tier (PriceTierIn.valid_from); empty = from now. */
  validFrom: string;
}

const EMPTY_DRAFT: TierDraft = { minQty: "", maxQty: "", listPrice: "", minPrice: "", validFrom: "" };
const draftOf = (tier: PriceTier): TierDraft => ({ minQty: tier.min_qty, maxQty: tier.max_qty ?? "", listPrice: tier.list_price, minPrice: tier.min_price ?? "", validFrom: "" });
/**
 * Only the API document's rules (PriceTierIn): From qty and List price required, every number above 0. How To qty
 * compares with From qty is left to the backend, whose refusal shows as a toast.
 */
const isAboveZero = (value: string) => Number(value) > 0;
const isValid = (draft: TierDraft) =>
  isAboveZero(draft.minQty) && isAboveZero(draft.listPrice) && (!draft.maxQty || isAboveZero(draft.maxQty)) && (!draft.minPrice || isAboveZero(draft.minPrice));

function TierInputs({ draft, isNew, onChange }: { draft: TierDraft; isNew: boolean; onChange: (draft: TierDraft) => void }) {
  const field = (key: keyof TierDraft, label: string) => (
    <input type="number" min="0" step="any" value={draft[key]} onChange={(event) => onChange({ ...draft, [key]: event.target.value })} placeholder={label} aria-label={label} className={INPUT} />
  );
  return (
    <>
      <td className="px-1 py-1.5">{field("minQty", "From qty")}</td>
      <td className="px-1 py-1.5">{field("maxQty", "To qty")}</td>
      <td className="px-1 py-1.5">{field("listPrice", "List price")}</td>
      <td className="space-y-1.5 px-1 py-1.5">
        {field("minPrice", "Minimum")}
        {isNew && <DatePicker value={draft.validFrom} onChange={(event) => onChange({ ...draft, validFrom: event.target.value })} aria-label="Valid from (empty = now)" title="Valid from (empty = now)" />}
      </td>
    </>
  );
}

/** §20.7 the quantity tiers of one product: list price and the minimum the AI may go to. Manager (MFA) edits. */
export function PriceTiers({ product, canEdit }: { product: Product; canEdit: boolean }) {
  const { data: tiers } = usePriceTiers(product.id);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TierDraft>(EMPTY_DRAFT);

  const startEdit = (id: string, next: TierDraft) => {
    setEditingId(id);
    setDraft(next);
  };
  const stopEdit = () => setEditingId(null);

  const save = async () => {
    const values = { min_qty: draft.minQty, max_qty: draft.maxQty || null, list_price: draft.listPrice, min_price: draft.minPrice || null };
    const tier = tiers?.find((item) => item.id === editingId);
    const result = tier ? await editPriceTier(tier, values) : await addPriceTier(product, { ...values, valid_from: draft.validFrom ? new Date(`${draft.validFrom}T00:00:00`).toISOString() : null });
    if (result) stopEdit();
  };

  if (!tiers) return <div className="h-20 animate-pulse rounded-2xl bg-neutral-100" />;

  const editActions = (
    <td className="px-1 py-1.5 text-right whitespace-nowrap">
      <Button className="h-9 px-4" disabled={!isValid(draft)} onClick={() => void save()}>
        Save
      </Button>
      <button onClick={stopEdit} className="press ml-1 rounded-full px-3 py-2 text-xs text-neutral-500 hover:bg-black/5 hover:text-black">
        Cancel
      </button>
    </td>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] table-fixed text-sm">
        <thead>
          <tr className="text-left text-xs text-neutral-500">
            <th className="px-2 py-2 font-medium">From qty</th>
            <th className="px-2 py-2 font-medium">To qty</th>
            <th className="px-2 py-2 font-medium">List price</th>
            <th className="px-2 py-2 font-medium">Minimum</th>
            <th className="w-40 px-2 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-dashed divide-neutral-200">
          {tiers.map((tier) =>
            editingId === tier.id ? (
              <tr key={tier.id}>
                <TierInputs draft={draft} isNew={false} onChange={setDraft} />
                {editActions}
              </tr>
            ) : (
              <tr key={tier.id} className="group">
                <td className="px-2 py-2.5 tabular-nums">{formatCount(tier.min_qty)}</td>
                <td className="px-2 py-2.5 tabular-nums">{tier.max_qty ? formatCount(tier.max_qty) : "and up"}</td>
                <td className="px-2 py-2.5 font-medium tabular-nums">{formatMoney(tier.list_price, tier.currency)}</td>
                <td className="px-2 py-2.5 tabular-nums">
                  {tier.min_price ? formatMoney(tier.min_price, tier.currency) : "—"}
                  <span className="block text-xs text-neutral-400">from {formatDate(tier.valid_from)}</span>
                </td>
                <td className="px-2 py-2.5 text-right">
                  {canEdit && (
                    <span className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <button onClick={() => startEdit(tier.id, draftOf(tier))} aria-label="Edit tier" className="press rounded-full p-2 hover:bg-black/5">
                        <Pencil className="size-3.5" />
                      </button>
                      <button onClick={() => void removePriceTier(tier)} aria-label="Remove tier" className="press rounded-full p-2 hover:bg-black/5">
                        <Trash2 className="size-3.5" />
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ),
          )}
          {editingId === "new" && (
            <tr>
              <TierInputs draft={draft} isNew onChange={setDraft} />
              {editActions}
            </tr>
          )}
        </tbody>
      </table>
      {tiers.length === 0 && editingId !== "new" && <p className="px-2 py-4 text-sm text-neutral-400">No price tiers yet</p>}
      {canEdit && editingId === null && (
        <button onClick={() => startEdit("new", EMPTY_DRAFT)} className="press mt-2 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-neutral-500 hover:bg-black/5 hover:text-black">
          <Plus className="size-3.5" /> Add tier
        </button>
      )}
    </div>
  );
}
