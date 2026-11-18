"use client";

import { ImageUp, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { type BankFields, type CompanyFields, type CompanyIn, LOGO_MAX_BYTES, removeLogo, saveCompany, uploadLogo, useCompany } from "@/lib/api/company";
import { showToast } from "@/components/Toaster";
import { TextArea, TextInput } from "@/components/forms";
import { Button, ErrorState, LoadingState, Section } from "@/components/ui";

const COMPANY_KEYS = ["name", "address", "trn", "phone", "email"] as const;
const BANK_KEYS = ["account_name", "bank_name", "iban", "swift"] as const;
type Draft = Record<(typeof COMPANY_KEYS)[number] | (typeof BANK_KEYS)[number], string>;

const LABELS: Record<keyof Draft, string> = {
  name: "Company name",
  address: "Address",
  trn: "TRN (15 digits)",
  phone: "Phone",
  email: "Email",
  account_name: "Account name",
  bank_name: "Bank",
  iban: "IBAN",
  swift: "SWIFT (8 or 11 characters)",
};

const draftOf = (fields: CompanyFields): Draft => ({
  ...(Object.fromEntries(COMPANY_KEYS.map((key) => [key, fields[key] ?? ""])) as Pick<Draft, (typeof COMPANY_KEYS)[number]>),
  ...(Object.fromEntries(BANK_KEYS.map((key) => [key, fields.bank?.[key] ?? ""])) as Pick<Draft, (typeof BANK_KEYS)[number]>),
});

/** Only what changed; "" clears a field (the default from company.yaml is printed again). */
function changesOf(draft: Draft, saved: Draft): CompanyIn {
  const changes: CompanyIn = {};
  for (const key of COMPANY_KEYS) if (draft[key] !== saved[key]) changes[key] = draft[key].trim();
  const bank: Partial<BankFields> = {};
  for (const key of BANK_KEYS) if (draft[key] !== saved[key]) bank[key] = draft[key].trim();
  if (Object.keys(bank).length) changes.bank = bank as BankFields;
  return changes;
}

/** What quotes print right now, as a small letterhead. */
function PrintedPreview({ printed, hasLogo }: { printed: CompanyFields; hasLogo: boolean }) {
  const bank = printed.bank;
  return (
    <div className="space-y-4 rounded-3xl bg-white p-6 text-sm shadow-sm ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-4 border-b border-dashed border-neutral-200 pb-4">
        <div className="min-w-0">
          <p className="text-lg font-semibold tracking-tight">{printed.name || "—"}</p>
          <p className="whitespace-pre-line text-neutral-500">{printed.address}</p>
        </div>
        <span className={`grid size-14 shrink-0 place-items-center rounded-2xl text-[10px] ${hasLogo ? "bg-black text-white" : "border border-dashed border-neutral-300 text-neutral-400"}`}>{hasLogo ? "Logo" : "No logo"}</span>
      </div>
      <p className="text-neutral-600">
        {printed.trn && <>TRN {printed.trn} · </>}
        {[printed.phone, printed.email].filter(Boolean).join(" · ")}
      </p>
      {bank && (bank.iban || bank.bank_name) && (
        <div className="rounded-2xl bg-neutral-50 p-4 text-xs leading-relaxed text-neutral-600">
          <p className="mb-1 font-semibold text-black">Bank details</p>
          <p>{bank.account_name}</p>
          <p>{bank.bank_name}</p>
          <p className="font-mono">{bank.iban}</p>
          <p>{bank.swift}</p>
        </div>
      )}
    </div>
  );
}

function LogoControls({ hasLogo }: { hasLogo: boolean }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const upload = (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = "";
    if (!file) return;
    if (file.size > LOGO_MAX_BYTES) return showToast("The logo must be 200 KB or smaller");
    void uploadLogo(file);
  };
  return (
    <div className="flex flex-wrap gap-2">
      <input ref={fileInput} type="file" accept="image/png,image/jpeg" hidden onChange={(event) => upload(event.target.files?.[0])} />
      <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()}>
        <ImageUp className="size-4" /> {hasLogo ? "Replace logo" : "Upload logo"}
      </Button>
      {hasLogo && (
        <Button type="button" variant="secondary" onClick={() => void removeLogo()}>
          <Trash2 className="size-4" /> Remove logo
        </Button>
      )}
    </div>
  );
}

