"use client";

import { useState } from "react";
import { can } from "@/config/roles";
import { isClosedStage } from "@/config/stages";
import { type DealDetail, type QuoteDecision, type QuoteVersion, decideApproval, findOpenApproval, requestQuote, useInbox, useOpenApprovals, useQuotes } from "@/lib/api/crm";
import { reviseQuote } from "@/lib/api/deal-work";
import { formatCount, formatDate, formatMoney, formatRelative, humanize } from "@/lib/format";
import { useNow } from "@/hooks/useNow";
import { useSession } from "@/store/session";
import { ManualQuoteForm } from "@/components/quote/ManualQuoteForm";
import { QuoteCompare } from "@/components/quote/QuoteCompare";
import { QuoteEditForm } from "@/components/quote/QuoteEditForm";
import { Button, DetailList, Section } from "@/components/ui";

type Mode = "VIEW" | "REVISE" | "MANUAL";

/** Approve, ask for a correction or reject, with an optional note. The backend checks MFA and whose deal it is. */
function ApprovalActions({ approval, dealId }: { approval: { id: string; dueAt: string | null }; dealId: string }) {
  const now = useNow();
  const [note, setNote] = useState("");
  const isOverdue = now !== null && approval.dueAt !== null && new Date(approval.dueAt).getTime() < now;

  const decide = (decision: QuoteDecision) => void decideApproval(approval.id, dealId, decision, note.trim()).then(() => setNote(""));

  return (
    <div className="mt-5 space-y-3 border-t border-dashed border-neutral-200 pt-4">
      {approval.dueAt && now !== null && (
        <p className={`text-sm ${isOverdue ? "font-semibold" : "text-neutral-600"}`}>{isOverdue ? `Approval overdue · due ${formatRelative(approval.dueAt, now)}` : `Approve ${formatRelative(approval.dueAt, now)}`}</p>
      )}
      <input
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Note (optional)"
        className="h-10 w-full rounded-full border border-neutral-200 bg-white px-4 text-sm transition-[border-color,box-shadow] outline-none hover:border-neutral-400 focus:shadow-md placeholder:text-neutral-400 focus:border-black"
      />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => decide("approve")}>Approve</Button>
        <Button variant="secondary" onClick={() => decide("correct")}>
          Ask for correction
        </Button>
        <Button variant="secondary" onClick={() => decide("reject")}>
          Reject
        </Button>
      </div>
    </div>
  );
}

