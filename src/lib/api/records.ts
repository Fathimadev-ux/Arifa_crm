"use client";

/** §20.6 contacts and companies, §20.9 orders, §20.12 exports. */
import { api, unwrap, type Schemas } from "./client";
import { runAction } from "./crm";
import { useApi } from "./use-api";

export type Contact = Schemas["ContactRow"];
export type ContactEdit = Schemas["ContactEditIn"];
export type Company = Schemas["CompanyRow"];
export type CompanyInput = Schemas["kx__crm__api__records__CompanyIn"];
export type ExportEntity = "deals" | "contacts" | "companies" | "orders" | "products";
export type ExportFormat = "csv" | "xlsx";

const PAGE_SIZE = 100;

export const useContacts = (search: string) =>
  useApi(`contacts:${search}`, async () => unwrap(await api.GET("/v1/contacts", { params: { query: { q: search || undefined, limit: PAGE_SIZE } } })).items);

export const useCompanies = (search: string) =>
  useApi(`companies:${search}`, async () => unwrap(await api.GET("/v1/companies", { params: { query: { q: search || undefined, limit: PAGE_SIZE } } })).items);

export const useOrders = (status: string) =>
  useApi(`orders:list:${status}`, async () => unwrap(await api.GET("/v1/orders", { params: { query: { status: status || undefined, limit: PAGE_SIZE } } })).items);

/** Phone and email change through the deal (they are the buyer's identity); the rest is edited here. */
export function editContact(id: string, edit: ContactEdit) {
  return runAction(async () => unwrap(await api.PATCH("/v1/contacts/{contact_id}", { params: { path: { contact_id: id } }, body: edit })), "Contact saved", ["contacts"]);
}

export function createCompany(company: CompanyInput) {
  return runAction(async () => unwrap(await api.POST("/v1/companies", { body: company })), `${company.name} added`, ["companies"]);
}

export function editCompany(id: string, company: CompanyInput) {
  return runAction(async () => unwrap(await api.PATCH("/v1/companies/{company_id}", { params: { path: { company_id: id } }, body: company })), `${company.name} saved`, ["companies"]);
}

/** Saves a file the API answered with (it carries the token, so a plain link can't be used). */
export async function saveFile(response: Response, fallbackName: string) {
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const name = disposition.match(/filename="?([^";]+)"?/)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await response.blob());
  const link = Object.assign(document.createElement("a"), { href: url, download: name });
  link.click();
  URL.revokeObjectURL(url);
}

/** §20.12: a list as CSV or Excel (a salesperson only gets their own deals and orders). */
export function exportList(entity: ExportEntity, format: ExportFormat) {
  return runAction(
    async () => {
      const result = await api.GET("/v1/exports/{entity}", { params: { path: { entity }, query: { format } }, parseAs: "stream" });
      unwrap(result);
      await saveFile(result.response, `${entity}.${format}`);
      return true;
    },
    `${entity.charAt(0).toUpperCase()}${entity.slice(1)} exported`,
    [],
  );
}
