"use client";

import { useState } from "react";
import type { QuoteVersion } from "@/lib/api/crm";
import { INCOTERMS, type QuoteEdits } from "@/lib/api/deal-work";
import { FormCard, INPUT, Select, TextArea, TextInput } from "@/components/forms";

const TERMS = ["delivery_time_text", "delivery_place", "payment_terms_text"] as const;
type Term = (typeof TERMS)[number];

const TERM_LABEL: Record<Term, string> = {
  delivery_time_text: "Delivery time",
  delivery_place: "Delivery place",
  payment_terms_text: "Payment terms",
};

/**
 * "Edit then approve" (§11.3) and "Revise quote" (§13.3): starts from a quote version and sends only what changed.
 * The backend prices and checks it; a price below the minimum goes to the manager first.
 */
export function QuoteEditForm({ version, title, onSubmit, onCancel }: { version: QuoteVersion; title: string; onSubmit: (edits: QuoteEdits) => Promise<unknown>; onCancel: () => void }) {
  const [lines, setLines] = useState(() => version.lines.map((line) => ({ lineNo: line.line_no, description: line.description, unitPrice: line.unit_price, quantity: line.quantity })));
  const [terms, setTerms] = useState<Record<Term, string>>(() => ({
    delivery_time_text: version.delivery_time_text ?? "",
    delivery_place: version.delivery_place ?? "",
    payment_terms_text: version.payment_terms_text ?? "",
  }));
  const [incoterm, setIncoterm] = useState(version.incoterm);
  const [note, setNote] = useState("");
  const [buyerNote, setBuyerNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const editLine = (lineNo: number, patch: Partial<{ unitPrice: string; quantity: string }>) => setLines((current) => current.map((line) => (line.lineNo === lineNo ? { ...line, ...patch } : line)));

  const buildEdits = (): QuoteEdits => {
    const changedLines = lines
      .map((line, index) => {
        const original = version.lines[index];
        const priceChanged = Number(line.unitPrice) !== Number(original.unit_price);
        const quantityChanged = Number(line.quantity) !== Number(original.quantity);
        return priceChanged || quantityChanged ? { line_no: line.lineNo, unit_price: priceChanged ? line.unitPrice : null, quantity: quantityChanged ? line.quantity : null } : null;
      })
      .filter((line) => line !== null);
    const edits: QuoteEdits = { lines: changedLines };
    for (const term of TERMS) if (terms[term] !== (version[term] ?? "")) edits[term] = terms[term] || null;
    if (incoterm !== version.incoterm) edits.incoterm = incoterm as QuoteEdits["incoterm"];
    if (note.trim()) edits.note = note.trim();
    if (buyerNote.trim()) edits.buyer_note = buyerNote.trim();
    return edits;
  };

  const edits = buildEdits();
  const hasChanges = (edits.lines?.length ?? 0) > 0 || Object.keys(edits).length > 1;
  const linesValid = lines.every((line) => Number(line.unitPrice) > 0 && Number(line.quantity) > 0);

  const submit = async () => {
    setIsSaving(true);
    const result = await onSubmit(edits);
    setIsSaving(false);
    if (result !== undefined) onCancel();
  };

  return (
    <FormCard title={title} submitLabel={isSaving ? "Sending…" : "Send for approval"} canSubmit={hasChanges && linesValid && !isSaving} onSubmit={() => void submit()} onCancel={onCancel}>
      <div className="space-y-2">
        {lines.map((line) => (
          <div key={line.lineNo} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_8rem_8rem]">
            <p className="truncate px-1 pb-2.5 text-sm">{line.description}</p>
            <label className="block">
              <span className="mb-1.5 block px-1 text-xs text-neutral-500">Quantity</span>
              <input type="number" min="1" step="any" value={line.quantity} onChange={(event) => editLine(line.lineNo, { quantity: event.target.value })} className={INPUT} />
            </label>
            <label className="block">
              <span className="mb-1.5 block px-1 text-xs text-neutral-500">Unit price ({version.currency})</span>
              <input type="number" min="0.01" step="any" value={line.unitPrice} onChange={(event) => editLine(line.lineNo, { unitPrice: event.target.value })} className={INPUT} />
            </label>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TERMS.map((term) => (
          <TextInput key={term} label={TERM_LABEL[term]} value={terms[term]} onChange={(event) => setTerms((current) => ({ ...current, [term]: event.target.value }))} maxLength={term === "payment_terms_text" ? 1000 : 300} />
        ))}
        <Select label="Incoterm" value={incoterm} onChange={(event) => setIncoterm(event.target.value)} options={INCOTERMS.map((value) => ({ value, label: value }))} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextArea label="Note for the approver (optional)" value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} />
        <TextArea label="Note to the buyer (optional)" value={buyerNote} onChange={(event) => setBuyerNote(event.target.value)} maxLength={500} />
      </div>
    </FormCard>
  );
}
