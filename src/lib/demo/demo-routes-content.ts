/** Sample answers for the 18 Nov endpoints: company details (§5.3), message texts (§5.2) and the product workbook (§5.1). */
import type { CompanyFields, TextChangeOut, TextOut, WorkbookPreview } from "@/lib/api/schema-additions";
import { getRecords } from "./demo-records";
import type { Handler } from "./demo-routes";
import { type Body, currentUser, json, nowIso, problem } from "./demo-store";

// ---------- Company details ----------

/** What company.yaml would print when staff leave a field empty (sample values). */
const DEFAULTS: CompanyFields = {
  name: "Arifa Pack Trading LLC",
  address: "Industrial Area 2, Sharjah, UAE",
  trn: "100000000000003",
  phone: "+97165550000",
  email: "sales@arifapack.com",
  bank: { account_name: "Arifa Pack Trading LLC", bank_name: "Emirates NBD", iban: "AE070331234567890123456", swift: "EBILAEAD" },
};
const BANK_KEYS = ["account_name", "bank_name", "iban", "swift"] as const;
const COMPANY_KEYS = ["name", "address", "trn", "phone", "email"] as const;

const company = {
  saved: { name: null, address: null, trn: null, phone: null, email: null, bank: { account_name: null, bank_name: null, iban: null, swift: null } } as CompanyFields,
  hasLogo: false,
};

const printed = (): CompanyFields => {
  const bank = { ...DEFAULTS.bank! };
  for (const key of BANK_KEYS) bank[key] = company.saved.bank?.[key] || bank[key];
  const fields = { ...DEFAULTS, bank };
  for (const key of COMPANY_KEYS) fields[key] = company.saved[key] || fields[key];
  return fields;
};
const companyOut = () => ({ saved: company.saved, printed: printed(), has_logo: company.hasLogo });

function isIban(value: string) {
  const iban = value.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const digits = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (letter) => String(letter.charCodeAt(0) - 55));
  let remainder = 0;
  for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  return remainder === 1;
}

/** The same checks the backend makes (invalid_company); an empty value clears the field. */
const COMPANY_RULES: [field: string, isValid: (value: string) => boolean, message: string][] = [
  ["trn", (value) => /^\d{15}$/.test(value), "The TRN must have 15 digits"],
  ["phone", (value) => /^\+?[0-9 ()-]{7,20}$/.test(value), "Not a phone number"],
  ["email", (value) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value), "Not an email address"],
  ["bank.iban", isIban, "This IBAN is not valid (check digits)"],
  ["bank.swift", (value) => /^[A-Z0-9]{8}([A-Z0-9]{3})?$/i.test(value), "SWIFT has 8 or 11 characters"],
];

function patchCompany(body: Body) {
  const bank = (body.bank ?? {}) as Record<string, string>;
  const valueOf = (field: string) => (field.startsWith("bank.") ? bank[field.slice(5)] : (body[field] as string | undefined));
  const errors = COMPANY_RULES.filter(([field, isValid]) => {
    const value = valueOf(field);
    return value !== undefined && value !== "" && !isValid(value);
  }).map(([field, , message]) => ({ field, message }));
  if (errors.length) return problem(422, "Some details are not valid", { reason: "invalid_company", errors });
  for (const key of COMPANY_KEYS) if (key in body) company.saved[key] = (body[key] as string) || null;
  for (const key of BANK_KEYS) if (key in bank) company.saved.bank![key] = bank[key] || null;
  return json(companyOut());
}

// ---------- Message texts ----------

const LANGUAGES = ["ar", "hi", "ta", "zh", "si"];

