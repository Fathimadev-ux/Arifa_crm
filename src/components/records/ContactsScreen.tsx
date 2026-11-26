"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { type Company, type Contact, useCompanies, useContact, useContacts } from "@/lib/api/records";
import { channelLabel, formatDate, humanize } from "@/lib/format";
import { useDebounced } from "@/hooks/useDebounced";
import { type Column, DataTable, SearchBox } from "@/components/DataTable";
import { ExportButtons } from "@/components/ExportButtons";
import { CompanyEditor, ContactEditor } from "@/components/records/RecordEditors";
import { Button, ErrorState, LoadingState, PageHeader, SegmentedControl } from "@/components/ui";

const TABS = [
  { id: "contacts", label: "Contacts" },
  { id: "companies", label: "Companies" },
] as const;

type Tab = (typeof TABS)[number]["id"];

/** §20.6 contacts and companies: search, open one to edit it, add a company. */
export function ContactsScreen() {
  const [tab, setTab] = useState<Tab>("contacts");
  const [search, setSearch] = useState("");
  const query = useDebounced(search.trim());
  const [openId, setOpenId] = useState<string | null>(null);
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const contacts = useContacts(tab === "contacts" ? query : null);
  const companies = useCompanies(tab === "companies" ? query : null);

  const switchTab = (next: Tab) => {
    setTab(next);
    setSearch("");
    setOpenId(null);
    setIsAddingCompany(false);
  };

  const contactColumns: Column<Contact>[] = [
    { label: "Name", cell: (contact) => contact.full_name ?? "—", sub: (contact) => contact.designation, width: "30%" },
    // phone_status: whether the number works (checked by the backend).
    { label: "Phone", cell: (contact) => contact.phone_e164 ?? contact.whatsapp_e164 ?? "—", sub: (contact) => [contact.phone_status && humanize(contact.phone_status), contact.email].filter(Boolean).join(" · "), width: "34%" },
    { label: "Prefers", cell: (contact) => (contact.preferred_channel ? channelLabel(contact.preferred_channel) : "—"), sub: (contact) => contact.language, width: "18%" },
    { label: "Added", cell: (contact) => formatDate(contact.created_at), sub: (contact) => contact.source, width: "18%" },
  ];
  const companyColumns: Column<Company>[] = [
    { label: "Company", cell: (company) => company.name, sub: (company) => company.customer_type, width: "30%" },
    { label: "Location", cell: (company) => [company.city, company.country_code].filter(Boolean).join(", ") || "—", width: "20%" },
    { label: "VAT / TRN", cell: (company) => company.vat_trn ?? "—", width: "18%" },
    { label: "Website", cell: (company) => company.website ?? "—", width: "18%" },
    { label: "Added", cell: (company) => formatDate(company.created_at), width: "14%" },
  ];

  const active = tab === "contacts" ? contacts : companies;
  // An opened row is loaded on its own (GET /v1/contacts/{id}), so the form shows the contact as it is now.
  const openContact = useContact(tab === "contacts" ? openId : null);
  const openCompany = companies.data?.find((company) => company.id === openId);

  return (
    <>
      <PageHeader title="Contacts">
        <SegmentedControl options={TABS} value={tab} onChange={switchTab} label="Records" />
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox value={search} onChange={setSearch} placeholder={tab === "contacts" ? "Search name, email or phone" : "Search companies"} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {tab === "companies" && (
            <Button
              onClick={() => {
                setIsAddingCompany(true);
                setOpenId(null);
              }}
            >
              <Plus className="size-4" /> Company
            </Button>
          )}
          <ExportButtons entity={tab} />
        </div>
      </div>

      <div className="mb-4 empty:hidden">
        {tab === "contacts" &&
          openId &&
          (openContact.data?.id === openId ? (
            <ContactEditor key={openId} contact={openContact.data} onClose={() => setOpenId(null)} />
          ) : openContact.error ? (
            <ErrorState message={openContact.error.message} />
          ) : (
            <div className="h-48 animate-pulse rounded-3xl bg-neutral-100" />
          ))}
        {(openCompany || isAddingCompany) && (
          <CompanyEditor
            key={openCompany?.id ?? "new"}
            company={openCompany ?? null}
            onClose={() => {
              setOpenId(null);
              setIsAddingCompany(false);
            }}
          />
        )}
      </div>

      {active.error && !active.data ? (
        <ErrorState message={active.error.message} />
      ) : tab === "contacts" ? (
        contacts.data ? (
          <DataTable rows={contacts.data} columns={contactColumns} rowKey={(contact) => contact.id} activeKey={openId} onRowClick={(contact) => setOpenId(contact.id)} emptyText="No contacts found" />
        ) : (
          <LoadingState />
        )
      ) : companies.data ? (
        <DataTable rows={companies.data} columns={companyColumns} rowKey={(company) => company.id} activeKey={openId} onRowClick={(company) => (setOpenId(company.id), setIsAddingCompany(false))} emptyText="No companies found" />
      ) : (
        <LoadingState />
      )}
    </>
  );
}
