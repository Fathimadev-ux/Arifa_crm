/** Sample answers for dashboards (§21), settings and users (§20.11), channels, material prices, kill switch, my account. */
import type { Schemas } from "@/lib/api/client";
import { getRecords } from "./demo-records";
import type { Handler } from "./demo-routes";
import { type Body, type StaffMember, changeRequestsFor, currentUser, getState, inboxItems, json, nowIso, problem } from "./demo-store";

type S = Schemas;

let nextId = 1;
const newId = () => `00000000-0000-4000-9000-${String(nextId++).padStart(12, "0")}`;
const countBy = <T,>(items: T[], key: (item: T) => string) => items.reduce<Record<string, number>>((counts, item) => ({ ...counts, [key(item)]: (counts[key(item)] ?? 0) + 1 }), {});
const OPEN_STAGES = ["NEW", "QUALIFIED", "QUOTATION", "NEGOTIATION", "READY_TO_CLOSE", "PAYMENT"];

const latestQuoteAed = (dealId: string) => Number(getState().quotes[dealId]?.[0]?.total_aed ?? 0);
const isOpen = (stage: string) => OPEN_STAGES.includes(stage);

/** §21 one salesperson's numbers, from the sample deals they own. */
function salespersonBoard(member: StaffMember, from: string, to: string): S["SalespersonBoard"] {
  const deals = getState().deals.filter((deal) => deal.owner_user_id === member.id);
  const quotes = deals.flatMap((deal) => getState().quotes[deal.id]);
  return {
    user_id: member.id,
    name: member.full_name,
    open_deals_by_stage: countBy(deals.filter((deal) => isOpen(deal.stage)), (deal) => deal.stage),
    waiting_for_me: inboxItems().filter((item) => deals.some((deal) => deal.id === item.deal_id)).length,
    avg_response_minutes: 12 + member.full_name.length,
    quotes_sent: quotes.filter((quote) => ["sent", "accepted", "superseded"].includes(quote.status) && quote.created_at.slice(0, 10) >= from && quote.created_at.slice(0, 10) <= to).length,
    deals_won: deals.filter((deal) => deal.stage === "WON").length,
  };
}

function periodOf(query: URLSearchParams) {
  const today = nowIso().slice(0, 10);
  return { from: query.get("period_from") ?? "2000-01-01", to: query.get("period_to") ?? today };
}

function summary(): S["DashboardSummary"] {
  const { deals, approvals } = getState();
  const openApprovals = approvals.filter((approval) => approval.status === "open");
  return {
    deals_by_stage: countBy(deals, (deal) => deal.stage),
    open_pipeline_aed: deals.filter((deal) => isOpen(deal.stage)).reduce((sum, deal) => sum + latestQuoteAed(deal.id), 0).toFixed(2),
    approvals_pending: openApprovals.length,
    approvals_overdue: openApprovals.filter((approval) => new Date(approval.deadline_at).getTime() < Date.now()).length,
    open_tasks: inboxItems().length,
    ai_paused_deals: deals.filter((deal) => isOpen(deal.stage) && !deal.ai_enabled).length,
    materials: getRecords().freshness,
  };
}

const KILL_LEVELS = ["off", "marketing", "calls", "text_only", "hold"];

/** D35: what each level stops, from nothing to holding every outgoing message. */
function killSwitchState() {
  const level = getRecords().killSwitch;
  const order = KILL_LEVELS.indexOf(level);
  return { level, marketing_stopped: order >= 1, calls_stopped: order >= 2, voice_stopped: order >= 3, all_held: order === 4 };
}

// ---------- Template versions (§5.2) ----------

type Template = ReturnType<typeof getRecords>["templates"][number];
const sameTemplate = (a: Pick<Template, "channel" | "name" | "language">, b: Pick<Template, "channel" | "name" | "language">) =>
  a.channel === b.channel && a.name === b.name && a.language === b.language;

function makeLive(template: Template) {
  for (const other of getRecords().templates) {
    if (other === template || !sameTemplate(other, template) || !other.live) continue;
    Object.assign(other, { live: false, provider_status: "superseded" });
  }
  template.live = true;
}

/**
 * Editing the live WhatsApp version makes a new version that waits for Meta (the live one keeps sending); a version
 * not yet approved changes in place; email goes live at once with the previous version kept as history.
 */
function saveTemplateVersion(body: Body): Template {
  const records = getRecords();
  const key = { channel: String(body.channel), name: String(body.name), language: String(body.language) };
  const newest = records.templates.find((item) => sameTemplate(item, key));
  const fields = { category: String(body.category ?? "utility"), subject: (body.subject as string) ?? null, body: String(body.body), variables: (body.variables as string[]) ?? [], updated_at: nowIso() };
  const isWhatsApp = key.channel === "whatsapp";
  if (newest && isWhatsApp && !newest.live) return Object.assign(newest, fields);

  const version = (newest?.version ?? 0) + 1;
  const template: Template = {
    id: newId(), ...key, ...fields, version, provider_name: version > 1 ? `${key.name}_v${version}` : key.name, provider_status: isWhatsApp ? "submitted" : "approved",
    live: false, created_by: currentUser()?.id ?? null, created_at: nowIso(),
  };
  records.templates.unshift(template);
  if (!isWhatsApp) makeLive(template);
  return template;
}

