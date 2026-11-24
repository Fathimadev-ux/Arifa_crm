/**
 * Sample records for the screens beyond deals: companies and contacts (from the sample deals), the product
 * catalogue with price tiers, stock, business settings, FX, channels, templates, material rates, kill switch.
 */
import type { Schemas } from "@/lib/api/client";
import { DEMO_STAFF, unitPriceOf } from "./demo-data";
import { getState } from "./demo-store";

type S = Schemas;

const HOUR = 3_600_000;
const DAY = 86_400_000;
const toIso = (ms: number) => new Date(ms).toISOString();

export interface RecordsState {
  staff: S["UserAdminOut"][];
  companies: S["CompanyRow"][];
  contacts: S["ContactRow"][];
  products: S["ProductRow"][];
  tiers: S["PriceTierOut"][];
  changes: S["kx__crm__api__screens__ChangeOut"][];
  stock: S["StockOut"][];
  settings: S["SettingOut"][];
  fx: S["FxRow"][];
  channels: S["ChannelAccountOut"][];
  templates: S["TemplateOut"][];
  rates: S["RateOut"][];
  freshness: S["FreshnessOut"][];
  killSwitch: S["KillSwitchIn"]["level"];
}

const PRODUCTS: [name: string, sku: string, category: string, capacity: number, material: string][] = [
  ["750ml Round Container", "AP-PP-750R", "plastic_containers", 750, "PP"],
  ["500ml Rectangular Container", "AP-PP-500S", "plastic_containers", 500, "PP"],
  ["1000ml Round Container", "AP-PP-1000R", "plastic_containers", 1000, "PP"],
  ["450ml Foil Container", "AP-AL-450", "foil_containers", 450, "Aluminium 8011"],
  ["660ml Foil Container", "AP-AL-660", "foil_containers", 660, "Aluminium 8011"],
  ["250ml Sauce Cup", "AP-PP-250C", "sauce_cups", 250, "PP"],
];

// A valid UUID (hex only, as the API requires): the kind letter becomes its character code, e.g. "p" → "0070".
const id = (kind: string, n: number) => `00000000-0000-4000-e000-${[...kind].map((letter) => letter.charCodeAt(0).toString(16)).join("").slice(-4).padStart(4, "0")}${String(n).padStart(8, "0")}`;

function setting(key: string, value: unknown, description: string, now: number): S["SettingOut"] {
  return { key, value, description, updated_at: toIso(now - 9 * DAY) };
}

