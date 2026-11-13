"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { type ManualQuote, createManualQuote } from "@/lib/api/deal-work";
import { FormCard, INPUT, TextArea, TextInput } from "@/components/forms";

interface LineDraft {
  key: number;
  description: string;
  quantity: string;
  unitPrice: string;
  unit: string;
}

let lineKey = 0;
const emptyLine = (description = "", quantity = ""): LineDraft => ({ key: ++lineKey, description, quantity, unitPrice: "", unit: "pcs" });

/** D8: a custom, printed or unpriced item priced by hand by the salesperson, then approved as usual. */
export function ManualQuoteForm({ dealId, currency, firstLine, onClose }: { dealId: string; currency: string; firstLine?: { description: string; quantity: string }; onClose: () => void }) {
  const [lines, setLines] = useState<LineDraft[]>(() => [emptyLine(firstLine?.description, firstLine?.quantity)]);
  const [deliveryTime, setDeliveryTime] = useState("");
  const [buyerNote, setBuyerNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const editLine = (key: number, patch: Partial<LineDraft>) => setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  const isValid = lines.every((line) => line.description.trim() && Number(line.quantity) > 0 && Number(line.unitPrice) > 0);

  const submit = async () => {
    const quote: ManualQuote = {
      lines: lines.map((line) => ({ description: line.description.trim(), quantity: line.quantity, unit_price: line.unitPrice, unit: line.unit.trim() || "pcs", product_id: null })),
      delivery_time_text: deliveryTime.trim() || null,
      buyer_note: buyerNote.trim() || null,
    };
    setIsSaving(true);
    const result = await createManualQuote(dealId, quote);
    setIsSaving(false);
    if (result) onClose();
  };

  return (
    <FormCard title="Manual quote" submitLabel={isSaving ? "Sending…" : "Send for approval"} canSubmit={isValid && !isSaving} onSubmit={() => void submit()} onCancel={onClose}>
      <div className="space-y-3">
        {lines.map((line) => (
          <div key={line.key} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_7rem_5rem_8rem_2.5rem]">
            <TextInput label="Item" className="col-span-2 sm:col-span-1" value={line.description} onChange={(event) => editLine(line.key, { description: event.target.value })} maxLength={500} required />
            <TextInput label="Quantity" type="number" min="1" step="any" value={line.quantity} onChange={(event) => editLine(line.key, { quantity: event.target.value })} required />
            <TextInput label="Unit" value={line.unit} onChange={(event) => editLine(line.key, { unit: event.target.value })} />
            <TextInput label={`Unit price (${currency})`} type="number" min="0.01" step="any" value={line.unitPrice} onChange={(event) => editLine(line.key, { unitPrice: event.target.value })} required />
            <button
              type="button"
              onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
              disabled={lines.length === 1}
              aria-label="Remove line"
              className={`${INPUT} press grid w-10 place-items-center px-0 text-neutral-500 hover:text-black disabled:opacity-40`}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setLines((current) => [...current, emptyLine()])} className="press flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-neutral-500 hover:bg-black/5 hover:text-black">
          <Plus className="size-3.5" /> Add line
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextInput label="Delivery time (optional)" value={deliveryTime} onChange={(event) => setDeliveryTime(event.target.value)} maxLength={300} />
        <TextArea label="Note to the buyer (optional)" value={buyerNote} onChange={(event) => setBuyerNote(event.target.value)} maxLength={500} />
      </div>
    </FormCard>
  );
}
