/**
 * Sample data in the exact API shapes, used only while the backend can't be reached (see demo-api.ts).
 * The deals are the examples from the client document.
 */
import type { DealStage, Schemas } from "@/lib/api/client";

type DealDetail = Schemas["DealDetail"];
type QuoteVersion = Schemas["QuoteVersionOut"];
type TimelineEvent = Schemas["TimelineOut"];
type Approval = Schemas["ApprovalOut"];
type StaffMember = Schemas["UserAdminOut"];
type ChangeRequest = Schemas["ChangeRequestOut"];
type Order = Schemas["OrderRow"];

const HOUR = 3_600_000;
const DAY = 86_400_000;
const APPROVAL_HOURS = 3;
const VAT_RATE = 5;
const INR_TO_AED = 0.044;

const staffId = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const STAFF_IDS = { Divya: staffId(1), Arun: staffId(2), Meena: staffId(3), Suresh: staffId(4), Ravi: staffId(5), Admin: staffId(6) };

function staffMember(id: string, full_name: string, role: string): StaffMember {
  const email = `${full_name.split(" ")[0].toLowerCase()}@arifapack.com`;
  return {
    id, email, full_name, role, phone_e164: null, is_active: true, is_away: false, languages: ["en"], countries: ["IN"],
    category_codes: [], alert_channels: ["in_app"], backup_user_id: null, totp_enrolled: true, locked: false,
  };
}

export const DEMO_STAFF: StaffMember[] = [
  staffMember(STAFF_IDS.Divya, "Divya", "sales"),
  staffMember(STAFF_IDS.Arun, "Arun", "sales"),
  staffMember(STAFF_IDS.Meena, "Meena", "sales"),
  staffMember(STAFF_IDS.Suresh, "Suresh Kumar", "manager"),
  staffMember(STAFF_IDS.Ravi, "Ravi Shankar", "md"),
  staffMember(STAFF_IDS.Admin, "Admin", "admin"),
];

/**
 * Who the demo login signs in as: the email's start picks the role ("sales…", "md…", "admin…"),
 * anything else is the manager, who sees the most.
 */
export function demoUserForEmail(email: string): StaffMember {
  const start = email.trim().toLowerCase();
  const role = ["sales", "md", "admin"].find((prefix) => start.startsWith(prefix)) ?? "manager";
  return DEMO_STAFF.find((member) => member.role === role)!;
}

const UNIT_PRICES: Record<string, number> = {
  "750ml Round Container": 9.2,
  "500ml Rectangular Container": 7.4,
  "1000ml Round Container": 11.5,
  "450ml Foil Container": 6.8,
  "660ml Foil Container": 8.1,
  "250ml Sauce Cup": 2.4,
};

type Channel = "whatsapp" | "email" | "phone";

interface DealSeed {
  number: number;
  company: string;
  contact: string;
  phone: string;
  channel: Channel;
  city: string;
  product: string;
  quantity: number;
  stage: DealStage;
  owner: keyof typeof STAFF_IDS;
  createdDaysAgo: number;
  nextInHours?: number;
  aiPaused?: boolean;
  quotes?: { unitPrice?: number; status: string; ageHours: number }[];
  lostReason?: string;
  history: [actor: "ai" | "buyer" | "staff", text: string][];
}

