/**
 * The sample backend's memory: the demo session, the data (created on first use, changed by actions, gone on
 * reload) and the helpers the routes share. Answers are built in the API's own shapes.
 */
import type { Schemas } from "@/lib/api/client";
import { DEMO_STAFF, type DemoState, type QuoteLineDraft, buildApproval, buildQuoteVersion, createDemoState, unitPriceOf } from "./demo-data";

export type DealDetail = Schemas["DealDetail"];
export type StaffMember = Schemas["UserAdminOut"];
export type QuoteVersion = Schemas["QuoteVersionOut"];
export type QuoteEdits = Schemas["QuoteEditsIn"];
export type ChangeRequest = Schemas["ChangeRequestOut"];
export type Body = Record<string, unknown>;

// ---------- Responses ----------

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
export const empty = (status = 204) => new Response(null, { status });
export const problem = (status: number, detail: string, extra: Body = {}) => json({ type: "about:blank", title: detail, status, detail, ...extra }, status);

export const tokens = (user: StaffMember) => ({
  access_token: "demo-access-token", token_type: "Bearer", expires_in: 900, mfa: true, amr: ["pwd", "otp"],
  must_change_password: false, totp_enrolled: true, user,
});

// ---------- Session (kept for the tab, so a reload stays signed in) ----------

const SESSION_KEY = "arifaa-demo-user";
let signedInUser: StaffMember | null = null;

export function currentUser(): StaffMember | null {
  try {
    const id = sessionStorage.getItem(SESSION_KEY);
    signedInUser ??= DEMO_STAFF.find((member) => member.id === id) ?? null;
  } catch {
    // Storage blocked: the demo session lasts until the page reloads.
  }
  return signedInUser;
}

export function setCurrentUser(user: StaffMember | null) {
  signedInUser = user;
  try {
    if (user) sessionStorage.setItem(SESSION_KEY, user.id);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage blocked: kept in memory only.
  }
}

/** A salesperson sees only their own deals (§3); everyone else sees all. */
export function canSee(deal: DealDetail | undefined): deal is DealDetail {
  const user = currentUser();
  return Boolean(deal) && (user?.role !== "sales" || deal!.owner_user_id === user.id);
}

// ---------- Data ----------

let state: DemoState | null = null;
export const getState = () => (state ??= createDemoState(Date.now()));
export const nowIso = () => new Date().toISOString();
/** Timeline ids for new events; above the seeded ones and unique even within the same millisecond. */
let nextEventId = 1_000_000;

export const dealById = (id: string) => getState().deals.find((deal) => deal.id === id);
export const dealNumberOf = (deal: DealDetail) => Number(deal.number.replace(/\D/g, ""));
export const words = (code: string) => code.charAt(0).toUpperCase() + code.slice(1).toLowerCase().replace(/_/g, " ");
export const findVersion = (id: string) => Object.values(getState().quotes).flat().find((version) => version.id === id);

export function summaryOf(deal: DealDetail) {
  const { id, number, stage, ai_enabled, ai_paused_reason, currency, concessions_used, next_action_at, owner_user_id, taken_over_by, opted_out_at, version, updated_at } = deal;
  return { id, number, stage, ai_enabled, ai_paused_reason, currency, concessions_used, next_action_at, owner_user_id, taken_over_by, opted_out_at, version, updated_at };
}

/** Applies a change to a deal: bumps its version and logs the event on its timeline (a message when on a channel). */
export function changeDeal(deal: DealDetail, patch: Partial<DealDetail>, summary: string, actor: "staff" | "ai" = "staff", channel: string | null = null) {
  Object.assign(deal, patch, { version: deal.version + 1, updated_at: nowIso() });
  getState().timeline[deal.id].unshift({
    id: nextEventId++, kind: channel ? "message" : "action", channel, direction: channel ? "out" : null, summary, actor_type: actor,
    actor_id: actor === "staff" ? (currentUser()?.id ?? null) : null, at: nowIso(),
  });
}

/** The deal a quote approval belongs to. */
export function dealOfApproval(approval: Schemas["ApprovalOut"]): DealDetail {
  const { deals, quotes } = getState();
  return deals.find((deal) => quotes[deal.id].some((version) => version.id === approval.quote_version_id))!;
}

const isOpenRequest = (request: ChangeRequest) => ["open", "in_progress"].includes(request.status);

