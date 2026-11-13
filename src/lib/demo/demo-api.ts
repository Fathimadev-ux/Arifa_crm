/**
 * Sample-data fallback. Every call tries the real backend first; when it can't be reached (no server, network
 * down, proxy error page), this answers instead from demo-data.ts, in the same shapes. Real answers such as
 * 401 / 403 / 422 from a live backend are never replaced. Changes made in demo mode live until a reload.
 */
import type { Middleware } from "openapi-fetch";
import type { DealStage, Schemas } from "@/lib/api/client";
import { DEMO_STAFF, type DemoState, buildApproval, buildQuoteVersion, createDemoState, demoUserForEmail, unitPriceOf } from "./demo-data";

type DealDetail = Schemas["DealDetail"];
type StaffMember = Schemas["UserAdminOut"];

const HOUR = 3_600_000;
const SESSION_KEY = "arifaa-demo-user";
const STAGE_FLOW: DealStage[] = ["NEW", "QUALIFIED", "QUOTATION", "NEGOTIATION", "READY_TO_CLOSE", "PAYMENT", "WON"];

// ---------- Demo mode flag (screens can show that the data is sample data) ----------

let isDemo = false;
const demoListeners = new Set<() => void>();

export const isDemoMode = () => isDemo;

export function subscribeDemoMode(listener: () => void) {
  demoListeners.add(listener);
  return () => {
    demoListeners.delete(listener);
  };
}

function enterDemoMode() {
  if (isDemo) return;
  isDemo = true;
  demoListeners.forEach((listener) => listener());
}

// ---------- Demo session (kept for the tab, so a reload stays signed in) ----------

let signedInUser: StaffMember | null = null;
/** Who typed the password; becomes the signed-in user once the code step passes. */
let loggingInUser: StaffMember | null = null;

function currentUser(): StaffMember | null {
  try {
    const id = sessionStorage.getItem(SESSION_KEY);
    signedInUser ??= DEMO_STAFF.find((member) => member.id === id) ?? null;
  } catch {
    // Storage blocked: the demo session lasts until the page reloads.
  }
  return signedInUser;
}

function setCurrentUser(user: StaffMember | null) {
  signedInUser = user;
  try {
    if (user) sessionStorage.setItem(SESSION_KEY, user.id);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage blocked: kept in memory only.
  }
}

/** A salesperson sees only their own deals (§3); everyone else sees all. */
function canSee(deal: DealDetail): boolean {
  const user = currentUser();
  return user?.role !== "sales" || deal.owner_user_id === user.id;
}

// ---------- Responses ----------

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const empty = (status = 204) => new Response(null, { status });
const problem = (status: number, detail: string) => json({ type: "about:blank", title: detail, status, detail }, status);

const tokens = (user: StaffMember) => ({
  access_token: "demo-access-token", token_type: "Bearer", expires_in: 900, mfa: true, amr: ["pwd", "otp"],
  must_change_password: false, totp_enrolled: true, user,
});

// ---------- State ----------

let state: DemoState | null = null;
const getState = () => (state ??= createDemoState(Date.now()));
const nowIso = () => new Date().toISOString();
/** Timeline ids for new events; above the seeded ones and unique even within the same millisecond. */
let nextEventId = 1_000_000;

function summaryOf(deal: DealDetail) {
  const { id, number, stage, ai_enabled, ai_paused_reason, currency, concessions_used, next_action_at, owner_user_id, taken_over_by, opted_out_at, version, updated_at } = deal;
  return { id, number, stage, ai_enabled, ai_paused_reason, currency, concessions_used, next_action_at, owner_user_id, taken_over_by, opted_out_at, version, updated_at };
}

/** Applies a change to a deal: bumps its version and logs the event on its timeline. */
function changeDeal(deal: DealDetail, patch: Partial<DealDetail>, summary: string, actor: "staff" | "ai" = "staff") {
  Object.assign(deal, patch, { version: deal.version + 1, updated_at: nowIso() });
  getState().timeline[deal.id].unshift({ id: nextEventId++, kind: "action", channel: null, direction: null, summary, actor_type: actor, actor_id: actor === "staff" ? (currentUser()?.id ?? null) : null, at: nowIso() });
}