function withStaff(handle: (member: S["UserAdminOut"], body: Body) => Response): Handler {
  return ([id], body) => {
    const member = getRecords().staff.find((item) => item.id === id);
    return member ? handle(member, body) : problem(404, "User not found");
  };
}

export const ADMIN_ROUTES: [string, RegExp, Handler][] = [
  // ---------- Dashboards (§21) ----------
  ["GET", /^\/v1\/dashboards\/salesperson$/, (_, __, query) => {
    const member = getRecords().staff.find((item) => item.id === (query.get("user_id") ?? currentUser()?.id));
    const { from, to } = periodOf(query);
    return member ? json(salespersonBoard(member, from, to)) : problem(404, "User not found");
  }],
  ["GET", /^\/v1\/dashboards\/manager$/, (_, __, query) => {
    const { from, to } = periodOf(query);
    const allRequests = [...changeRequestsFor("open", null), ...changeRequestsFor("closed", null)];
    const optedOut = getState().deals.filter((deal) => deal.opted_out_at);
    return json({
      period_from: from, period_to: to,
      salespeople: getRecords().staff.filter((member) => member.role === "sales").map((member) => salespersonBoard(member, from, to)),
      below_minimum_requests: allRequests.filter((request) => request.ai_notes?.includes("below the minimum")).length,
      change_requests_by_type: countBy(allRequests, (request) => request.type),
      sla_breaches: changeRequestsFor("open", null).filter((request) => new Date(request.sla_due_at).getTime() < Date.now()).length,
      price_list_changes: getRecords().changes.filter((change) => change.entity_type === "price_tier").length,
      opted_out: optedOut.length,
      opt_out_reasons: countBy(optedOut, () => "asked_to_stop"),
    } satisfies S["ManagerBoard"]);
  }],
  ["GET", /^\/v1\/dashboards\/md$/, (_, __, query) => {
    const { from, to } = periodOf(query);
    const { deals, companyByDeal } = getState();
    const closed = deals.filter((deal) => deal.stage === "WON" || deal.stage === "LOST");
    const products = getRecords().products;
    const categoryOf = (product: string | null | undefined) => products.find((item) => item.name === product)?.category_code ?? "other";
    return json({
      period_from: from, period_to: to,
      pipeline_aed_by_stage: Object.fromEntries(OPEN_STAGES.map((stage) => [stage, deals.filter((deal) => deal.stage === stage).reduce((sum, deal) => sum + latestQuoteAed(deal.id), 0).toFixed(2)])),
      win_rate: closed.length ? deals.filter((deal) => deal.stage === "WON").length / closed.length : null,
      avg_discount_from_list: 0.034,
      deals_by_country: countBy(deals, (deal) => deal.requirements[0]?.delivery_country ?? "—"),
      deals_by_category: countBy(deals, (deal) => categoryOf(deal.requirements[0]?.product_text)),
      deals_by_channel: countBy(deals, (deal) => deal.contact.preferred_channel ?? "web"),
      top_buyers: deals
        .map((deal) => ({ name: companyByDeal[deal.id], value_aed: latestQuoteAed(deal.id) }))
        .filter((buyer) => buyer.value_aed > 0)
        .sort((a, b) => b.value_aed - a.value_aed)
        .slice(0, 5),
      takeover_queue: deals.filter((deal) => isOpen(deal.stage) && !deal.ai_enabled && !deal.taken_over_by).map((deal) => deal.id),
    } satisfies S["MdBoard"]);
  }],
  ["GET", /^\/v1\/dashboard\/summary$/, () => json(summary())],

  // ---------- Settings, feature switches, FX ----------
  ["GET", /^\/v1\/settings$/, () => json(getRecords().settings)],
  ["PUT", /^\/v1\/settings\/([^/]+)$/, ([key], body) => {
    const setting = getRecords().settings.find((item) => item.key === key);
    if (!setting) return problem(404, "Unknown setting");
    Object.assign(setting, { value: body.value, updated_at: nowIso() });
    return json(setting);
  }],
  ["PUT", /^\/v1\/feature-flags\/([^/]+)$/, ([key], body) => {
    const setting = getRecords().settings.find((item) => item.key === `feature.${key}`);
    if (setting) Object.assign(setting, { value: Boolean(body.enabled), updated_at: nowIso() });
    return new Response(null, { status: 204 });
  }],
  ["GET", /^\/v1\/fx-rates$/, () => json(getRecords().fx)],
  ["POST", /^\/v1\/fx-rates$/, (_, body) => {
    const row = { currency: String(body.currency), rate_to_aed: String(body.rate_to_aed), as_of: String(body.as_of), source: "manual" };
    getRecords().fx = [row, ...getRecords().fx.filter((item) => item.currency !== row.currency)];
    return json(row, 201);
  }],

  // ---------- Users (§20.11, §9.3) ----------
  ["GET", /^\/v1\/users$/, () => json(getRecords().staff)],
  ["POST", /^\/v1\/users$/, (_, body) => {
    if (getRecords().staff.some((member) => member.email === body.email)) return problem(409, "A user with this email already exists");
    const member: S["UserAdminOut"] = {
      id: newId(), email: String(body.email), full_name: String(body.full_name), role: String(body.role), phone_e164: (body.phone_e164 as string) ?? null, is_active: true, is_away: false,
      languages: ["en"], countries: [], category_codes: [], alert_channels: ["in_app"], backup_user_id: null, totp_enrolled: false, locked: false,
    };
    getRecords().staff.push(member);
    return json({ user: member, temporary_password: `Arifa-${Math.random().toString(36).slice(2, 8)}-${Math.random().toString(36).slice(2, 8)}` }, 201);
  }],
  ["PATCH", /^\/v1\/users\/([^/]+)$/, withStaff((member, body) => json(Object.assign(member, Object.fromEntries(Object.entries(body).filter(([, value]) => value !== null && value !== undefined)))))],
  ["POST", /^\/v1\/users\/([^/]+)\/reset-mfa$/, withStaff((member) => json(Object.assign(member, { totp_enrolled: false })))],
  ["POST", /^\/v1\/users\/([^/]+)\/unlock$/, withStaff((member) => json(Object.assign(member, { locked: false })))],
  ["PUT", /^\/v1\/users\/([^/]+)\/availability$/, withStaff((member, body) => {
    Object.assign(member, { is_away: Boolean(body.is_away), backup_user_id: body.is_away ? ((body.backup_user_id as string) ?? null) : null });
    const user = currentUser();
    if (user?.id === member.id) Object.assign(user, { is_away: member.is_away, backup_user_id: member.backup_user_id });
    return json(member);
  })],

  // ---------- Channels ----------
  ["GET", /^\/v1\/admin\/channel-accounts$/, () => json(getRecords().channels)],
  ["PATCH", /^\/v1\/admin\/channel-accounts\/([^/]+)$/, ([id], body) => {
    const account = getRecords().channels.find((item) => item.id === id);
    if (!account) return problem(404, "Account not found");
    if (body.is_default) getRecords().channels.forEach((item) => item.channel === account.channel && (item.is_default = false));
    return json(Object.assign(account, Object.fromEntries(Object.entries(body).filter(([, value]) => value !== null && value !== undefined))));
  }],
  ["GET", /^\/v1\/admin\/message-templates$/, (_, __, query) => {
    const all = getRecords().templates;
    // current_only: the newest version of each template (the list is kept newest first).
    return json(query.get("current_only") === "true" ? all.filter((item, index) => all.findIndex((other) => sameTemplate(other, item)) === index) : all);
  }],
  ["PUT", /^\/v1\/admin\/message-templates$/, (_, body) => json(saveTemplateVersion(body))],
  ["POST", /^\/v1\/admin\/message-templates\/([^/]+)\/status$/, ([id], body) => {
    const template = getRecords().templates.find((item) => item.id === id);
    if (!template) return problem(404, "Template not found");
    Object.assign(template, { provider_status: String(body.provider_status), updated_at: nowIso() });
    // Approving a version makes it the one sent; the one sent before is kept as history.
    if (template.provider_status === "approved") makeLive(template);
    return json(template);
  }],

  // ---------- Material prices and the kill switch ----------
  ["GET", /^\/v1\/price-proposals$/, (_, __, query) => json({ items: getRecords().rates.filter((rate) => rate.status === (query.get("status") ?? "proposed")), next_cursor: null })],
  ["POST", /^\/v1\/price-proposals\/([^/]+)\/(approve|reject)$/, ([id, decision], body) => {
    const rate = getRecords().rates.find((item) => item.id === id);
    if (!rate) return problem(404, "Proposal not found");
    Object.assign(rate, { status: decision === "approve" ? "approved" : "rejected", decided_at: nowIso(), note: (body.note as string) ?? null }, decision === "approve" && body.rate_per_unit ? { rate_per_unit: String(body.rate_per_unit) } : {});
    const freshness = getRecords().freshness.find((item) => item.material_code === rate.material_code);
    if (decision === "approve" && freshness) Object.assign(freshness, { days_since_approval: 0, level: "ok" });
    return json(rate);
  }],
  ["GET", /^\/v1\/materials\/freshness$/, () => json(getRecords().freshness)],
  ["GET", /^\/v1\/admin\/kill-switch$/, () => json(killSwitchState())],
  ["PUT", /^\/v1\/admin\/kill-switch$/, (_, body) => {
    getRecords().killSwitch = body.level as S["KillSwitchIn"]["level"];
    return json(killSwitchState());
  }],

  // ---------- My account ----------
  ["POST", /^\/v1\/auth\/totp\/enrol$/, () => json({ secret: "JBSWY3DPEHPK3PXP", otpauth_uri: `otpauth://totp/Arifa%20CRM:${encodeURIComponent(currentUser()?.email ?? "demo")}?secret=JBSWY3DPEHPK3PXP&issuer=Arifa%20CRM` })],
  ["POST", /^\/v1\/auth\/totp\/confirm$/, () => new Response(null, { status: 204 })],
];
