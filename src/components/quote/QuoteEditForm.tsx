"use client";

import { useState } from "react";
import type { QuotePrefill } from "@/lib/api/change-requests";
import type { QuoteVersion } from "@/lib/api/crm";
import { INCOTERMS, type QuoteEdits } from "@/lib/api/deal-work";
import { formatCount, formatMoney } from "@/lib/format";
import { FormCard, INPUT, Select, TextArea, TextInput } from "@/components/forms";

/** A box filled in from the buyer's request: marked so the salesperson sees what was taken from the request. */
const PREFILLED = "ring-2 ring-black";

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
 * Opened for a buyer's request, the requested quantity, unit price (first line) and delivery are filled in and marked.
 */
export function QuoteEditForm({
  version,
  title,
  prefill,
  onSubmit,
  onCancel,
}: {
  version: QuoteVersion;
  title: string;
  prefill?: QuotePrefill;
  onSubmit: (edits: QuoteEdits) => Promise<unknown>;
  onCancel: () => void;
}) {
  const firstLineNo = version.lines[0]?.line_no;
  const [lines, setLines] = useState(() =>
    version.lines.map((line) => {
      const isFirst = line.line_no === firstLineNo;
      return { lineNo: line.line_no, description: line.description, unitPrice: (isFirst && prefill?.unitPrice) || line.unit_price, quantity: (isFirst && prefill?.quantity) || line.quantity };
    }),
  );
  const [terms, setTerms] = useState<Record<Term, string>>(() => ({
    delivery_time_text: prefill?.delivery || version.delivery_time_text || "",
    delivery_place: version.delivery_place ?? "",
    payment_terms_text: version.payment_terms_text ?? "",
  }));
  const [incoterm, setIncoterm] = useState(version.incoterm);
  const [currency, setCurrency] = useState(version.currency);
  const [coverNote, setCoverNote] = useState(version.cover_note ?? "");
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
    if (currency !== version.currency) edits.currency = currency;
    if (coverNote !== (version.cover_note ?? "")) edits.cover_note = coverNote.trim() || null;
    if (note.trim()) edits.note = note.trim();
    if (buyerNote.trim()) edits.buyer_note = buyerNote.trim();
    return edits;
  };

  const edits = buildEdits();
  const hasChanges = (edits.lines?.length ?? 0) > 0 || Object.keys(edits).length > 1;
  const linesValid = lines.every((line) => Number(line.unitPrice) > 0 && Number(line.quantity) > 0) && /^[A-Z]{3}$/.test(currency);
  // Live totals as the salesperson types (the backend prices the final version; VAT at the quote's rate).
  const subtotal = lines.reduce((sum, line) => sum + Number(line.unitPrice) * Number(line.quantity), 0);
  const total = subtotal * (1 + Number(version.vat_rate) / 100);
  const isFirstPrefilled = (key: "quantity" | "unitPrice") => Boolean(prefill?.[key]);

  const submit = async () => {
    setIsSaving(true);
    const result = await onSubmit(edits);
    setIsSaving(false);
    if (result !== undefined) onCancel();
  };

  return (
    <FormCard title={title} submitLabel={isSaving ? "Sending…" : "Send for approval"} canSubmit={hasChanges && linesValid && !isSaving} onSubmit={() => void submit()} onCancel={onCancel}>
      {prefill && (prefill.quantity || prefill.unitPrice || prefill.delivery) && <p className="text-xs text-neutral-500">Filled in from the buyer&apos;s request (marked). Change them if needed.</p>}
      <div className="space-y-3">
        {lines.map((line, index) => {
          const original = version.lines[index];
          const isFirst = line.lineNo === firstLineNo;
          return (
            <div key={line.lineNo} className="space-y-1">
              <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_8rem_8rem_8rem]">
                <p className="truncate px-1 pb-2.5 text-sm">{line.description}</p>
                <label className="block">
                  <span className="mb-1.5 block px-1 text-xs text-neutral-500">Quantity</span>
                  <input type="number" min="1" step="any" value={line.quantity} onChange={(event) => editLine(line.lineNo, { quantity: event.target.value })} className={`${INPUT} ${isFirst && isFirstPrefilled("quantity") ? PREFILLED : ""}`} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block px-1 text-xs text-neutral-500">Unit price ({version.currency})</span>
                  <input type="number" min="0.01" step="any" value={line.unitPrice} onChange={(event) => editLine(line.lineNo, { unitPrice: event.target.value })} className={`${INPUT} ${isFirst && isFirstPrefilled("unitPrice") ? PREFILLED : ""}`} />
                </label>
                <p className="px-1 pb-2.5 text-right text-sm font-medium tabular-nums">{formatMoney(Number(line.unitPrice) * Number(line.quantity), version.currency)}</p>
              </div>
              <p className="px-1 text-xs text-neutral-500">
                Now {formatCount(original.quantity)} {original.unit} · {formatMoney(original.unit_price, version.currency)}
              </p>
            </div>
          );
        })}
        <p className="flex justify-between border-t border-dashed border-neutral-200 px-1 pt-2 text-sm">
          <span className="text-neutral-500">New total with VAT ({Number(version.vat_rate)}%)</span>
          <span className="font-semibold tabular-nums">{formatMoney(total, version.currency)}</span>
        </p>
        {!linesValid && <p className="px-1 text-sm font-medium">Quantity and unit price must be more than 0.</p>}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TERMS.map((term) => (
          <TextInput
            key={term}
            label={TERM_LABEL[term]}
            value={terms[term]}
            onChange={(event) => setTerms((current) => ({ ...current, [term]: event.target.value }))}
            maxLength={term === "payment_terms_text" ? 1000 : 300}
            className={term === "delivery_time_text" && prefill?.delivery ? "[&_input]:ring-2 [&_input]:ring-black" : undefined}
          />
        ))}
        <Select label="Incoterm" value={incoterm} onChange={(event) => setIncoterm(event.target.value)} options={INCOTERMS.map((value) => ({ value, label: value }))} />
        <TextInput label="Currency (3 letters)" value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3))} />
      </div>
      <TextArea label="Cover note on the quote (optional)" value={coverNote} onChange={(event) => setCoverNote(event.target.value)} maxLength={500} rows={2} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextArea label="Note for the approver (optional)" value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} />
        <TextArea label="Note to the buyer (optional)" value={buyerNote} onChange={(event) => setBuyerNote(event.target.value)} maxLength={500} />
      </div>
    </FormCard>
  );
}