const SEEDS: DealSeed[] = [
  { number: 1001, company: "Sri Balaji Caterers", contact: "Ramesh Kumar", phone: "+919841022341", channel: "whatsapp", city: "Chennai", product: "450ml Foil Container", quantity: 20000, stage: "NEW", owner: "Divya", createdDaysAgo: 0, nextInHours: 2,
    history: [["ai", "Started chat on the website"], ["ai", "Matched the 450ml foil container"]] },
  { number: 1002, company: "Green Leaf Restaurants", contact: "Priya Nair", phone: "+919986011872", channel: "email", city: "Bengaluru", product: "660ml Foil Container", quantity: 15000, stage: "NEW", owner: "Arun", createdDaysAgo: 1, nextInHours: 5,
    history: [["ai", "Enquiry received by email"]] },
  { number: 1003, company: "Madurai Mess Foods", contact: "Selvam P", phone: "+919443376120", channel: "whatsapp", city: "Madurai", product: "500ml Rectangular Container", quantity: 30000, stage: "QUALIFIED", owner: "Meena", createdDaysAgo: 2, nextInHours: 20,
    history: [["ai", "Started chat on the website"], ["ai", "Qualified: score 82"]] },
  { number: 1004, company: "Kovai Cloud Kitchens", contact: "Vignesh R", phone: "+919003155408", channel: "whatsapp", city: "Coimbatore", product: "1000ml Round Container", quantity: 25000, stage: "QUOTATION", owner: "Divya", createdDaysAgo: 3, nextInHours: 1,
    quotes: [{ status: "pending_approval", ageHours: 2 }], history: [["ai", "Qualified: score 76"], ["ai", "Built the quote from the price list, waiting for approval"]] },
  { number: 1005, company: "FreshBox Meals", contact: "Sneha Reddy", phone: "+919849030217", channel: "email", city: "Hyderabad", product: "750ml Round Container", quantity: 40000, stage: "QUOTATION", owner: "Arun", createdDaysAgo: 5, nextInHours: -6,
    quotes: [{ status: "sent", ageHours: 50 }], history: [["ai", "Built the quote"], ["staff", "Approved the quote"], ["ai", "Sent the quote by email"]] },
  { number: 1045, company: "Annapoorna Ready Foods", contact: "Karthik Raman", phone: "+919789041256", channel: "whatsapp", city: "Coimbatore", product: "750ml Round Container", quantity: 50000, stage: "NEGOTIATION", owner: "Divya", createdDaysAgo: 6, nextInHours: 2,
    quotes: [{ status: "superseded", ageHours: 70 }, { unitPrice: 8.7, status: "pending_approval", ageHours: 1 }],
    history: [["ai", "Sent the quote on WhatsApp"], ["buyer", "Asked for ₹8.50 per piece"], ["ai", "Below the AI limit: ₹8.70 counter-offer sent for approval"]] },
  { number: 1007, company: "Spice Route Catering", contact: "Joseph Mathew", phone: "+919447066231", channel: "phone", city: "Kochi", product: "450ml Foil Container", quantity: 60000, stage: "READY_TO_CLOSE", owner: "Meena", createdDaysAgo: 9, nextInHours: 4,
    quotes: [{ unitPrice: 6.6, status: "accepted", ageHours: 30 }], history: [["ai", "Agreed at ₹6.60"], ["buyer", "Accepted the quote"]] },
  { number: 1008, company: "Tiffin Express", contact: "Amit Deshpande", phone: "+919822047195", channel: "whatsapp", city: "Pune", product: "250ml Sauce Cup", quantity: 100000, stage: "PAYMENT", owner: "Arun", createdDaysAgo: 12, nextInHours: 26, aiPaused: true,
    quotes: [{ status: "accepted", ageHours: 80 }], history: [["buyer", "Accepted the quote"], ["staff", "Sent the proforma invoice"]] },
  { number: 1009, company: "Royal Feast Banquets", contact: "Farhan Ali", phone: "+919884090314", channel: "phone", city: "Chennai", product: "660ml Foil Container", quantity: 35000, stage: "WON", owner: "Meena", createdDaysAgo: 20,
    quotes: [{ status: "accepted", ageHours: 300 }], history: [["staff", "Payment received"], ["ai", "Reorder check-in set for 2 months"]] },
  { number: 1010, company: "QuickBite Foods", contact: "Rohit Shah", phone: "+919820058831", channel: "email", city: "Mumbai", product: "500ml Rectangular Container", quantity: 18000, stage: "LOST", owner: "Divya", createdDaysAgo: 15, lostReason: "price_too_high",
    quotes: [{ status: "sent", ageHours: 200 }], history: [["ai", "Sent the quote by email"], ["staff", "Marked lost: price too high"]] },
];

export const demoId = (kind: "deal" | "quote" | "approval" | "contact", n: number, version = 0) =>
  `00000000-0000-4000-${{ deal: "a", quote: "b", approval: "c", contact: "d" }[kind]}000-${String(n).padStart(8, "0")}${String(version).padStart(4, "0")}`;