/** §20.2: open approvals and change requests of the deals this person may see. */
export function inboxItems() {
  const { approvals, quotes, companyByDeal, changeRequests } = getState();
  const now = Date.now();
  const approvalItems = approvals.flatMap((approval) => {
    const deal = dealOfApproval(approval);
    if (approval.status !== "open" || !canSee(deal)) return [];
    const version = quotes[deal.id].find((item) => item.id === approval.quote_version_id)!;
    return [{
      kind: "approval", ref_id: approval.id, deal_id: deal.id, deal_number: deal.number, title: `${companyByDeal[deal.id]}: approve quote v${version.version_no}`,
      due_at: approval.deadline_at, created_at: approval.submitted_at, overdue: new Date(approval.deadline_at).getTime() < now,
    }];
  });
  const requestItems = changeRequests.flatMap((request) => {
    const deal = dealById(request.deal_id);
    if (!isOpenRequest(request) || !canSee(deal)) return [];
    return [{
      kind: "change_request", ref_id: request.id, deal_id: deal.id, deal_number: deal.number, title: `${companyByDeal[deal.id]}: ${words(request.type).toLowerCase()} change`,
      due_at: request.sla_due_at, created_at: request.created_at, overdue: new Date(request.sla_due_at).getTime() < now,
    }];
  });
  return [...approvalItems, ...requestItems];
}

/** Change requests by status ("open" covers in-progress cards), oldest due first. */
export function changeRequestsFor(status: string, dealId: string | null) {
  return getState()
    .changeRequests.filter((request) => isOpenRequest(request) === (status === "open") && (!dealId || request.deal_id === dealId) && canSee(dealById(request.deal_id)))
    .sort((a, b) => a.sla_due_at.localeCompare(b.sla_due_at));
}

// ---------- Quotes ----------

const linesOf = (version: QuoteVersion): QuoteLineDraft[] =>
  version.lines.map((line) => ({ description: line.description, quantity: Number(line.quantity), unitPrice: Number(line.unit_price), unit: line.unit }));

const EDITABLE_TERMS = ["delivery_time_text", "delivery_place", "payment_terms_text", "incoterm", "cover_note"] as const;

/** The changed fields of §11.3 / §13.3 applied to a version: new prices or quantities per line, and new terms. */
export function applyEdits(previous: QuoteVersion, edits: QuoteEdits) {
  const lines = linesOf(previous).map((line, index) => {
    const edit = edits.lines?.find((item) => item.line_no === index + 1);
    return { ...line, unitPrice: edit?.unit_price ? Number(edit.unit_price) : line.unitPrice, quantity: edit?.quantity ? Number(edit.quantity) : line.quantity };
  });
  const terms: Partial<QuoteVersion> = { change_summary: edits.note ?? "Revised" };
  for (const key of EDITABLE_TERMS) {
    if (edits[key] !== undefined && edits[key] !== null) Object.assign(terms, { [key]: edits[key] });
  }
  return { lines, terms };
}

/**
 * A new version waiting for approval: given lines (a revision or a manual quote), a copy of the last version
 * (a correction), or the price list (the first quote). Earlier versions still waiting are superseded.
 */
export function addQuoteVersion(deal: DealDetail, options: { lines?: QuoteLineDraft[]; terms?: Partial<QuoteVersion>; kind?: string } = {}) {
  const { quotes, approvals } = getState();
  const versions = quotes[deal.id];
  const requirement = deal.requirements[0];
  const product = requirement?.product_text ?? "";
  const lines = options.lines ?? (versions[0] ? linesOf(versions[0]) : [{ description: product, quantity: Number(requirement?.quantity ?? 0), unitPrice: unitPriceOf(product) }]);
  const version: QuoteVersion = { ...buildQuoteVersion(dealNumberOf(deal), versions.length + 1, lines, "pending_approval", Date.now(), options.kind), ...options.terms };

  for (const older of versions) {
    if (older.status !== "pending_approval") continue;
    older.status = "superseded";
    const approval = approvals.find((item) => item.quote_version_id === older.id && item.status === "open");
    if (approval) approval.status = "superseded";
  }
  versions.unshift(version);
  approvals.push(buildApproval(version, dealNumberOf(deal), deal.owner_user_id ?? currentUser()?.id ?? "", Date.now()));
  return version;
}
