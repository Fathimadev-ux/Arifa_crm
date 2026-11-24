/** Sample answers for contacts, companies, products, price list, stock and exports (CRM_API.md §20.6–20.12). */
import type { Schemas } from "@/lib/api/client";
import { getRecords } from "./demo-records";
import type { Handler } from "./demo-routes";
import { type Body, canSee, currentUser, getState, json, nowIso, problem, summaryOf } from "./demo-store";

type Change = Schemas["kx__crm__api__screens__ChangeOut"];

let nextId = 1;
const newId = () => `00000000-0000-4000-f000-${String(nextId++).padStart(12, "0")}`;
const matches = (needle: string | null, ...values: (string | null)[]) => !needle || values.some((value) => value?.toLowerCase().includes(needle.toLowerCase()));
const page = <T,>(items: T[]) => json({ items, next_cursor: null });

/** §3 every change is logged, with the old and the new value. */
function logChange(action: string, entityType: string, entityId: string, before: Body | null, after: Body | null) {
  const change: Change = { at: nowIso(), actor_type: "staff", actor_id: currentUser()?.id ?? "", action, entity_type: entityType, entity_id: entityId, before, after };
  getRecords().changes.unshift(change);
}

/** Only the fields that change, as before / after. */
function diff(target: Body, patch: Body): [Body, Body] {
  const keys = Object.keys(patch).filter((key) => patch[key] !== undefined && target[key] !== patch[key]);
  return [Object.fromEntries(keys.map((key) => [key, target[key]])), Object.fromEntries(keys.map((key) => [key, patch[key]]))];
}