/** The deal a quote approval belongs to. */
function dealOfApproval(approval: Schemas["ApprovalOut"]): DealDetail {
  const { deals, quotes } = getState();
  return deals.find((deal) => quotes[deal.id].some((version) => version.id === approval.quote_version_id))!;
}

const dealNumberOf = (deal: DealDetail) => Number(deal.number.replace(/\D/g, ""));
const stageName = (stage: string) => stage.charAt(0) + stage.slice(1).toLowerCase().replace(/_/g, " ");

function inboxItems() {
  const { approvals, quotes, companyByDeal } = getState();
  const now = Date.now();
  return approvals
    .filter((approval) => approval.status === "open")
    .map((approval) => {
      const deal = dealOfApproval(approval);
      const version = quotes[deal.id].find((item) => item.id === approval.quote_version_id)!;
      return canSee(deal) && {
        kind: "approval", ref_id: approval.id, deal_id: deal.id, deal_number: deal.number, title: `${companyByDeal[deal.id]}: approve quote v${version.version_no}`,
        due_at: approval.deadline_at, created_at: approval.submitted_at, overdue: new Date(approval.deadline_at).getTime() < now,
      };
    })
    .filter(Boolean);
}

/** A new version waiting for approval: from the price list, or a copy of the last one (a correction). */
function addQuoteVersion(deal: DealDetail, unitPrice?: number) {
  const { quotes, approvals } = getState();
  const versions = quotes[deal.id];
  const requirement = deal.requirements[0];
  const price = unitPrice ?? (versions[0] ? Number(versions[0].lines[0].unit_price) : unitPriceOf(requirement.product_text ?? ""));
  const version = buildQuoteVersion(dealNumberOf(deal), versions.length + 1, requirement.product_text ?? "", Number(requirement.quantity ?? 0), price, "pending_approval", Date.now());
  versions.unshift(version);
  approvals.push(buildApproval(version, dealNumberOf(deal), deal.owner_user_id ?? currentUser()?.id ?? "", Date.now()));
  return version;
}

// ---------- Routes ----------

type Handler = (params: string[], body: Record<string, unknown>) => Response;

function withDeal(handle: (deal: DealDetail, body: Record<string, unknown>) => Response): Handler {
  return ([id], body) => {
    const deal = getState().deals.find((item) => item.id === id);
    return deal && canSee(deal) ? handle(deal, body) : problem(404, "Deal not found");
  };
}

