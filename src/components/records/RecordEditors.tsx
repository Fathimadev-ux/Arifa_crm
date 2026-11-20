"use client";

import { useState } from "react";
import { type Company, type CompanyInput, type Contact, type ContactEdit, createCompany, editCompany, editContact } from "@/lib/api/records";
import { FormCard, Select, TextArea, TextInput } from "@/components/forms";

const CHANNELS = [
  { value: "", label: "Not set" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
];

type CustomerType = NonNullable<CompanyInput["customer_type"]>;
/** The backend accepts only these customer types (openapi-crm.json, 18 Nov). */
const CUSTOMER_TYPES: { value: CustomerType | ""; label: string }[] = [
  { value: "", label: "Not set" },
  { value: "distributor", label: "Distributor" },
  { value: "restaurant_chain", label: "Restaurant chain" },
  { value: "caterer", label: "Caterer" },
  { value: "airline", label: "Airline" },
  { value: "retailer", label: "Retailer" },
  { value: "manufacturer", label: "Manufacturer" },
  { value: "other", label: "Other" },
];

const optional = (value: string) => value.trim() || null;

/** Name, designation, company, preferred channel, language, time zone. Phone and email change through the deal. */
export function ContactEditor({ contact, companies, onClose }: { contact: Contact; companies: Company[]; onClose: () => void }) {
  const [form, setForm] = useState({
    full_name: contact.full_name ?? "",
    designation: contact.designation ?? "",
    company_id: contact.company_id ?? "",
    preferred_channel: contact.preferred_channel ?? "",
    language: contact.language,
    timezone: contact.timezone,
  });
  const update = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  const save = () => {
    const edit: ContactEdit = {
      full_name: optional(form.full_name),
      designation: optional(form.designation),
      company_id: form.company_id || null,
      preferred_channel: (form.preferred_channel || null) as ContactEdit["preferred_channel"],
      language: optional(form.language),
      timezone: optional(form.timezone),
    };
    void editContact(contact.id, edit).then((result) => result && onClose());
  };

  return (
    <FormCard title={contact.full_name ?? "Contact"} submitLabel="Save" onSubmit={save} onCancel={onClose}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextInput label="Name" value={form.full_name} onChange={(event) => update({ full_name: event.target.value })} maxLength={200} />
        <TextInput label="Designation" value={form.designation} onChange={(event) => update({ designation: event.target.value })} maxLength={200} />
        <Select label="Company" value={form.company_id} onChange={(event) => update({ company_id: event.target.value })} options={[{ value: "", label: "None" }, ...companies.map((company) => ({ value: company.id, label: company.name }))]} />
        <Select label="Prefers" value={form.preferred_channel} onChange={(event) => update({ preferred_channel: event.target.value })} options={CHANNELS} />
        <TextInput label="Language" value={form.language} onChange={(event) => update({ language: event.target.value })} maxLength={16} />
        <TextInput label="Time zone" value={form.timezone} onChange={(event) => update({ timezone: event.target.value })} maxLength={64} />
      </div>
    </FormCard>
  );
}

/** A new company, or an existing one edited (every change is logged). */
export function CompanyEditor({ company, onClose }: { company: Company | null; onClose: () => void }) {
  const [form, setForm] = useState({
    name: company?.name ?? "",
    country_code: company?.country_code ?? "",
    city: company?.city ?? "",
    // An old free-text value that isn't in the list shows as "Not set" until someone picks one.
    customer_type: (CUSTOMER_TYPES.some((option) => option.value === company?.customer_type) ? company?.customer_type : "") as CustomerType | "",
    vat_trn: company?.vat_trn ?? "",
    website: company?.website ?? "",
    notes: company?.notes ?? "",
  });
  const update = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const countryValid = form.country_code === "" || /^[A-Z]{2}$/.test(form.country_code);

  const save = () => {
    const input: CompanyInput = {
      name: form.name.trim(),
      country_code: optional(form.country_code),
      city: optional(form.city),
      customer_type: form.customer_type || null,
      vat_trn: optional(form.vat_trn),
      website: optional(form.website),
      notes: optional(form.notes),
    };
    void (company ? editCompany(company.id, input) : createCompany(input)).then((result) => result && onClose());
  };

  return (
    <FormCard title={company ? company.name : "New company"} submitLabel={company ? "Save" : "Add company"} canSubmit={form.name.trim() !== "" && countryValid} onSubmit={save} onCancel={onClose}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextInput label="Name" autoFocus={!company} value={form.name} onChange={(event) => update({ name: event.target.value })} maxLength={300} />
        <Select label="Customer type" value={form.customer_type} onChange={(event) => update({ customer_type: event.target.value as CustomerType | "" })} options={CUSTOMER_TYPES} />
        <TextInput label="Country (2 letters)" placeholder="AE" value={form.country_code} onChange={(event) => update({ country_code: event.target.value.toUpperCase() })} maxLength={2} />
        <TextInput label="City" value={form.city} onChange={(event) => update({ city: event.target.value })} maxLength={200} />
        <TextInput label="VAT / TRN" value={form.vat_trn} onChange={(event) => update({ vat_trn: event.target.value })} maxLength={64} />
        <TextInput label="Website" value={form.website} onChange={(event) => update({ website: event.target.value })} maxLength={500} />
      </div>
      <TextArea label="Notes" rows={2} value={form.notes} onChange={(event) => update({ notes: event.target.value })} maxLength={4000} />
    </FormCard>
  );
}
