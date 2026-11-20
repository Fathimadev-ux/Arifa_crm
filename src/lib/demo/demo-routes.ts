/** What the sample backend answers, endpoint by endpoint (CRM_API.md), using the state in demo-store.ts. */
import type { DealStage } from "@/lib/api/client";
import { DEMO_STAFF, demoId, demoUserForEmail } from "./demo-data";
import {
  type Body,
  type ChangeRequest,
  type DealDetail,
  type QuoteEdits,
  type StaffMember,
  addQuoteVersion,
  applyEdits,
  canSee,
  changeDeal,
  changeRequestsFor,
  currentUser,
  dealById,
  dealNumberOf,
  dealOfApproval,
  empty,
  findVersion,
  getState,
  inboxItems,
  json,
  nowIso,
  problem,
  setCurrentUser,
  summaryOf,
  tokens,
  words,
} from "./demo-store";

const HOUR = 3_600_000;
const STAGE_FLOW: DealStage[] = ["NEW", "QUALIFIED", "QUOTATION", "NEGOTIATION", "READY_TO_CLOSE", "PAYMENT", "WON"];

export type Handler = (params: string[], body: Body, query: URLSearchParams) => Response;

/** Who typed the password; becomes the signed-in user once the code step passes. */
let loggingInUser: StaffMember | null = null;
let nextReference = 1;

function withDeal(handle: (deal: DealDetail, body: Body) => Response): Handler {
  return ([id], body) => {
    const deal = dealById(id);
    return canSee(deal) ? handle(deal, body) : problem(404, "Deal not found");
  };
}

function withRequest(handle: (request: ChangeRequest, deal: DealDetail, body: Body) => Response): Handler {
  return ([id], body) => {
    const request = getState().changeRequests.find((item) => item.id === id);
    const deal = request && dealById(request.deal_id);
    return request && canSee(deal) ? handle(request, deal, body) : problem(404, "Request not found");
  };
}

/** A new version from the edits to `previous` (a deal revision or a change request's). */
function revise(deal: DealDetail, previousId: string | null, edits: Body, summary: string) {
  const previous = (previousId && findVersion(previousId)) || getState().quotes[deal.id][0];
  if (!previous) return problem(422, "There is no quote to revise yet");
  const version = addQuoteVersion(deal, applyEdits(previous, edits as QuoteEdits));
  changeDeal(deal, {}, `${summary}: v${version.version_no} waiting for approval`);
  return json(version, 201);
}

const AUTH_ROUTES: [string, RegExp, Handler][] = [
  ["POST", /^\/v1\/auth\/login$/, (_, body) => {
    loggingInUser = demoUserForEmail(String(body.email ?? ""));
    return json({ challenge_token: "demo-challenge-token", methods: ["totp", "email"], totp_enrolled: true, expires_at: new Date(Date.now() + 5 * 60_000).toISOString() });
  }],
  ["POST", /^\/v1\/auth\/mfa\/(totp|email\/verify)$/, () => {
    const user = loggingInUser ?? demoUserForEmail("");
    setCurrentUser(user);
    return json(tokens(user));
  }],
  ["POST", /^\/v1\/auth\/mfa\/email\/send$/, () => empty()],
  ["POST", /^\/v1\/auth\/refresh$/, () => {
    const user = currentUser();
    return user ? json(tokens(user)) : problem(401, "Signed out");
  }],
  ["POST", /^\/v1\/auth\/logout$/, () => (setCurrentUser(null), empty())],
  ["GET", /^\/v1\/auth\/me$/, () => {
    const user = currentUser();
    return user ? json(user) : problem(401, "Signed out");
  }],
  ["POST", /^\/v1\/auth\/password(\/reset\/finish)?$/, () => empty()],
  ["POST", /^\/v1\/auth\/password\/reset\/start$/, () => json({}, 202)],
];

