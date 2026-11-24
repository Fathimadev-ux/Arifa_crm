"use client";

import Link from "next/link";
import { useState } from "react";
import { type ChangeRequest, declineRequest, requestedChangesOf, resolveRequest, reviseForRequest, revisePrefillOf } from "@/lib/api/change-requests";
import { type QuoteVersion, useQuotes } from "@/lib/api/crm";
import { useQuoteVersion } from "@/lib/api/deal-work";
import { formatCount, formatDateTime, formatMoney, humanize } from "@/lib/format";
import { useStaffNames } from "@/hooks/useStaffNames";
import { FormCard, TextArea } from "@/components/forms";
import { QuoteEditForm } from "@/components/quote/QuoteEditForm";
import { Button, DetailList, enterDelay } from "@/components/ui";

type QuoteLine = QuoteVersion["lines"][number];

const CLOSED_STATUSES = ["resolved", "declined", "closed"];
/** A revision the backend accepts for Resolve ("an approved and sent version of this deal"). */
const LIVE_STATUSES = ["approved", "sent"];
const WAITING_STATUS = "pending_approval";

/** One requested change as "field: current → requested". The backend sends each as a small object. */
function describeField(field: Record<string, unknown>): { label: string; change: string } {
  const label = String(field.field ?? field.name ?? field.label ?? "Change");
  const current = field.current ?? field.from ?? field.old;
  const requested = field.requested ?? field.to ?? field.new;
  if (current !== undefined || requested !== undefined) return { label: humanize(label), change: `${current ?? "—"} → ${requested ?? "—"}` };
  const rest = Object.entries(field).filter(([key]) => !["field", "name", "label"].includes(key));
  return { label: humanize(label), change: rest.map(([key, value]) => `${humanize(key)}: ${String(value)}`).join(" · ") };
}

/**
 * Issue 4: what a resolved request ended with, from the quote version that resolved it (resolved_version_id):
 * quantity, unit price, total, delivery, the version (linked to the deal) and when it closed (closed_at, once sent).
 */
function RequestResult({ request }: { request: ChangeRequest }) {
  const { data: version } = useQuoteVersion(request.resolved_version_id);
  if (!version) return <div className="h-24 animate-pulse rounded-2xl bg-neutral-100" />;
  const perLine = (value: (line: QuoteLine) => string) => version.lines.map(value).join(" · ");
  return (
    <div className="rounded-2xl border border-neutral-200 p-4">
      <p className="mb-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">Result</p>
      <DetailList
        items={[
          ["Quantity", perLine((line) => `${formatCount(line.quantity)} ${line.unit}`)],
          ["Unit price", perLine((line) => formatMoney(line.unit_price, version.currency))],
          ["Total", formatMoney(version.total, version.currency)],
          ["Delivery", [version.delivery_time_text, version.delivery_place].filter(Boolean).join(" · ")],
          [
            "Quote",
            <Link key="quote" href={`/deals/${request.deal_id}`} className="underline hover:no-underline">
              Version {version.version_no}
            </Link>,
          ],
          ["Closed on", request.closed_at && formatDateTime(request.closed_at)],
        ]}
      />
    </div>
  );
}

type Mode = "VIEW" | "REVISE" | "DECLINE";

