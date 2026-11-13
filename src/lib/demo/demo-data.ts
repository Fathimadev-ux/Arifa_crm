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

/** One quote version priced from the list (the backend builds every quote; the demo copies that). */
export function buildQuoteVersion(dealNumber: number, version: number, product: string, quantity: number, unitPrice: number, status: string, createdMs: number): QuoteVersion {
  const subtotal = unitPrice * quantity;
  const vat = (subtotal * VAT_RATE) / 100;
  return {
    id: demoId("quote", dealNumber, version), quote_id: demoId("quote", dealNumber), version_no: version, kind: "price_list", status, currency: "INR",
    subtotal: subtotal.toFixed(2), vat_rate: String(VAT_RATE), vat_amount: vat.toFixed(2), total: (subtotal + vat).toFixed(2), total_aed: ((subtotal + vat) * INR_TO_AED).toFixed(2),
    incoterm: "EXW", validity_days: 15, valid_until: toDate(createdMs + 15 * DAY), clauses: [], approver_summary: null,
    delivery_time_text: "10–12 days", delivery_place: null, payment_terms_text: "50% advance, balance before dispatch",
    pdf_s3_key: null, created_at: toIso(createdMs),
    lines: [{ line_no: 1, description: product, quantity: String(quantity), unit: "pcs", unit_price: unitPrice.toFixed(2), line_total: subtotal.toFixed(2) }],
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
  /** The stage a lost deal was lost from, for Reopen. */
  lostFrom: Record<string, DealStage>;
}

export function createDemoState(now: number): DemoState {
  const state: DemoState = { deals: [], quotes: {}, timeline: {}, approvals: [], companyByDeal: {}, lostFrom: {} };
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
      buildQuoteVersion(seed.number, index + 1, seed.product, seed.quantity, quote.unitPrice ?? unitPriceOf(seed.product), quote.status, now - quote.ageHours * HOUR),
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
  return state;
}