const ROUTES: [method: string, path: RegExp, handle: Handler][] = [
  ["POST", /^\/v1\/auth\/login$/, (_, body) => ((loggingInUser = demoUserForEmail(String(body.email ?? ""))), json({ challenge_token: "demo-challenge-token", methods: ["totp", "email"], totp_enrolled: true, expires_at: new Date(Date.now() + 5 * 60_000).toISOString() }))],
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
  ["GET", /^\/v1\/auth\/me$/, () => json(currentUser() ?? { detail: "Signed out" }, currentUser() ? 200 : 401)],
  ["POST", /^\/v1\/auth\/password(\/reset\/finish)?$/, () => empty()],
  ["POST", /^\/v1\/auth\/password\/reset\/start$/, () => json({}, 202)],

  ["GET", /^\/v1\/users$/, () => json(DEMO_STAFF)],
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
      changeDeal(deal, { stage: "LOST", lost_reason: body.lost_reason as string, lost_note: (body.lost_note as string) ?? null, ai_enabled: false, ai_paused_reason: null, next_action_at: null }, `Marked lost: ${String(body.lost_reason).replace(/_/g, " ")}`);
    } else {
      if (STAGE_FLOW.indexOf(to) !== STAGE_FLOW.indexOf(deal.stage) + 1) return problem(422, "Deals move one stage at a time");
      changeDeal(deal, { stage: to }, `Moved to ${stageName(to)}`);
    }
    return json(deal);
  })],
  ["POST", /^\/v1\/deals\/([^/]+)\/payments$/, withDeal((deal) => {
    changeDeal(deal, { stage: "PAYMENT" }, "Advance payment confirmed");
    return json({ id: `${deal.id}-p`, deal_id: deal.id, amount: null, currency: null, method: null, reference: null, paid_on: null }, 201);
  })],
  ["POST", /^\/v1\/deals\/([^/]+)\/won$/, withDeal((deal) => {
    changeDeal(deal, { stage: "WON", ai_enabled: false, ai_paused_reason: null, next_action_at: null }, "Marked won");
    return json({ id: `${deal.id}-o`, number: `O-${dealNumberOf(deal)}`, deal_id: deal.id, status: "in_production", final_quote_version_id: getState().quotes[deal.id][0]?.id ?? deal.id }, 201);
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
  ["POST", /^\/v1\/deals\/([^/]+)\/quotes$/, withDeal((deal) => {
    const version = addQuoteVersion(deal);
    changeDeal(deal, {}, `Built quote v${version.version_no} from the price list, waiting for approval`, "ai");
    return json(version, 201);
  })],

  ["POST", /^\/v1\/approvals\/([^/]+)\/decision$/, ([id], body) => {
    const { approvals, quotes } = getState();
    const approval = approvals.find((item) => item.id === id && item.status === "open");
    if (!approval) return problem(404, "This approval is already decided");
    const deal = dealOfApproval(approval);
    const version = quotes[deal.id].find((item) => item.id === approval.quote_version_id)!;
    const decision = body.decision as "approve" | "reject" | "correct";
    Object.assign(approval, { status: decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "corrected", decided_by: currentUser()?.id ?? null, decided_at: nowIso(), decision_note: (body.note as string) ?? null });
    version.status = { approve: "sent", reject: "rejected", correct: "correction_requested" }[decision];
    changeDeal(deal, {}, `${{ approve: "Approved", reject: "Rejected", correct: "Asked for a correction on" }[decision]} quote v${version.version_no}${body.note ? `: ${body.note}` : ""}`);
    if (decision === "approve") changeDeal(deal, { next_action_at: new Date(Date.now() + 48 * HOUR).toISOString() }, `Sent quote v${version.version_no} to the buyer`, "ai");
    if (decision === "correct") changeDeal(deal, {}, `Built quote v${addQuoteVersion(deal).version_no}, waiting for approval`, "ai");
    return json(approval);
  }],
];

function answer(method: string, url: string, bodyText: string): Response {
  const path = new URL(url).pathname;
  let body: Record<string, unknown> = {};
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    // Not JSON (e.g. a file upload): handlers only read JSON bodies.
  }
  for (const [routeMethod, pattern, handle] of ROUTES) {
    const match = method === routeMethod ? path.match(pattern) : null;
    if (match) return handle(match.slice(1), body);
  }
  return problem(404, "Not available with sample data yet");
}

// ---------- Middleware ----------

/** The backend isn't there: the fetch failed, or the proxy answered with a gateway error or an HTML error page. */
function isUnreachable(response: Response): boolean {
  const isJson = (response.headers.get("Content-Type") ?? "").includes("json");
  return [502, 503, 504].includes(response.status) || ((response.status >= 500 || response.status === 404) && !isJson);
}

// The request body, kept so the same call can be answered from sample data after the network attempt.
const bodies = new Map<string, Promise<string>>();

export const demoMiddleware: Middleware = {
  async onRequest({ request, id }) {
    const bodyText = request.clone().text();
    if (isDemo) return answer(request.method, request.url, await bodyText);
    bodies.set(id, bodyText);
    return undefined;
  },
  async onResponse({ request, response, id }) {
    const bodyText = bodies.get(id) ?? Promise.resolve("");
    bodies.delete(id);
    if (!isUnreachable(response)) return response;
    enterDemoMode();
    return answer(request.method, request.url, await bodyText);
  },
  async onError({ request, id }) {
    const bodyText = bodies.get(id) ?? Promise.resolve("");
    bodies.delete(id);
    enterDemoMode();
    return answer(request.method, request.url, await bodyText);
  },
};
