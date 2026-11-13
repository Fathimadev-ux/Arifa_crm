"use client";

/** §13 change requests: the buyer asks to change a quote; staff start, revise, resolve or decline it within the SLA. */
import { api, unwrap, type Schemas } from "./client";
import { afterDealChange, runAction } from "./crm";
import type { QuoteEdits } from "./deal-work";
import { useApi } from "./use-api";

export type ChangeRequest = Schemas["ChangeRequestOut"];
export type RequestStatus = "open" | "closed";

const POLL_MS = 30_000;
const REQUESTS = "requests";
const crPath = (id: string) => ({ params: { path: { cr_id: id } } });

/** Open cards come oldest-due first; a salesperson only gets those of their own deals. */
export const useChangeRequests = (status: RequestStatus, dealId?: string) =>
  useApi(`${REQUESTS}:${status}:${dealId ?? "all"}`, async () => unwrap(await api.GET("/v1/change-requests", { params: { query: { status, deal_id: dealId } } })), POLL_MS);

const afterRequestChange = (request: ChangeRequest) => [REQUESTS, ...afterDealChange(request.deal_id), "approvals"];

export function startRequest(request: ChangeRequest) {
  return runAction(async () => unwrap(await api.POST("/v1/change-requests/{cr_id}/start", crPath(request.id))), "You're on it: the timer keeps running", afterRequestChange(request));
}

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
