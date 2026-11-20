"use client";

/** §5.3 company details printed on quotes and Requirement Summaries: letterhead, logo and bank details. */
import { ApiError, api, unwrap, type Schemas } from "./client";
import { runAction } from "./crm";
import { useApi } from "./use-api";

export type BankFields = Required<Schemas["BankIn"]>;
export type CompanyIn = Schemas["kx__crm__api__company__CompanyIn"];

/** The OpenAPI file leaves `saved` and `printed` open; CRM_API.md §5.3 lists their fields (the same as CompanyIn). */
export interface CompanyFields {
  name: string | null;
  address: string | null;
  trn: string | null;
  phone: string | null;
  email: string | null;
  bank: BankFields | null;
}

/** `saved` is what staff set (empty = the default from company.yaml); `printed` is what quotes print now. */
export type CompanyOut = Omit<Schemas["CompanyOut"], "saved" | "printed"> & { saved: CompanyFields; printed: CompanyFields };

const COMPANY = "company";
export const LOGO_MAX_BYTES = 200 * 1024;

export const useCompany = () => useApi(COMPANY, async () => unwrap(await api.GET("/v1/company")) as unknown as CompanyOut);

/**
 * Only the changed fields; "" clears one. A bank change alerts the MD and the manager. A refusal (invalid_company)
 * comes back per field: TRN 15 digits, IBAN checksum, SWIFT 8 or 11, email and phone format.
 */
export async function saveCompany(changes: CompanyIn): Promise<{ isSaved: boolean; fieldErrors: Record<string, string> }> {
  let fieldErrors: Record<string, string> = {};
  const saved = await runAction(
    async () => {
      try {
        return unwrap(await api.PATCH("/v1/company", { body: changes }));
      } catch (error) {
        if (error instanceof ApiError) fieldErrors = Object.fromEntries(error.fields.map((problem) => [problem.field, problem.message]));
        throw error;
      }
    },
    "Company details saved: new quotes use them within 30 seconds",
    [COMPANY],
  );
  return { isSaved: Boolean(saved), fieldErrors };
}

/** The PNG or JPEG file itself is the body (max 200 KB). */
export function uploadLogo(file: File) {
  return runAction(
    async () =>
      unwrap(
        await api.PUT("/v1/company/logo", {
          body: file as never,
          bodySerializer: (body: unknown) => body as BodyInit,
          headers: { "Content-Type": file.type },
        }),
      ),
    "Logo saved",
    [COMPANY],
  );
}

export function removeLogo() {
  return runAction(async () => unwrap(await api.DELETE("/v1/company/logo")), "Logo removed", [COMPANY]);
}