const toIso = (ms: number) => new Date(ms).toISOString();
const toDate = (ms: number) => toIso(ms).slice(0, 10);

export interface QuoteLineDraft {
  description: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
}

/** One quote version (the backend builds every quote; the demo copies that): priced from the list, or by hand. */
export function buildQuoteVersion(dealNumber: number, version: number, lines: QuoteLineDraft[], status: string, createdMs: number, kind = "price_list"): QuoteVersion {
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const vat = (subtotal * VAT_RATE) / 100;
  return {
    id: demoId("quote", dealNumber, version), quote_id: demoId("quote", dealNumber), version_no: version, kind, status, currency: "INR",
    subtotal: subtotal.toFixed(2), vat_rate: String(VAT_RATE), vat_amount: vat.toFixed(2), total: (subtotal + vat).toFixed(2), total_aed: ((subtotal + vat) * INR_TO_AED).toFixed(2),
    incoterm: "EXW", validity_days: 15, valid_until: toDate(createdMs + 15 * DAY), clauses: [], approver_summary: null,
    delivery_time_text: "10–12 days", delivery_place: null, payment_terms_text: "50% advance, balance before dispatch",
    pdf_s3_key: null, created_at: toIso(createdMs),
    lines: lines.map((line, index) => ({
      line_no: index + 1, description: line.description, quantity: String(line.quantity), unit: line.unit ?? "pcs",
      unit_price: line.unitPrice.toFixed(2), line_total: (line.unitPrice * line.quantity).toFixed(2),
    })),
  };
}

export function buildApproval(version: QuoteVersion, dealNumber: number, ownerId: string, submittedMs: number): Approval {
  return {
    id: demoId("approval", dealNumber, version.version_no), quote_version_id: version.id, kind: "quote", required_role: "sales", assigned_user_id: ownerId, approver_user_id: null,
    status: "open", submitted_at: toIso(submittedMs), deadline_at: toIso(submittedMs + APPROVAL_HOURS * HOUR), decided_by: null, decided_at: null, decision_note: null,
  };
}

export const unitPriceOf = (product: string) => UNIT_PRICES[product] ?? 5;

export interface DemoState {
  deals: DealDetail[];
  /** Newest version first, as the API answers. */
  quotes: Record<string, QuoteVersion[]>;
  /** Newest event first, as the API answers. */
  timeline: Record<string, TimelineEvent[]>;
  approvals: Approval[];
  companyByDeal: Record<string, string>;
  changeRequests: ChangeRequest[];
  orders: Order[];
  /** The stage a lost deal was lost from, for Reopen. */
  lostFrom: Record<string, DealStage>;
}