/** The §13.2 card: the buyer's words, what changes, and the actions (revise, decline, resolve). */
export function RequestCard({ request, dealNumber, index = 0 }: { request: ChangeRequest; dealNumber?: string; index?: number }) {
  const { nameOf } = useStaffNames();
  const [mode, setMode] = useState<Mode>("VIEW");
  const [reason, setReason] = useState("");
  const { data: quoteVersion } = useQuoteVersion(mode === "REVISE" ? request.quote_version_id : null);
  const { data: quotes } = useQuotes(request.deal_id);

  const isOpen = !CLOSED_STATUSES.includes(request.status);
  // The revision answering this request: a version newer than the one the buyer asked about. Approving a revision
  // made from this card closes the request by itself; Resolve is only the backup for an approved one that didn't.
  const askedAbout = quotes?.find((quote) => quote.id === request.quote_version_id);
  const newest = quotes?.[0];
  const revision = askedAbout && newest && newest.version_no > askedAbout.version_no ? newest : null;
  const canResolve = revision !== null && LIVE_STATUSES.includes(revision.status);
  const isWaitingForApproval = revision?.status === WAITING_STATUS;
  const hasResult = request.status === "resolved" && request.resolved_version_id !== null;
  const requestedQuantity = requestedChangesOf(request).quantity;
  // The quantity has its own row above; the other asked changes stay as "field: current → requested".
  const otherFields = requestedQuantity ? request.fields.filter((field) => !/quantity|qty/i.test(String(field.field ?? field.name ?? ""))) : request.fields;

  return (
    <article className="animate-enter lift panel space-y-4 p-5" style={enterDelay(index)}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">{humanize(request.type)}</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${isOpen ? "bg-black text-white" : "bg-neutral-100"}`}>{humanize(request.status)}</span>
            {request.escalated_at && <span className="rounded-full border border-black px-2.5 py-0.5 text-[11px] font-medium">Escalated</span>}
          </div>
          {dealNumber && (
            <Link href={`/deals/${request.deal_id}`} className="mt-0.5 inline-block text-xs text-neutral-500 hover:text-black hover:underline">
              {dealNumber}
            </Link>
          )}
        </div>
      </header>

      {/* The new quantity, on its own row so it isn't missed (issue 1). */}
      {requestedQuantity && (
        <p className="rounded-2xl border border-black px-4 py-3 text-sm">
          <span className="font-semibold">Requested quantity: {requestedQuantity.requested}</span>
          {requestedQuantity.current && <span className="text-neutral-500"> (was {requestedQuantity.current})</span>}
        </p>
      )}

      <blockquote className="rounded-2xl bg-black/[0.03] px-4 py-3 text-sm">
        “{request.buyer_text}”
        {request.buyer_text_en && request.buyer_text_en !== request.buyer_text && <p className="mt-1.5 text-xs text-neutral-500">{request.buyer_text_en}</p>}
      </blockquote>

      {otherFields.length > 0 && (
        <dl className="space-y-1.5">
          {otherFields.map((field, fieldIndex) => {
            const { label, change } = describeField(field);
            return (
              <div key={fieldIndex} className="flex flex-wrap justify-between gap-x-4 text-sm">
                <dt className="text-neutral-500">{label}</dt>
                <dd className="font-medium">{change}</dd>
              </div>
            );
          })}
        </dl>
      )}

      {request.ai_notes && <p className="text-xs text-neutral-500">AI: {request.ai_notes}</p>}
      {request.assigned_to && <p className="text-xs text-neutral-500">Handled by {nameOf(request.assigned_to)}</p>}
      {request.decline_reason && <p className="text-sm">Declined: {request.decline_reason}</p>}
      {/* Shown as soon as the backend sends closed_at (being added to ChangeRequestOut). */}
      {hasResult && <RequestResult request={request} />}
      {/* Declined (or closed without a quote): the reason above, and the close date once the backend sends closed_at. */}
      {!isOpen && !hasResult && request.closed_at && <p className="text-xs text-neutral-500">Closed on {formatDateTime(request.closed_at)}</p>}

      {isOpen && mode === "VIEW" && isWaitingForApproval && revision && (
        <p className="text-sm font-medium">Revision v{revision.version_no} waiting for approval. Approving it closes this request.</p>
      )}
      {isOpen && mode === "VIEW" && (
        <div className="flex flex-wrap gap-2">
          {request.quote_version_id && (
            <Button variant="secondary" onClick={() => setMode("REVISE")}>
              Revise quote
            </Button>
          )}
          <Button variant="secondary" onClick={() => setMode("DECLINE")}>
            Decline
          </Button>
          {canResolve && revision && <Button onClick={() => void resolveRequest(request, revision.id)}>Resolve with v{revision.version_no}</Button>}
        </div>
      )}

      {mode === "REVISE" &&
        (quoteVersion ? (
          <QuoteEditForm
            version={quoteVersion}
            title={`Revise version ${quoteVersion.version_no}`}
            prefill={revisePrefillOf(request)}
            onSubmit={(edits) => reviseForRequest(request, edits)}
            onCancel={() => setMode("VIEW")}
          />
        ) : (
          <div className="h-24 animate-pulse rounded-3xl bg-neutral-100" />
        ))}

      {mode === "DECLINE" && (
        <FormCard
          title="Decline request"
          submitLabel="Decline"
          canSubmit={reason.trim() !== ""}
          onSubmit={() => void declineRequest(request, reason.trim()).then((result) => result && setMode("VIEW"))}
          onCancel={() => setMode("VIEW")}
        >
          <TextArea label="Reason (the buyer is told)" autoFocus value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} />
        </FormCard>
      )}
    </article>
  );
}