const DEAL_ROUTES: [string, RegExp, Handler][] = [
  ["GET", /^\/v1\/inbox$/, () => json(inboxItems())],
  ["GET", /^\/v1\/approvals$/, () => json({ items: getState().approvals.filter((approval) => approval.status === "open" && canSee(dealOfApproval(approval))), next_cursor: null })],
  ["GET", /^\/v1\/deals$/, () => json({ items: getState().deals.filter(canSee).map(summaryOf), next_cursor: null })],
  ["GET", /^\/v1\/deals\/([^/]+)$/, withDeal((deal) => json(deal))],
  ["GET", /^\/v1\/deals\/([^/]+)\/timeline$/, withDeal((deal) => json({ items: getState().timeline[deal.id], next_cursor: null }))],
  ["GET", /^\/v1\/deals\/([^/]+)\/quotes$/, withDeal((deal) => json(getState().quotes[deal.id]))],

  ["POST", /^\/v1\/deals\/([^/]+)\/stage$/, withDeal((deal, body) => {
    const to = body.to as DealStage;
    if (body.expected_version !== deal.version) return problem(409, "Someone else changed this deal. It has been reloaded.");
    if (to === "LOST") {
      if (!body.lost_reason) return problem(422, "A lost deal needs a reason");
      getState().lostFrom[deal.id] = deal.stage;
      changeDeal(deal, { stage: "LOST", lost_reason: body.lost_reason as string, lost_note: (body.lost_note as string) ?? null, ai_enabled: false, ai_paused_reason: null, next_action_at: null }, `Marked lost: ${words(String(body.lost_reason)).toLowerCase()}`);
    } else {
      if (STAGE_FLOW.indexOf(to) !== STAGE_FLOW.indexOf(deal.stage) + 1) return problem(422, "Deals move one stage at a time");
      changeDeal(deal, { stage: to }, `Moved to ${words(to).toLowerCase()}`);
    }
    return json(deal);
  })],
  ["POST", /^\/v1\/deals\/([^/]+)\/payments$/, withDeal((deal, body) => {
    const amount = body.amount ? ` · ${body.currency} ${body.amount}` : "";
    changeDeal(deal, { stage: "PAYMENT" }, `Advance payment confirmed${amount}`);
    return json({ id: `${deal.id}-p${nextReference++}`, deal_id: deal.id, amount: body.amount ?? null, currency: body.currency ?? null, method: body.method ?? null, reference: body.reference ?? null, paid_on: body.paid_on ?? null }, 201);
  })],
  ["POST", /^\/v1\/deals\/([^/]+)\/won$/, withDeal((deal, body) => {
    changeDeal(deal, { stage: "WON", ai_enabled: false, ai_paused_reason: null, next_action_at: null }, "Marked won");
    const order = {
      id: demoId("deal", dealNumberOf(deal), 9), number: `O-${dealNumberOf(deal)}`, deal_id: deal.id, status: "in_production", production_started_on: nowIso().slice(0, 10),
      ready_on: null, shipped_on: null, delivered_on: null, tracking_ref: null, created_at: nowIso(),
    };
    getState().orders.push(order);
    return json({ ...order, final_quote_version_id: getState().quotes[deal.id][0]?.id ?? deal.id, expected_reorder_date: (body.expected_reorder_date as string) ?? null }, 201);
  })],
  ["POST", /^\/v1\/deals\/([^/]+)\/reopen$/, withDeal((deal, body) => {
    changeDeal(deal, { stage: getState().lostFrom[deal.id] ?? "QUALIFIED", lost_reason: null, lost_note: null, ai_enabled: false, ai_paused_reason: "human_takeover" }, `Reopened: ${body.reason}`);
    return json(deal);
  })],
  ["POST", /^\/v1\/deals\/([^/]+)\/ai$/, withDeal((deal, body) => {
    const enabled = Boolean(body.enabled);
    changeDeal(deal, { ai_enabled: enabled, ai_paused_reason: enabled ? null : "human_takeover" }, enabled ? "Handed the conversation back to the AI" : "Took over from the AI");
    return json(deal);
  })],
  ["POST", /^\/v1\/deals\/([^/]+)\/reassign$/, withDeal((deal, body) => {
    const member = DEMO_STAFF.find((item) => item.id === body.user_id);
    if (!member) return problem(422, "Unknown salesperson");
    changeDeal(deal, { owner_user_id: member.id }, `Reassigned to ${member.full_name}`);
    return json(deal);
  })],
  ["POST", /^\/v1\/deals\/([^/]+)\/offer$/, withDeal((deal, body) => {
    const resumeAi = body.resume_ai !== false;
    changeDeal(deal, resumeAi ? { ai_enabled: true, ai_paused_reason: null } : {}, `Special price approved: ${deal.currency} ${body.unit_price} per unit${resumeAi ? "; handed back to the AI" : ""}`);
    return empty();
  })],
  ["POST", /^\/v1\/deals\/([^/]+)\/personal-contact-shared$/, withDeal((deal) => {
    changeDeal(deal, { personal_contact_shared_at: nowIso() }, "Shared a personal contact with the buyer");
    return json(deal);
  })],
  ["POST", /^\/v1\/deals\/([^/]+)\/takeover$/, withDeal((deal) => {
    changeDeal(deal, { taken_over_by: currentUser()?.id ?? null }, "Took the deal over");
    return json(deal);
  })],
  ["POST", /^\/v1\/deals\/([^/]+)\/handback$/, withDeal((deal) => {
    changeDeal(deal, { taken_over_by: null }, "Handed the deal back");
    return json(deal);
  })],
];

