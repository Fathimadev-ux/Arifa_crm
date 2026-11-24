"use client";

/** §13 change requests: the buyer asks to change a quote; staff start, revise, resolve or decline it within the SLA. */
import { api, unwrap, type Schemas } from "./client";
import { afterDealChange, runAction } from "./crm";
import type { QuoteEdits } from "./deal-work";
import { useNow } from "@/hooks/useNow";
import { useApi } from "./use-api";

/**
 * `closed_at` (when the request was resolved or declined) is not in the API yet; the backend team is adding it to
 * ChangeRequestOut. It is read here already, so it shows as soon as the backend sends it.
 */
export type ChangeRequest = Schemas["ChangeRequestOut"] & { closed_at?: string | null };
export type RequestStatus = "open" | "closed";

const POLL_MS = 30_000;
const REQUESTS = "requests";
/** How long a Pipeline card says "Request resolved" after the close (needs closed_at). */
const RESOLVED_BADGE_MS = 24 * 3_600_000;
const crPath = (id: string) => ({ params: { path: { cr_id: id } } });

/** Open cards come oldest-due first; a salesperson only gets those of their own deals. */
export const useChangeRequests = (status: RequestStatus, dealId?: string) =>
  useApi(
    `${REQUESTS}:${status}:${dealId ?? "all"}`,
    async () => unwrap(await api.GET("/v1/change-requests", { params: { query: { status, deal_id: dealId } } })) as ChangeRequest[],
    POLL_MS,
  );

/** One thing the buyer asked to change: the value now and the value asked for. */
export interface RequestedChange {
  current: string | null;
  requested: string;
}
export interface RequestedChanges {
  quantity?: RequestedChange;
  unitPrice?: RequestedChange;
  delivery?: RequestedChange;
}

const CHANGE_KINDS: [keyof RequestedChanges, RegExp][] = [
  ["quantity", /quantity|qty/i],
  ["unitPrice", /price/i],
  ["delivery", /deliver/i],
];

/**
 * What the buyer asked for, read from the request's `fields` ({field, current, requested}). ChangeRequestOut has no
 * typed quantity / price / delivery of its own (the team may add them), so the fields are read here.
 */
export function requestedChangesOf(request: ChangeRequest): RequestedChanges {
  const changes: RequestedChanges = {};
  for (const field of request.fields) {
    const name = String(field.field ?? field.name ?? field.label ?? "");
    const requested = field.requested ?? field.to ?? field.new;
    const current = field.current ?? field.from ?? field.old;
    const kind = CHANGE_KINDS.find(([, pattern]) => pattern.test(name))?.[0];
    if (kind && requested !== undefined && requested !== null && !changes[kind]) changes[kind] = { current: current === undefined || current === null ? null : String(current), requested: String(requested) };
  }
  return changes;
}

/** The number in a buyer's value, for a form box: "60,000 pcs" → "60000", "₹8.50" → "8.50"; "" when there is none. */
export const numberIn = (text: string) => text.replace(/,/g, "").match(/\d+(\.\d+)?/)?.[0] ?? "";

/** The Revise form's starting values from a request: the requested quantity, unit price and delivery. */
export function revisePrefillOf(request: ChangeRequest | undefined): QuotePrefill | undefined {
  if (!request) return undefined;
  const { quantity, unitPrice, delivery } = requestedChangesOf(request);
  return { quantity: quantity && numberIn(quantity.requested), unitPrice: unitPrice && numberIn(unitPrice.requested), delivery: delivery?.requested };
}

/** Starting values for the Revise form (empty ones keep the quote's own value). */
export interface QuotePrefill {
  quantity?: string;
  unitPrice?: string;
  delivery?: string;
}

/** Per deal, for the Pipeline cards: how many requests are open, and whether one was resolved lately. */
export interface DealRequests {
  open: number;
  isResolved: boolean;
}

export function useRequestsByDeal(): Map<string, DealRequests> {
  const { data: open } = useChangeRequests("open");
  const { data: closed } = useChangeRequests("closed");
  const now = useNow();
  // With closed_at, "Request resolved" shows for a day after the close; without it (today), until the deal closes.
  const isRecent = (request: ChangeRequest) => !request.closed_at || now === null || now - new Date(request.closed_at).getTime() < RESOLVED_BADGE_MS;
  const byDeal = new Map<string, DealRequests>();
  const entry = (dealId: string) => byDeal.get(dealId) ?? byDeal.set(dealId, { open: 0, isResolved: false }).get(dealId)!;
  open?.forEach((request) => entry(request.deal_id).open++);
  closed?.forEach((request) => request.status === "resolved" && isRecent(request) && (entry(request.deal_id).isResolved = true));
  return byDeal;
}

const afterRequestChange = (request: ChangeRequest) => [REQUESTS, ...afterDealChange(request.deal_id), "approvals"];

/** A new quote version with the edits; approving it resolves the card (§13.3-4). */
export function reviseForRequest(request: ChangeRequest, edits: QuoteEdits) {
  return runAction(async () => unwrap(await api.POST("/v1/change-requests/{cr_id}/revise", { ...crPath(request.id), body: edits })), "Revised quote sent for approval", afterRequestChange(request));
}

export function resolveRequest(request: ChangeRequest, versionId: string) {
  return runAction(async () => unwrap(await api.POST("/v1/change-requests/{cr_id}/resolve", { ...crPath(request.id), body: { version_id: versionId } })), "Request resolved", afterRequestChange(request));
}

/** The buyer is told the reason. */
export function declineRequest(request: ChangeRequest, reason: string) {
  return runAction(async () => unwrap(await api.POST("/v1/change-requests/{cr_id}/decline", { ...crPath(request.id), body: { reason } })), "Request declined", afterRequestChange(request));
}