export function createDemoState(now: number): DemoState {
  const state: DemoState = { deals: [], quotes: {}, timeline: {}, approvals: [], companyByDeal: {}, lostFrom: {}, changeRequests: [], orders: [] };
  let eventId = 1;

  for (const seed of SEEDS) {
    const id = demoId("deal", seed.number);
    const ownerId = STAFF_IDS[seed.owner];
    const createdMs = now - seed.createdDaysAgo * DAY - 3 * HOUR;
    const isClosed = seed.stage === "WON" || seed.stage === "LOST";
    const aiEnabled = !isClosed && !seed.aiPaused;

    state.companyByDeal[id] = seed.company;
    if (seed.stage === "LOST") state.lostFrom[id] = "QUOTATION";
    state.deals.push({
      id, number: `D-${seed.number}`, stage: seed.stage, ai_enabled: aiEnabled, ai_paused_reason: aiEnabled || isClosed ? null : "human_takeover", currency: "INR", concessions_used: 0,
      next_action_at: seed.nextInHours === undefined ? null : toIso(now + seed.nextInHours * HOUR), owner_user_id: ownerId, taken_over_by: null, opted_out_at: null, version: 1, updated_at: toIso(now - HOUR),
      contact: {
        id: demoId("contact", seed.number), full_name: seed.contact, phone_e164: seed.phone, whatsapp_e164: seed.channel === "whatsapp" ? seed.phone : null,
        email: `${seed.contact.split(" ")[0].toLowerCase()}@${seed.company.toLowerCase().replace(/[^a-z]/g, "")}.in`, preferred_channel: seed.channel, language: "en", timezone: "Asia/Kolkata", phone_status: "valid", company_id: null,
      },
      requirements: [{ id: `${id}-r`, product_id: null, product_text: seed.product, spec: {}, quantity: String(seed.quantity), unit: "pcs", delivery_country: "IN", delivery_city: seed.city, needed_by: toDate(createdMs + 30 * DAY) }],
      missing_fields: [], lost_reason: seed.lostReason ?? null, lost_note: null,
      ai_summary: `${seed.contact} from ${seed.company} needs ${seed.quantity.toLocaleString("en-IN")} × ${seed.product}, delivered to ${seed.city}.`, ai_summary_at: toIso(now - HOUR),
      personal_contact_shared_at: null,
    });

    const versions = (seed.quotes ?? []).map((quote, index) =>
      buildQuoteVersion(seed.number, index + 1, [{ description: seed.product, quantity: seed.quantity, unitPrice: quote.unitPrice ?? unitPriceOf(seed.product) }], quote.status, now - quote.ageHours * HOUR),
    );
    for (const version of versions) {
      if (version.status === "pending_approval") state.approvals.push(buildApproval(version, seed.number, ownerId, new Date(version.created_at).getTime()));
    }
    state.quotes[id] = versions.reverse();

    // Spread the history evenly so the latest entry lands an hour ago.
    const step = (now - HOUR - createdMs) / seed.history.length;
    state.timeline[id] = seed.history
      .map(([actor, summary], index): TimelineEvent => ({
        id: eventId++, kind: actor === "staff" ? "action" : "message", channel: actor === "staff" ? null : seed.channel, direction: actor === "buyer" ? "in" : actor === "ai" ? "out" : null,
        summary, actor_type: actor, actor_id: actor === "staff" ? ownerId : null, at: toIso(createdMs + step * (index + 1)),
      }))
      .reverse();
  }

  state.changeRequests = createChangeRequests(state, now);
  state.orders = [
    {
      id: demoId("deal", 1009, 9), number: "O-1009", deal_id: demoId("deal", 1009), status: "in_production", production_started_on: toDate(now - 3 * DAY),
      ready_on: null, shipped_on: null, delivered_on: null, tracking_ref: null, created_at: toIso(now - 4 * DAY),
    },
  ];
  return state;
}

/** Two buyers asking to change a quote (§13): one waiting, one already being worked on and past its SLA. */
function createChangeRequests(state: DemoState, now: number): ChangeRequest[] {
  const request = (dealNumber: number, patch: Partial<ChangeRequest>): ChangeRequest => {
    const dealId = demoId("deal", dealNumber);
    return {
      id: demoId("approval", dealNumber, 900), deal_id: dealId, quote_version_id: state.quotes[dealId][0]?.id ?? null, type: "change", buyer_text: "", buyer_text_en: null, fields: [],
      ai_notes: null, status: "open", assigned_to: state.deals.find((deal) => deal.id === dealId)?.owner_user_id ?? null, sla_due_at: toIso(now + 3 * HOUR), escalated_at: null,
      resolved_version_id: null, decline_reason: null, created_at: toIso(now - HOUR), ...patch,
    };
  };
  return [
    request(1045, {
      type: "price_and_quantity", buyer_text: "Can you do ₹8.50 per piece if we take 60,000?",
      fields: [{ field: "quantity", current: "50,000", requested: "60,000" }, { field: "unit_price", current: "₹8.70", requested: "₹8.50" }],
      ai_notes: "₹8.50 is below the minimum for this quantity: the manager decides.",
    }),
    request(1005, {
      type: "delivery", buyer_text: "இந்த மாதம் 25ஆம் தேதிக்குள் டெலிவரி கிடைக்குமா?", buyer_text_en: "Can we get delivery by the 25th of this month?",
      fields: [{ field: "delivery_time", current: "10–12 days", requested: "By the 25th" }], status: "in_progress",
      sla_due_at: toIso(now - HOUR), created_at: toIso(now - 5 * HOUR),
    }),
  ];
}