const QUOTE_ROUTES: [string, RegExp, Handler][] = [
  ["GET", /^\/v1\/quote-versions\/([^/]+)$/, ([id]) => {
    const version = findVersion(id);
    return version ? json(version) : problem(404, "Quote version not found");
  }],
  ["POST", /^\/v1\/deals\/([^/]+)\/quotes$/, withDeal((deal) => {
    const version = addQuoteVersion(deal);
    changeDeal(deal, {}, `Built quote v${version.version_no} from the price list, waiting for approval`, "ai");
    return json(version, 201);
  })],
  ["POST", /^\/v1\/deals\/([^/]+)\/quotes\/revise$/, withDeal((deal, body) => revise(deal, null, body, "Revised the quote"))],
  ["POST", /^\/v1\/deals\/([^/]+)\/quotes\/manual$/, withDeal((deal, body) => {
    const lines = (body.lines as Body[]).map((line) => ({ description: String(line.description), quantity: Number(line.quantity), unitPrice: Number(line.unit_price), unit: String(line.unit ?? "pcs") }));
    const version = addQuoteVersion(deal, { lines, kind: "manual", terms: { delivery_time_text: (body.delivery_time_text as string) ?? null } });
    changeDeal(deal, {}, `Priced a manual quote: v${version.version_no} waiting for approval`);
    return json(version, 201);
  })],
  ["POST", /^\/v1\/approvals\/([^/]+)\/decision$/, ([id], body) => {
    const approval = getState().approvals.find((item) => item.id === id && item.status === "open");
    if (!approval) return problem(404, "This approval is already decided");
    const deal = dealOfApproval(approval);
    const version = findVersion(approval.quote_version_id)!;
    const decision = body.decision as "approve" | "reject" | "correct";
    Object.assign(approval, { status: { approve: "approved", reject: "rejected", correct: "corrected" }[decision], decided_by: currentUser()?.id ?? null, decided_at: nowIso(), decision_note: (body.note as string) ?? null });
    version.status = { approve: "sent", reject: "rejected", correct: "correction_requested" }[decision];
    changeDeal(deal, {}, `${{ approve: "Approved", reject: "Rejected", correct: "Asked for a correction on" }[decision]} quote v${version.version_no}${body.note ? `: ${body.note}` : ""}`);
    if (decision === "approve") changeDeal(deal, { next_action_at: new Date(Date.now() + 48 * HOUR).toISOString() }, `Sent quote v${version.version_no} to the buyer`, "ai");
    if (decision === "correct") changeDeal(deal, {}, `Built quote v${addQuoteVersion(deal).version_no}, waiting for approval`, "ai");
    return json(approval);
  }],
];

