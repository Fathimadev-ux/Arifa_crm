/**
 * The 18 Nov endpoints (CRM_API.pdf §5.1–5.3) that the generated schema.d.ts doesn't have yet, typed by hand from
 * the PDF's reference pages in the same shape openapi-typescript writes. Once the backend team sends the new
 * docs/openapi-crm.json, run `npm run api:types`, delete this file and drop `& AddedPaths` in client.ts.
 */
import type { components } from "./schema";

type Json<T> = { headers: { [name: string]: unknown }; content: { "application/json": T } };
type NoParams = { query?: never; header?: never; path?: never; cookie?: never };
type KeyPath = { query?: never; header?: never; path: { key: string }; cookie?: never };
type Unused = { put?: never; post?: never; delete?: never; options?: never; head?: never; patch?: never; trace?: never; get?: never };
type Operation<Params, Body, Response> = {
  parameters: Params;
  requestBody: Body extends undefined ? never : { content: { "application/json": Body } };
  responses: { 200: Json<Response> };
};
type NoBody<Params, Response> = { parameters: Params; requestBody?: never; responses: { 200: Json<Response> } };

// ---------- Company details (§5.3) ----------

export interface BankFields {
  account_name: string | null;
  bank_name: string | null;
  iban: string | null;
  swift: string | null;
}

export interface CompanyFields {
  name: string | null;
  address: string | null;
  trn: string | null;
  phone: string | null;
  email: string | null;
  bank: BankFields | null;
}

/** `saved` is what staff set (empty = the default from company.yaml); `printed` is what quotes print now. */
export interface CompanyOut {
  saved: CompanyFields;
  printed: CompanyFields;
  has_logo: boolean;
}

export type CompanyIn = Partial<CompanyFields>;

// ---------- Message texts (§5.2) ----------

export interface LanguageOut {
  language: string;
  /** built-in, edited, translated, outdated (the old translation is still sent) or missing (English is sent). */
  status: string;
  text: string | null;
}

export interface TextOut {
  key: string;
  /** ai, buyer or staff. */
  group: string;
  /** Where the text is used. */
  note: string;
  placeholders: string[];
  builtin_en: string;
  en: string;
  en_version: number;
  updated_by: string | null;
  updated_at: string | null;
  languages: LanguageOut[];
}

export interface TextChangeOut {
  at: string;
  actor_type: string;
  actor_id: string;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

// ---------- Product workbook (§5.1) ----------

export interface IssueOut {
  sheet: string;
  row: number;
  column: string;
  message: string;
}

export interface FieldChangeOut {
  field: string;
  before: unknown;
  after: unknown;
}

export interface ProductChangeOut {
  code: string;
  row: number;
  is_new: boolean;
  changes: FieldChangeOut[];
  website_draft: boolean;
}

/** Tiers as rows [from qty, to qty, list price, minimum price]; null = no upper limit / no minimum. */
export interface TierChangeOut {
  code: string;
  before: (string | null)[][] | null;
  after: (string | null)[][] | null;
}

export interface CategoryChangeOut {
  code: string;
  is_new: boolean;
  changes: FieldChangeOut[];
}

export interface WorkbookSummary {
  new_products: number;
  updated_products: number;
  unchanged_products: number;
  price_lists_changed: number;
  categories_changed: number;
  website_drafts: number;
}

export interface WorkbookPreview {
  token: string;
  ok: boolean;
  summary: WorkbookSummary;
  errors: IssueOut[];
  warnings: IssueOut[];
  products: ProductChangeOut[];
  price_lists: TierChangeOut[];
  categories: CategoryChangeOut[];
}

export interface WorkbookApplied {
  products_created: number;
  products_updated: number;
  price_lists_changed: number;
  categories_changed: number;
  website_drafts: number;
}

// ---------- Template versions (§5.2): fields the 18 Nov TemplateOut added ----------

export type TemplateVersion = components["schemas"]["TemplateOut"] & {
  version: number;
  /** The name submitted to Meta, e.g. quote_ready_v2. */
  provider_name: string | null;
  /** The version being sent. */
  live?: boolean;
  created_by: string | null;
  created_at: string;
};

// ---------- Paths ----------

export interface AddedPaths {
  "/v1/company": Omit<Unused, "get" | "patch"> & {
    parameters: NoParams;
    get: NoBody<NoParams, CompanyOut>;
    patch: Operation<NoParams, CompanyIn, CompanyOut>;
  };
  "/v1/company/logo": Omit<Unused, "put" | "delete"> & {
    parameters: NoParams;
    /** Body: the PNG or JPEG file itself, max 200 KB. */
    put: NoBody<NoParams, CompanyOut>;
    delete: NoBody<NoParams, CompanyOut>;
  };
  "/v1/texts": Omit<Unused, "get"> & { parameters: NoParams; get: NoBody<NoParams, TextOut[]> };
  "/v1/texts/{key}": Omit<Unused, "put"> & { parameters: KeyPath; put: Operation<KeyPath, { text: string }, TextOut> };
  "/v1/texts/{key}/reset": Omit<Unused, "post"> & { parameters: KeyPath; post: NoBody<KeyPath, TextOut> };
  "/v1/texts/{key}/history": Omit<Unused, "get"> & {
    parameters: KeyPath;
    get: NoBody<{ query?: { limit?: number }; header?: never; path: { key: string }; cookie?: never }, TextChangeOut[]>;
  };
  "/v1/texts/translate-missing": Omit<Unused, "post"> & { parameters: NoParams; post: NoBody<NoParams, { queued: number }> };
  "/v1/catalogue/workbook": Omit<Unused, "get"> & { parameters: NoParams; get: NoBody<NoParams, unknown> };
  /** Body: the .xlsx file itself, max 10 MB. Saves nothing. */
  "/v1/catalogue/workbook/preview": Omit<Unused, "post"> & { parameters: NoParams; post: NoBody<NoParams, WorkbookPreview> };
  /** Body: the same .xlsx as the preview. */
  "/v1/catalogue/workbook/apply": Omit<Unused, "post"> & {
    parameters: NoParams;
    post: NoBody<{ query: { token: string }; header?: never; path?: never; cookie?: never }, WorkbookApplied>;
  };
}
