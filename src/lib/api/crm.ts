"use client";

/** The CRM's reads (as hooks) and changes (as actions that toast the result and reload what changed). */
import { stageLabel, type LostReason } from "@/config/stages";
import { showToast } from "@/components/Toaster";
import { ApiError, api, unwrap, type DealStage, type Schemas } from "./client";
import { revalidate, useApi } from "./use-api";

export type Deal = Schemas["DealSummary"];
export type DealDetail = Schemas["DealDetail"];
export type QuoteVersion = Schemas["QuoteVersionOut"];
export type InboxItem = Schemas["InboxItemOut"];
export type TimelineEvent = Schemas["TimelineOut"];
export type StaffMember = Schemas["UserAdminOut"];
export type Approval = Schemas["ApprovalOut"];
export type QuoteDecision = Schemas["DecisionIn"]["decision"];

/** The guide asks to poll the inbox and the open deal while visible (there is no push in v1). */
const POLL_MS = 30_000;
const PAGE_SIZE = 100;
const MAX_DEAL_PAGES = 10;

const DEALS = "deals";
const INBOX = "inbox";
const dealKey = (id: string) => `deal:${id}`;

async function loadAllDeals(): Promise<Deal[]> {
  const deals: Deal[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_DEAL_PAGES; page++) {
    const result = unwrap(await api.GET("/v1/deals", { params: { query: { limit: PAGE_SIZE, cursor } } }));
    deals.push(...result.items);
    if (!result.next_cursor) break;
    cursor = result.next_cursor;
  }
  return deals;
}

const dealPath = (id: string) => ({ params: { path: { deal_id: id } } });

export const useDeals = () => useApi(DEALS, loadAllDeals);

export const useDeal = (id: string) => useApi(dealKey(id), async () => unwrap(await api.GET("/v1/deals/{deal_id}", dealPath(id))), POLL_MS);

export const useTimeline = (id: string) =>
  useApi(`${dealKey(id)}:timeline`, async () => unwrap(await api.GET("/v1/deals/{deal_id}/timeline", dealPath(id))).items, POLL_MS);

export const useQuotes = (id: string) => useApi(`${dealKey(id)}:quotes`, async () => unwrap(await api.GET("/v1/deals/{deal_id}/quotes", dealPath(id))));

export const useInbox = () => useApi(INBOX, async () => unwrap(await api.GET("/v1/inbox")), POLL_MS);

/** Staff names for owners and reassigning. Only manager, MD and admin may list them (null skips the call). */
export const useStaff = (canList: boolean) => useApi(canList ? "staff" : null, async () => unwrap(await api.GET("/v1/users")));

export const useOpenApprovals = (canList: boolean) =>
  useApi(canList ? "approvals" : null, async () => unwrap(await api.GET("/v1/approvals", { params: { query: { status: "open", limit: PAGE_SIZE } } })).items, POLL_MS);

/**
 * The open approval of a quote version: from the approvals list (manager, MD) or the person's inbox
 * (sales see theirs there, with the approval id as `ref_id`).
 */
export function findOpenApproval(version: QuoteVersion, dealId: string, approvals: Approval[] | undefined, inbox: InboxItem[] | undefined): { id: string; dueAt: string | null } | null {
  const approval = approvals?.find((item) => item.quote_version_id === version.id);
  if (approval) return { id: approval.id, dueAt: approval.deadline_at };
  const inboxItem = inbox?.find((item) => item.deal_id === dealId && item.kind.includes("approval"));
  return inboxItem ? { id: inboxItem.ref_id, dueAt: inboxItem.due_at } : null;
}

/** Runs a change, toasts the outcome and reloads the affected reads. A 409 (changed by someone else) reloads too. */
async function runAction<T>(call: () => Promise<T>, success: string, refresh: string[]): Promise<T | undefined> {
  try {
    const result = await call();
    showToast(success);
    revalidate(...refresh);
    return result;
  } catch (error) {
    showToast(error instanceof ApiError ? error.message : "Something went wrong");
    if (error instanceof ApiError && error.status === 409) revalidate(...refresh);
    return undefined;
  }
}

const afterDealChange = (id: string) => [DEALS, dealKey(id), INBOX];

/** PAYMENT and WON have their own steps in the API (§15); every other move goes through /stage. */
export function moveDeal(deal: Deal, to: DealStage, lost?: { reason: LostReason; note: string }) {
  return runAction(
    async () => {
      if (to === "PAYMENT") return unwrap(await api.POST("/v1/deals/{deal_id}/payments", { ...dealPath(deal.id), body: {} }));
      if (to === "WON") return unwrap(await api.POST("/v1/deals/{deal_id}/won", { ...dealPath(deal.id), body: {} }));
      const body = { to, expected_version: deal.version, lost_reason: lost?.reason, lost_note: lost?.note || null };
      return unwrap(await api.POST("/v1/deals/{deal_id}/stage", { ...dealPath(deal.id), body }));
    },
    `${deal.number} moved to ${stageLabel(to)}`,
    afterDealChange(deal.id),
  );
}

export function reopenDeal(deal: Deal, reason: string) {
  return runAction(async () => unwrap(await api.POST("/v1/deals/{deal_id}/reopen", { ...dealPath(deal.id), body: { reason } })), `${deal.number} reopened`, afterDealChange(deal.id));
}

export function setAiEnabled(deal: Deal, enabled: boolean) {
  return runAction(
    async () => unwrap(await api.POST("/v1/deals/{deal_id}/ai", { ...dealPath(deal.id), body: { enabled, reason: "human_takeover" } })),
    enabled ? "AI handed back the conversation" : "You took over from the AI",
    afterDealChange(deal.id),
  );
}

export function reassignDeal(deal: Deal, userId: string, name: string) {
  return runAction(async () => unwrap(await api.POST("/v1/deals/{deal_id}/reassign", { ...dealPath(deal.id), body: { user_id: userId } })), `${deal.number} reassigned to ${name}`, afterDealChange(deal.id));
}

export function requestQuote(dealId: string) {
  return runAction(async () => unwrap(await api.POST("/v1/deals/{deal_id}/quotes", dealPath(dealId))), "Quote requested", afterDealChange(dealId));
}

const DECISION_MESSAGE: Record<QuoteDecision, string> = {
  approve: "Quote approved",
  correct: "Correction requested",
  reject: "Quote rejected",
};

export function decideApproval(approvalId: string, dealId: string, decision: QuoteDecision, note: string) {
  return runAction(
    async () => unwrap(await api.POST("/v1/approvals/{approval_id}/decision", { params: { path: { approval_id: approvalId } }, body: { decision, note: note || null } })),
    DECISION_MESSAGE[decision],
    [...afterDealChange(dealId), "approvals"],
  );
}