const REQUEST_ROUTES: [string, RegExp, Handler][] = [
  ["GET", /^\/v1\/change-requests$/, (_, __, query) => json(changeRequestsFor(query.get("status") ?? "open", query.get("deal_id")))],
  ["POST", /^\/v1\/change-requests\/([^/]+)\/revise$/, withRequest((request, deal, body) => revise(deal, request.quote_version_id, body, "Revised the quote for the change request"))],
  ["POST", /^\/v1\/change-requests\/([^/]+)\/resolve$/, withRequest((request, deal, body) => {
    Object.assign(request, { status: "resolved", resolved_version_id: String(body.version_id) });
    changeDeal(deal, {}, "Resolved the change request");
    return json(request);
  })],
  ["POST", /^\/v1\/change-requests\/([^/]+)\/decline$/, withRequest((request, deal, body) => {
    Object.assign(request, { status: "declined", decline_reason: String(body.reason) });
    changeDeal(deal, {}, `Declined the change request: ${body.reason}`);
    return json(request);
  })],
];

const BUYER_ROUTES: [string, RegExp, Handler][] = [
  ["POST", /^\/v1\/deals\/([^/]+)\/messages$/, withDeal((deal, body) => {
    if (deal.opted_out_at) return problem(422, "The buyer asked to stop: messages are blocked", { reason: "opt_out" });
    const channel = (body.channel as string) ?? "whatsapp";
    // Tiffin Express has been quiet for over a day, to show WhatsApp's closed 24-hour window.
    if (dealNumberOf(deal) === 1008 && channel === "whatsapp" && !body.reopen_template) return problem(422, "WhatsApp's 24-hour window has closed", { reason: "window_closed" });
    changeDeal(deal, { ai_enabled: false, ai_paused_reason: "human_takeover" }, body.reopen_template ? "Sent the re-open message" : String(body.text), "staff", channel);
    return json({ message_id: `${deal.id}-m${nextReference++}` }, 202);
  })],
  ["POST", /^\/v1\/deals\/([^/]+)\/call$/, withDeal((deal) => {
    if (deal.opted_out_at) return problem(422, "The buyer asked not to be called", { reason: "opt_out" });
    changeDeal(deal, {}, "Called the buyer from the company number", "staff", "phone");
    return json({ call_id: `${deal.id}-c${nextReference++}` }, 202);
  })],
  ["POST", /^\/v1\/deals\/([^/]+)\/opt-out$/, withDeal((deal, body) => {
    changeDeal(deal, { opted_out_at: nowIso(), ai_enabled: false, ai_paused_reason: "opt_out", next_action_at: null }, `Buyer asked to stop: “${body.words}”`);
    return json(deal);
  })],
  ["GET", /^\/v1\/orders$/, () => json({ items: getState().orders.filter((order) => canSee(dealById(order.deal_id))), next_cursor: null })],
  ["PATCH", /^\/v1\/deals\/orders\/([^/]+)$/, ([id], body) => {
    const order = getState().orders.find((item) => item.id === id);
    if (!order) return problem(404, "Order not found");
    const status = String(body.status);
    const today = nowIso().slice(0, 10);
    const dateField = ({ ready: "ready_on", shipped: "shipped_on", delivered: "delivered_on" } as Record<string, string>)[status];
    Object.assign(order, { status, tracking_ref: (body.tracking_ref as string) || order.tracking_ref }, dateField ? { [dateField]: today } : {});
    const deal = dealById(order.deal_id);
    if (deal) changeDeal(deal, {}, `Order ${order.number}: ${status}`);
    return json({ ...order, final_quote_version_id: (deal && getState().quotes[deal.id][0]?.id) ?? order.id });
  }],
];

export const ROUTES = [...AUTH_ROUTES, ...DEAL_ROUTES, ...QUOTE_ROUTES, ...REQUEST_ROUTES, ...BUYER_ROUTES];