function text(key: string, group: string, note: string, builtin: string, overrides: { en?: string; statuses?: Record<string, string> } = {}): TextOut {
  const placeholders = [...builtin.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
  const languages = group === "staff" ? [] : LANGUAGES.map((language) => ({ language, status: overrides.statuses?.[language] ?? "built-in", text: `[${language}] ${overrides.en ?? builtin}` }));
  return { key, group, note, placeholders, builtin_en: builtin, en: overrides.en ?? builtin, en_version: overrides.en ? 2 : 1, updated_by: null, updated_at: overrides.en ? nowIso() : null, languages };
}

const texts: TextOut[] = [
  text("ai.greeting", "ai", "First reply to a new buyer", "Hello {name}, I'm the Arifa Pack assistant. How can I help you today?"),
  text("ai.handover", "ai", "When a person takes over the chat", "Thank you {name}. {salesperson} from our team will continue with you."),
  text("ai.after_hours", "ai", "A message outside business hours", "Thanks for your message. Our team is back at {opens_at} (Dubai time).", { statuses: { ta: "outdated", si: "missing" } }),
  text("buyer.quote_ready", "buyer", "Message that carries the quote PDF", "Hello {name}, your quote {quote_number} is ready. It is valid for {valid_days} days.", {
    en: "Dear {name}, quote {quote_number} is attached. It is valid for {valid_days} days.",
    statuses: Object.fromEntries(LANGUAGES.map((language) => [language, "translated"])),
  }),
  text("buyer.summary_ready", "buyer", "Message with the Requirement Summary", "Hello {name}, here is the summary of your requirement. Please check it and reply to confirm."),
  text("staff.approval_waiting", "staff", "Alert to the approver", "Quote {quote_number} for {company} is waiting for your approval ({hours} h left)."),
  text("staff.approval_overdue", "staff", "Alert to the manager", "Quote {quote_number} for {company} is overdue."),
];
const textHistory = new Map<string, TextChangeOut[]>();

const AMOUNT_WITH_CURRENCY = /(AED|USD|INR|SAR|EUR|Rs\.?|₹|\$)\s?\d|\d\s?(AED|USD|INR|SAR|EUR)\b/i;

function withText(handle: (item: TextOut, body: Body) => Response): Handler {
  return ([key], body) => {
    const item = texts.find((entry) => entry.key === decodeURIComponent(key));
    return item ? handle(item, body) : problem(404, "Unknown text");
  };
}

function recordChange(item: TextOut, action: string, before: string) {
  const change: TextChangeOut = { at: nowIso(), actor_type: "staff", actor_id: currentUser()?.id ?? "", action, before: { text: before }, after: { text: item.en } };
  textHistory.set(item.key, [change, ...(textHistory.get(item.key) ?? [])]);
}

/** The AI's translations arrive a little later (shortened here from about a minute). */
const translateSoon = (item: TextOut) =>
  setTimeout(() => item.languages.forEach((language) => Object.assign(language, { status: "translated", text: `[${language.language}] ${item.en}` })), 5_000);

function saveText(item: TextOut, body: Body) {
  const next = String(body.text ?? "").trim();
  const used = new Set([...next.matchAll(/\{(\w+)\}/g)].map((match) => match[1]));
  const missing = item.placeholders.filter((name) => !used.has(name));
  const unknown = [...used].filter((name) => !item.placeholders.includes(name));
  if (missing.length || unknown.length) {
    return problem(422, [missing.length && `Keep ${missing.map((name) => `{${name}}`).join(", ")}`, unknown.length && `Unknown ${unknown.map((name) => `{${name}}`).join(", ")}`].filter(Boolean).join(". "), { reason: "invalid_text" });
  }
  if (AMOUNT_WITH_CURRENCY.test(next)) return problem(422, "No prices in texts: prices only ever come from the approved quote", { reason: "invalid_text" });
  const before = item.en;
  Object.assign(item, { en: next, en_version: item.en_version + 1, updated_by: currentUser()?.id ?? null, updated_at: nowIso() });
  item.languages.forEach((language) => (language.status = "outdated"));
  recordChange(item, "text.updated", before);
  if (item.languages.length) translateSoon(item);
  return json(item);
}

// ---------- Product workbook ----------

let previewToken = "";
const newToken = () => Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
const tierRows = (productId: string) =>
  getRecords().tiers.filter((tier) => tier.product_id === productId).map((tier) => [String(tier.min_qty), tier.max_qty === null ? null : String(tier.max_qty), String(tier.list_price), tier.min_price === null ? null : String(tier.min_price)]);

/** A real backend returns an .xlsx; the sample is a CSV of the same products that opens in Excel. */
function workbookFile() {
  const rows = [["code", "name", "category", "moq", "active"], ...getRecords().products.map((product) => [product.sku, product.name, product.category_code, product.moq ?? "", product.is_active ? "Yes" : "No"])];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="product-workbook-sample.csv"' } });
}

/** The sample check ignores the file's cells and shows a typical answer: one update, one new product. */
function previewWorkbook() {
  const [first] = getRecords().products;
  const before = tierRows(first.id);
  const after = before.map((row, index) => (index === 0 ? [row[0], row[1], (Number(row[2]) * 0.98).toFixed(2), row[3]] : row));
  previewToken = newToken();
  const preview: WorkbookPreview = {
    token: previewToken,
    ok: true,
    summary: { new_products: 1, updated_products: 1, unchanged_products: getRecords().products.length - 1, price_lists_changed: 1, categories_changed: 0, website_drafts: 2 },
    errors: [],
    warnings: [{ sheet: "Price tiers", row: 0, column: "code", message: "AP-PP-1500R has no price tiers: it cannot be quoted yet" }],
    products: [
      { code: first.sku, row: 2, is_new: false, changes: [{ field: "moq", before: first.moq, after: (first.moq ?? 0) + 1000 }], website_draft: true },
      { code: "AP-PP-1500R", row: 8, is_new: true, changes: [{ field: "name", before: null, after: "1500ml Round Container" }], website_draft: true },
    ],
    price_lists: [{ code: first.sku, before, after }],
    categories: [],
  };
  return json(preview);
}

function applyWorkbook(query: URLSearchParams) {
  if (!previewToken || query.get("token") !== previewToken) return problem(409, "The catalogue changed since the check: upload the file again");
  previewToken = "";
  const [first] = getRecords().products;
  first.moq = (first.moq ?? 0) + 1000;
  return json({ products_created: 1, products_updated: 1, price_lists_changed: 1, categories_changed: 0, website_drafts: 2 });
}

export const CONTENT_ROUTES: [string, RegExp, Handler][] = [
  ["GET", /^\/v1\/company$/, () => json(companyOut())],
  ["PATCH", /^\/v1\/company$/, (_, body) => patchCompany(body)],
  ["PUT", /^\/v1\/company\/logo$/, () => ((company.hasLogo = true), json(companyOut()))],
  ["DELETE", /^\/v1\/company\/logo$/, () => ((company.hasLogo = false), json(companyOut()))],

  ["GET", /^\/v1\/texts$/, () => json(texts)],
  ["PUT", /^\/v1\/texts\/([^/]+)$/, withText(saveText)],
  ["POST", /^\/v1\/texts\/([^/]+)\/reset$/, withText((item) => {
    const before = item.en;
    Object.assign(item, { en: item.builtin_en, en_version: item.en_version + 1, updated_by: currentUser()?.id ?? null, updated_at: nowIso() });
    item.languages.forEach((language) => Object.assign(language, { status: "built-in", text: `[${language.language}] ${item.builtin_en}` }));
    recordChange(item, "text.reset", before);
    return json(item);
  })],
  ["GET", /^\/v1\/texts\/([^/]+)\/history$/, withText((item) => json(textHistory.get(item.key) ?? []))],
  ["POST", /^\/v1\/texts\/translate-missing$/, () => {
    const waiting = texts.filter((item) => item.languages.some((language) => language.status === "outdated" || language.status === "missing"));
    waiting.forEach(translateSoon);
    return json({ queued: waiting.length });
  }],

  ["GET", /^\/v1\/catalogue\/workbook$/, workbookFile],
  ["POST", /^\/v1\/catalogue\/workbook\/preview$/, previewWorkbook],
  ["POST", /^\/v1\/catalogue\/workbook\/apply$/, (_, __, query) => applyWorkbook(query)],
];