/** A list as a CSV download. Sample data can't build Excel files, so both formats come back as CSV. */
function csv(name: string, rows: Body[]) {
  const headers = Object.keys(rows[0] ?? {});
  const cell = (value: unknown) => `"${String(typeof value === "object" && value !== null ? JSON.stringify(value) : (value ?? "")).replace(/"/g, '""')}"`;
  const text = [headers.join(","), ...rows.map((row) => headers.map((header) => cell(row[header])).join(","))].join("\n");
  return new Response(text, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${name}.csv"` } });
}

const tierRows = () => {
  const { tiers, products } = getRecords();
  return tiers.map((tier) => ({ sku: products.find((product) => product.id === tier.product_id)?.sku, min_qty: tier.min_qty, max_qty: tier.max_qty, list_price: tier.list_price, min_price: tier.min_price, currency: tier.currency }));
};

/** A salesperson exports only the deals and orders (and contacts) of their own deals (§20.12). */
function exportRows(entity: string): Body[] {
  const records = getRecords();
  const visibleDealIds = new Set(getState().deals.filter(canSee).map((deal) => deal.id));
  if (entity === "deals") return getState().deals.filter(canSee).map(summaryOf);
  if (entity === "orders") return getState().orders.filter((order) => visibleDealIds.has(order.deal_id));
  if (entity === "contacts") return records.contacts.filter((contact) => getState().deals.some((deal) => deal.contact.id === contact.id && visibleDealIds.has(deal.id)));
  if (entity === "companies") return records.companies;
  return records.products.map(({ spec, ...product }) => ({ ...product, spec }));
}

function withTier(handle: (tier: Schemas["PriceTierOut"], body: Body) => Response): Handler {
  return ([id], body) => {
    const tier = getRecords().tiers.find((item) => item.id === id);
    return tier ? handle(tier, body) : problem(404, "Price tier not found");
  };
}

export const RECORD_ROUTES: [string, RegExp, Handler][] = [
  // ---------- Contacts and companies (§20.6) ----------
  ["GET", /^\/v1\/contacts$/, (_, __, query) => {
    const q = query.get("q");
    const ownContactIds = new Set(getState().deals.filter(canSee).map((deal) => deal.contact.id));
    return page(getRecords().contacts.filter((contact) => ownContactIds.has(contact.id) && matches(q, contact.full_name, contact.email, contact.phone_e164?.replace(/\D/g, "") ?? null)));
  }],
  ["GET", /^\/v1\/contacts\/([^/]+)$/, ([id]) => {
    const contact = getRecords().contacts.find((item) => item.id === id);
    return contact ? json(contact) : problem(404, "Contact not found");
  }],
  ["PATCH", /^\/v1\/contacts\/([^/]+)$/, ([id], body) => {
    const contact = getRecords().contacts.find((item) => item.id === id);
    if (!contact) return problem(404, "Contact not found");
    Object.assign(contact, Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined)));
    const deal = getState().deals.find((item) => item.contact.id === id);
    if (deal) Object.assign(deal.contact, { full_name: contact.full_name, preferred_channel: contact.preferred_channel, language: contact.language, timezone: contact.timezone, company_id: contact.company_id });
    return json(contact);
  }],
  ["GET", /^\/v1\/companies$/, (_, __, query) => page(getRecords().companies.filter((company) => matches(query.get("q"), company.name)))],
  ["POST", /^\/v1\/companies$/, (_, body) => {
    const company = { id: newId(), name: String(body.name), country_code: null, city: null, customer_type: null, vat_trn: null, website: null, notes: null, ...body, created_at: nowIso() } as Schemas["CompanyRow"];
    getRecords().companies.unshift(company);
    return json(company, 201);
  }],
  ["PATCH", /^\/v1\/companies\/([^/]+)$/, ([id], body) => {
    const company = getRecords().companies.find((item) => item.id === id);
    if (!company) return problem(404, "Company not found");
    const [before, after] = diff(company, body);
    Object.assign(company, body);
    logChange("company_updated", "company", id, before, after);
    return json(company);
  }],

  // ---------- Catalogue and price list (§20.7) ----------
  ["GET", /^\/v1\/products$/, (_, __, query) => {
    const category = query.get("category");
    const quotable = query.get("quotable");
    return json(getRecords().products.filter((product) => (!category || product.category_code === category) && (quotable === null || String(product.is_quotable) === quotable)));
  }],
  ["GET", /^\/v1\/products\/([^/]+)$/, ([id]) => {
    const product = getRecords().products.find((item) => item.id === id);
    return product ? json(product) : problem(404, "Product not found");
  }],
  ["PATCH", /^\/v1\/products\/([^/]+)$/, ([id], body) => {
    const product = getRecords().products.find((item) => item.id === id);
    if (!product) return problem(404, "Product not found");
    const patch = Object.fromEntries(Object.entries(body).filter(([, value]) => value !== null && value !== undefined));
    const [before, after] = diff(product, patch);
    Object.assign(product, patch);
    logChange("product.updated", "product", id, before, after);
    return json(product);
  }],
  ["GET", /^\/v1\/products\/([^/]+)\/price-tiers$/, ([id]) => json(getRecords().tiers.filter((tier) => tier.product_id === id).sort((a, b) => Number(a.min_qty) - Number(b.min_qty)))],
  ["POST", /^\/v1\/products\/([^/]+)\/price-tiers$/, ([id], body) => {
    const tier = { id: newId(), product_id: id, min_qty: String(body.min_qty), max_qty: body.max_qty ? String(body.max_qty) : null, list_price: Number(body.list_price).toFixed(2), min_price: body.min_price ? Number(body.min_price).toFixed(2) : null, currency: "INR", valid_from: nowIso() };
    getRecords().tiers.push(tier);
    // Like the backend's log: the product, the quantities, the prices and the start date.
    logChange("price_tier.created", "price_tier", tier.id, null, { product_id: tier.product_id, source: "manual", min_qty: tier.min_qty, max_qty: tier.max_qty, list_price: tier.list_price, min_price: tier.min_price, valid_from: nowIso() });
    return json(tier, 201);
  }],
  ["PATCH", /^\/v1\/price-tiers\/([^/]+)$/, withTier((tier, body) => {
    const patch: Body = {};
    for (const key of ["min_qty", "max_qty", "list_price", "min_price"]) {
      if (body[key] !== undefined) patch[key] = body[key] === null ? null : key.endsWith("price") ? Number(body[key]).toFixed(2) : String(body[key]);
    }
    const [before, after] = diff(tier, patch);
    Object.assign(tier, patch);
    logChange("price_tier.updated", "price_tier", tier.id, before, after);
    return json(tier);
  })],
  ["DELETE", /^\/v1\/price-tiers\/([^/]+)$/, withTier((tier) => {
    getRecords().tiers = getRecords().tiers.filter((item) => item.id !== tier.id);
    logChange("price_tier.deleted", "price_tier", tier.id, { product_id: tier.product_id, min_qty: tier.min_qty, max_qty: tier.max_qty, list_price: tier.list_price, min_price: tier.min_price }, null);
    return new Response(null, { status: 204 });
  })],
  ["GET", /^\/v1\/products\/([^/]+)\/history$/, ([id]) => {
    const tierIds = new Set(getRecords().tiers.filter((tier) => tier.product_id === id).map((tier) => tier.id));
    return json(getRecords().changes.filter((change) => change.entity_id === id || tierIds.has(change.entity_id)));
  }],
  ["GET", /^\/v1\/price-list\/history$/, () => json(getRecords().changes.filter((change) => ["price_tier", "price_list", "catalogue"].includes(change.entity_type)))],
  ["GET", /^\/v1\/price-list\/export$/, () => csv("price-list", tierRows())],
  ["POST", /^\/v1\/price-list\/import$/, () => json({ saved: 0, errors: [{ row: 0, field: "file", error: "Sample data can't read Excel files. This works once the backend is connected." }] })],

  // ---------- Stock (§20.8) ----------
  ["GET", /^\/v1\/stock$/, () => json(getRecords().stock)],
  ["PUT", /^\/v1\/stock$/, (_, body) => {
    const item = getRecords().stock.find((row) => (body.product_id && row.product_id === body.product_id) || (body.material_code && row.material_code === body.material_code));
    if (!item) return problem(404, "Stock item not found");
    logChange("stock_set", "stock", item.id, { quantity: item.quantity }, { quantity: String(body.quantity) });
    item.quantity = String(body.quantity);
    return json(item);
  }],

  // ---------- Exports (§20.12) ----------
  ["GET", /^\/v1\/exports\/([^/]+)$/, ([entity]) => csv(entity, exportRows(entity))],
];
