"use client";

import Link from "next/link";
import { useState } from "react";
import { type ChangeRequest, declineRequest, resolveRequest, reviseForRequest } from "@/lib/api/change-requests";
import { useQuoteVersion } from "@/lib/api/deal-work";
import { humanize } from "@/lib/format";
import { FormCard, TextArea } from "@/components/forms";
import { QuoteEditForm } from "@/components/quote/QuoteEditForm";
import { Button, enterDelay } from "@/components/ui";

const CLOSED_STATUSES = ["resolved", "declined", "closed"];

/** One requested change as "field: current → requested". The backend sends each as a small object. */
function describeField(field: Record<string, unknown>): { label: string; change: string } {
  const label = String(field.field ?? field.name ?? field.label ?? "Change");
  const current = field.current ?? field.from ?? field.old;
  const requested = field.requested ?? field.to ?? field.new;
  if (current !== undefined || requested !== undefined) return { label: humanize(label), change: `${current ?? "—"} → ${requested ?? "—"}` };
  const rest = Object.entries(field).filter(([key]) => !["field", "name", "label"].includes(key));
  return { label: humanize(label), change: rest.map(([key, value]) => `${humanize(key)}: ${String(value)}`).join(" · ") };
}

type Mode = "VIEW" | "REVISE" | "DECLINE";

/** The §13.2 card: the buyer's words, what changes, and the actions (revise, decline, resolve). */
export function RequestCard({ request, dealNumber, index = 0 }: { request: ChangeRequest; dealNumber?: string; index?: number }) {
  const [mode, setMode] = useState<Mode>("VIEW");
  const [reason, setReason] = useState("");
  const [revisedVersionId, setRevisedVersionId] = useState<string | null>(null);
  const { data: quoteVersion } = useQuoteVersion(mode === "REVISE" ? request.quote_version_id : null);

  const isOpen = !CLOSED_STATUSES.includes(request.status);
  const resolveVersionId = revisedVersionId ?? request.resolved_version_id ?? request.quote_version_id;

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

      <blockquote className="rounded-2xl bg-black/[0.03] px-4 py-3 text-sm">
        “{request.buyer_text}”
        {request.buyer_text_en && request.buyer_text_en !== request.buyer_text && <p className="mt-1.5 text-xs text-neutral-500">{request.buyer_text_en}</p>}
      </blockquote>

      {request.fields.length > 0 && (
        <dl className="space-y-1.5">
          {request.fields.map((field, fieldIndex) => {
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
      {request.decline_reason && <p className="text-sm">Declined: {request.decline_reason}</p>}

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
          {resolveVersionId && <Button onClick={() => void resolveRequest(request, resolveVersionId)}>Resolve</Button>}
        </div>
      )}

      {mode === "REVISE" &&
        (quoteVersion ? (
          <QuoteEditForm
            version={quoteVersion}
            title={`Revise version ${quoteVersion.version_no}`}
            onSubmit={async (edits) => {
              const revised = await reviseForRequest(request, edits);
              if (revised) setRevisedVersionId(revised.id);
              return revised;
            }}
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