/** §5.3 the details printed on quotes and Requirement Summaries. A bank change alerts the MD and the manager. */
export function CompanySettings({ canEdit }: { canEdit: boolean }) {
  const { data: company, error } = useCompany();
  if (error && !company) return <ErrorState message={error.message} />;
  if (!company) return <LoadingState />;
  // A fresh form whenever the saved details change (after a save, or someone else's).
  return <CompanyForm key={JSON.stringify(company.saved)} saved={draftOf(company.saved)} printed={company.printed} hasLogo={company.has_logo} canEdit={canEdit} />;
}

function CompanyForm({ saved, printed, hasLogo, canEdit }: { saved: Draft; printed: CompanyFields; hasLogo: boolean; canEdit: boolean }) {
  const [draft, setDraft] = useState(saved);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isConfirmingBank, setIsConfirmingBank] = useState(false);
  const changes = changesOf(draft, saved);
  const hasChanges = Object.keys(changes).length > 0;
  const printedDraft = draftOf(printed);

  const save = async () => {
    setIsConfirmingBank(false);
    const result = await saveCompany(changes);
    setFieldErrors(result.fieldErrors);
  };

  const field = (key: keyof Draft, isWide = false) => {
    const problem = fieldErrors[key] ?? fieldErrors[`bank.${key}`];
    const onChange = (event: { target: { value: string } }) => {
      setDraft((current) => ({ ...current, [key]: event.target.value }));
      // The old message no longer fits once the field is being corrected.
      if (problem) setFieldErrors((current) => Object.fromEntries(Object.entries(current).filter(([field]) => field !== key && field !== `bank.${key}`)));
    };
    const props = { label: LABELS[key], value: draft[key], placeholder: printedDraft[key], disabled: !canEdit, onChange };
    return (
      <div key={key} className={isWide ? "sm:col-span-2" : undefined}>
        {key === "address" ? <TextArea {...props} rows={2} maxLength={500} /> : <TextInput {...props} maxLength={200} />}
        {problem && <p className="mt-1 px-1 text-xs font-medium">{problem}</p>}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:gap-5">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!hasChanges) return;
          if (changes.bank) setIsConfirmingBank(true);
          else void save();
        }}
      >
        <Section title="Letterhead" index={1}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{COMPANY_KEYS.map((key) => field(key, key === "name" || key === "address"))}</div>
          {canEdit && <LogoControls hasLogo={hasLogo} />}
        </Section>
        <Section title="Bank details on quotes" index={2}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{BANK_KEYS.map((key) => field(key, key === "iban"))}</div>
        </Section>

        {isConfirmingBank ? (
          <div className="animate-enter space-y-3 rounded-3xl bg-black p-5 text-sm text-white">
            <p>Buyers will pay to this account. The MD and manager will be notified.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => void save()} className="press rounded-full bg-white px-4 py-2 font-medium text-black">
                Confirm and save
              </button>
              <button type="button" onClick={() => setIsConfirmingBank(false)} className="press rounded-full px-4 py-2 text-neutral-300 hover:bg-white/10">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          canEdit &&
          hasChanges && (
            <div className="flex gap-2">
              <Button type="submit">Save</Button>
              <Button type="button" variant="secondary" onClick={() => (setDraft(saved), setFieldErrors({}))}>
                Undo changes
              </Button>
            </div>
          )
        )}
      </form>

      <div className="lg:sticky lg:top-4">
        <p className="mb-2 px-1 text-xs text-neutral-500">Printed on quotes now · empty fields use the default</p>
        <PrintedPreview printed={printed} hasLogo={hasLogo} />
      </div>
    </div>
  );
}