function QuoteLines({ quote }: { quote: QuoteVersion }) {
  if (quote.lines.length === 0) return null;
  return (
    <div className="mb-5 overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="text-left text-xs text-neutral-500">
            <th className="py-2 pr-3 font-medium">Item</th>
            <th className="py-2 pr-3 text-right font-medium">Qty</th>
            <th className="py-2 pr-3 text-right font-medium">Unit price</th>
            <th className="py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dashed divide-neutral-200">
          {quote.lines.map((line) => (
            <tr key={line.line_no}>
              <td className="py-2.5 pr-3">{line.description}</td>
              <td className="py-2.5 pr-3 text-right tabular-nums">
                {formatCount(line.quantity)} {line.unit}
              </td>
              <td className="py-2.5 pr-3 text-right tabular-nums">{formatMoney(line.unit_price, quote.currency)}</td>
              <td className="py-2.5 text-right font-medium tabular-nums">{formatMoney(line.line_total, quote.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The newest quote version (the backend builds every price) and the earlier versions under it. */
export function QuotePanel({ deal }: { deal: DealDetail }) {
  const { role } = useSession();
  const { data: quotes } = useQuotes(deal.id);
  const { data: approvals } = useOpenApprovals(can(role, "LIST_APPROVALS"));
  const { data: inbox } = useInbox();
  const [mode, setMode] = useState<Mode>("VIEW");
  const [compareId, setCompareId] = useState<string | null>(null);
  const canQuote = !isClosedStage(deal.stage);
  const requirement = deal.requirements[0];
  const manualForm = (
    <ManualQuoteForm
      dealId={deal.id}
      currency={deal.currency}
      firstLine={requirement ? { description: requirement.product_text ?? "", quantity: requirement.quantity ?? "" } : undefined}
      onClose={() => setMode("VIEW")}
    />
  );

  if (!quotes) {
    return (
      <Section title="Quote">
        <div className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
      </Section>
    );
  }

  const [currentQuote, ...olderQuotes] = quotes;
  if (!currentQuote) {
    return (
      <Section title="Quote">
        {mode === "MANUAL" ? (
          manualForm
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-neutral-500">No quote yet.</p>
            {canQuote && (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setMode("MANUAL")}>
                  Manual quote
                </Button>
                <Button onClick={() => void requestQuote(deal.id)}>Request quote</Button>
              </div>
            )}
          </div>
        )}
      </Section>
    );
  }

  const openApproval = can(role, "APPROVE_QUOTES") ? findOpenApproval(currentQuote, deal.id, approvals, inbox) : null;
  const comparedQuote = olderQuotes.find((quote) => quote.id === compareId);

  return (
    <Section title="Quote">
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm font-medium">
          Version {currentQuote.version_no} <span className="text-neutral-400">· {humanize(currentQuote.kind)}</span>
        </p>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${openApproval ? "bg-black text-white" : "bg-neutral-100"}`}>{humanize(currentQuote.status)}</span>
      </div>

      <QuoteLines quote={currentQuote} />

      <DetailList
        items={[
          ["Subtotal", formatMoney(currentQuote.subtotal, currentQuote.currency)],
          ["VAT", `${formatMoney(currentQuote.vat_amount, currentQuote.currency)} · ${Number(currentQuote.vat_rate)}%`],
          ["Total", <span key="total" className="font-semibold">{formatMoney(currentQuote.total, currentQuote.currency)}</span>],
          ["Total in AED", currentQuote.currency !== "AED" && formatMoney(currentQuote.total_aed)],
          ["Incoterm", currentQuote.incoterm],
          ["Valid until", currentQuote.valid_until && formatDate(currentQuote.valid_until)],
          ["Delivery", [currentQuote.delivery_time_text, currentQuote.delivery_place].filter(Boolean).join(" · ")],
          ["Payment terms", currentQuote.payment_terms_text],
        ]}
      />

      {(currentQuote.approver_summary || currentQuote.change_summary) && (
        <p className="mt-4 text-sm text-neutral-600">{currentQuote.change_summary ?? currentQuote.approver_summary}</p>
      )}

      {openApproval && mode === "VIEW" && <ApprovalActions approval={openApproval} dealId={deal.id} />}

      {canQuote && mode === "VIEW" && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setMode("REVISE")}>
            Revise
          </Button>
          <Button variant="secondary" onClick={() => setMode("MANUAL")}>
            Manual quote
          </Button>
        </div>
      )}
      {mode === "REVISE" && (
        <div className="mt-5">
          <QuoteEditForm version={currentQuote} title={`Revise version ${currentQuote.version_no}`} onSubmit={(edits) => reviseQuote(deal.id, edits)} onCancel={() => setMode("VIEW")} />
        </div>
      )}
      {mode === "MANUAL" && <div className="mt-5">{manualForm}</div>}

      {olderQuotes.length > 0 && (
        <ul className="mt-5 space-y-1 border-t border-dashed border-neutral-200 pt-4 text-xs text-neutral-500">
          {olderQuotes.map((quote) => (
            <li key={quote.id}>
              <button
                onClick={() => setCompareId(compareId === quote.id ? null : quote.id)}
                aria-pressed={compareId === quote.id}
                className={`-mx-2 flex w-[calc(100%+1rem)] justify-between rounded-full px-2 py-1 text-left transition-colors hover:bg-black/[0.04] hover:text-black ${compareId === quote.id ? "bg-black/[0.06] text-black" : ""}`}
              >
                <span>
                  v{quote.version_no} · {formatMoney(quote.total, quote.currency)}
                </span>
                <span>{humanize(quote.status)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {comparedQuote && <QuoteCompare older={comparedQuote} newer={currentQuote} onClose={() => setCompareId(null)} />}
    </Section>
  );
}