export function createRecordsState(now: number): RecordsState {
  const { deals, companyByDeal } = getState();
  const records: RecordsState = {
    staff: DEMO_STAFF.map((member) => ({ ...member })),
    companies: [], contacts: [], products: [], tiers: [], changes: [], stock: [], settings: [], fx: [], channels: [], templates: [], rates: [], freshness: [],
    killSwitch: "off",
  };

  deals.forEach((deal, index) => {
    const companyId = id("c", index + 1);
    const requirement = deal.requirements[0];
    records.companies.push({
      id: companyId, name: companyByDeal[deal.id], country_code: "IN", city: requirement?.delivery_city ?? null, customer_type: "caterer",
      vat_trn: null, website: null, notes: null, created_at: toIso(now - (20 + index) * DAY),
    });
    deal.contact.company_id = companyId;
    records.contacts.push({
      id: deal.contact.id, full_name: deal.contact.full_name, designation: "Purchase manager", company_id: companyId, phone_e164: deal.contact.phone_e164,
      whatsapp_e164: deal.contact.whatsapp_e164, email: deal.contact.email, preferred_channel: deal.contact.preferred_channel, language: deal.contact.language,
      timezone: deal.contact.timezone, phone_status: "valid", source: deal.contact.preferred_channel === "email" ? "email" : "website_chat", created_at: toIso(now - (10 + index) * DAY),
    });
  });

  PRODUCTS.forEach(([name, sku, category, capacity, material], index) => {
    const productId = id("p", index + 1);
    const price = unitPriceOf(name);
    records.products.push({
      id: productId, sku, name, category_code: category, unit: "pcs", moq: 5000, carton_qty: category === "sauce_cups" ? 2000 : 500, is_active: true, is_quotable: true,
      custom_printing: category !== "sauce_cups", default_lead_days_min: 10, default_lead_days_max: 12, spec: { capacity_ml: capacity, material, colour: category === "foil_containers" ? "Silver" : "Clear" },
      cms_product_id: `cms-${sku.toLowerCase()}`, cms_published: true, cms_synced_at: toIso(now - 2 * DAY),
    });
    const tiers: [number, number | null, number, number][] = [
      [5000, 9999, price * 1.08, price],
      [10000, 49999, price, price * 0.95],
      [50000, null, price * 0.96, price * 0.9],
    ];
    tiers.forEach(([minQty, maxQty, listPrice, minPrice], tier) => {
      records.tiers.push({
        id: id("t", index * 10 + tier + 1), product_id: productId, min_qty: String(minQty), max_qty: maxQty === null ? null : String(maxQty),
        list_price: listPrice.toFixed(2), min_price: minPrice.toFixed(2), currency: "INR", valid_from: toIso(now - 30 * DAY),
      });
    });
    records.stock.push({ id: id("s", index + 1), item_type: "product", product_id: productId, material_code: null, quantity: String(40000 + index * 12500), reserved_quantity: String(index % 3 === 0 ? 20000 : 0), unit: "pcs" });
  });

  const managerId = DEMO_STAFF.find((member) => member.role === "manager")!.id;
  // Shaped like the backend's log (the team's screenshot): a workbook upload, the tiers it created, a price change.
  const firstProductId = records.products[0]?.id ?? id("p", 1);
  records.changes.push(
    { at: toIso(now - 1 * DAY), actor_type: "staff", actor_id: managerId, action: "catalogue.workbook_applied", entity_type: "catalogue", entity_id: id("w", 1), before: null, after: { sha256: "196375f6a21260560ebdfc6cd2f7da42", website_drafts: 1, products_created: 0, products_updated: 1, categories_changed: 0, price_lists_changed: 1 } },
    { at: toIso(now - 1 * DAY), actor_type: "staff", actor_id: managerId, action: "price_tier.created", entity_type: "price_tier", entity_id: id("t", 90), before: null, after: { product_id: firstProductId, source: "workbook", min_qty: "5000", max_qty: "19999", list_price: "0.68", min_price: "0.58", valid_from: toIso(now - 1 * DAY) } },
    { at: toIso(now - 2 * DAY), actor_type: "staff", actor_id: managerId, action: "price_list.imported", entity_type: "price_list", entity_id: id("w", 2), before: null, after: { rows: 5, products: ["AP-PP-750R", "AP-PP-500S"], valid_from: toIso(now - 2 * DAY) } },
    { at: toIso(now - 3 * DAY), actor_type: "staff", actor_id: managerId, action: "price_tier.updated", entity_type: "price_tier", entity_id: id("t", 2), before: { product_id: firstProductId, list_price: "9.10" }, after: { product_id: firstProductId, list_price: "9.20" } },
    { at: toIso(now - 6 * DAY), actor_type: "staff", actor_id: managerId, action: "product.updated", entity_type: "product", entity_id: id("p", 4), before: { moq: 2000 }, after: { moq: 5000 } },
  );

  records.stock.push(
    { id: id("s", 20), item_type: "material", product_id: null, material_code: "AL-8011", quantity: "12500", reserved_quantity: "3000", unit: "kg" },
    { id: id("s", 21), item_type: "material", product_id: null, material_code: "PP-RESIN", quantity: "8200", reserved_quantity: "0", unit: "kg" },
  );

  records.settings = [
    setting("approval_sla_hours", 3, "Hours a quote approval may wait before it is overdue", now),
    setting("follow_up_days", [2, 5, 10], "Days after a quote when the AI follows up", now),
    setting("vat_rate_pct", 5, "VAT added to quotes (%)", now),
    setting("default_incoterm", "EXW", "Incoterm on new quotes", now),
    setting("quote_validity_days", 15, "How long a quote is valid", now),
    setting("business_hours", { days: "Mon–Sat", start: "09:00", end: "18:00", timezone: "Asia/Dubai" }, "When staff alerts and calls happen", now),
    setting("opt_out_keywords", ["STOP", "UNSUBSCRIBE", "NO MORE"], "Words that count as a stop from the buyer", now),
    setting("feature.price_scraper", false, "Material price proposals from the scraper (v2)", now),
    setting("feature.voice_calls", false, "AI voice calls (v2)", now),
  ];

  records.fx = [
    // §5.4: a daily job stores these; a manager's rate for a day is never replaced by it.
    { currency: "USD", rate_to_aed: "3.6725", as_of: toIso(now).slice(0, 10), source: "auto:open-er-api" },
    { currency: "INR", rate_to_aed: "0.0440", as_of: toIso(now).slice(0, 10), source: "auto:open-er-api" },
    { currency: "SAR", rate_to_aed: "0.9793", as_of: toIso(now).slice(0, 10), source: "auto:open-er-api" },
    { currency: "EUR", rate_to_aed: "3.9810", as_of: toIso(now - DAY).slice(0, 10), source: "manual" },
  ];

  records.channels = [
    { id: id("w", 1), channel: "whatsapp", provider: "meta", display_name: "Arifa Pack UAE", address: "+97143334444", purpose: "sales", status: "active", region: "Gulf", countries: ["AE", "OM", "QA"], is_default: true, created_at: toIso(now - 90 * DAY) },
    { id: id("w", 2), channel: "whatsapp", provider: "meta", display_name: "Arifa Pack India", address: "+914442223333", purpose: "sales", status: "active", region: "India", countries: ["IN"], is_default: false, created_at: toIso(now - 60 * DAY) },
    { id: id("w", 3), channel: "email", provider: "smtp", display_name: "Arifa Pack Sales", address: "sales@arifapack.com", purpose: "sales", status: "active", region: null, countries: [], is_default: true, created_at: toIso(now - 90 * DAY) },
  ];

  const template = (n: number, channel: string, name: string, category: string, status: string, body: string, version = 1, subject: string | null = null): S["TemplateOut"] => ({
    id: id("m", n), channel, name, language: "en", category, provider_status: status, subject, body, variables: [...body.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]),
    version, provider_name: version > 1 ? `${name}_v${version}` : name, live: status === "approved", created_by: null, created_at: toIso(now - n * DAY), updated_at: toIso(now - n * DAY),
  });
  // Every version, newest first (§5.2): quote_follow_up v2 waits for Meta while v1 keeps sending.
  records.templates = [
    template(5, "whatsapp", "quote_follow_up", "utility", "submitted", "Hello {{name}}, any questions about quote {{quote}}? We're happy to help.", 2),
    template(1, "whatsapp", "quote_follow_up", "utility", "approved", "Hello {{name}}, did you get a chance to look at quote {{quote}}?"),
    template(2, "whatsapp", "reopen_conversation", "utility", "approved", "Hello {{name}}, {{salesperson}} from Arifa Pack here. Shall we continue?"),
    template(3, "email", "quote_email", "utility", "approved", "Dear {{name}},\n\nPlease find our quote {{quote}} attached.", 1, "Your quote from Arifa Pack"),
    template(4, "whatsapp", "festive_offer", "marketing", "submitted", "Season's greetings {{name}}! Special prices on foil containers this month."),
  ];

  records.rates = [
    { id: id("r", 1), material_code: "AL-8011", rate_per_unit: "8.45", currency: "AED", source: "scraper", source_url: null, change_pct: "2.4", status: "proposed", proposed_at: toIso(now - 5 * HOUR), decided_at: null, note: null },
    { id: id("r", 2), material_code: "PP-RESIN", rate_per_unit: "4.10", currency: "AED", source: "staff", source_url: null, change_pct: "-1.2", status: "proposed", proposed_at: toIso(now - 26 * HOUR), decided_at: null, note: null },
  ];
  records.freshness = [
    { material_code: "AL-8011", days_since_approval: 3, level: "ok" },
    { material_code: "PP-RESIN", days_since_approval: 12, level: "warn" },
    { material_code: "PET", days_since_approval: 41, level: "block" },
  ];
  return records;
}

let records: RecordsState | null = null;
export const getRecords = () => (records ??= createRecordsState(Date.now()));
