"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { type ChannelAccount, type Template, type TemplateInput, type TemplateStatus, editChannelAccount, saveTemplate, setTemplateStatus, useChannelAccounts, useTemplates } from "@/lib/api/admin";
import { channelLabel, humanize } from "@/lib/format";
import { type Column, DataTable } from "@/components/DataTable";
import { FormCard, Select, TextArea, TextInput } from "@/components/forms";
import { Button, LoadingState } from "@/components/ui";

const TEMPLATE_STATUSES: TemplateStatus[] = ["draft", "submitted", "approved", "rejected", "paused"];
const CATEGORIES = ["utility", "marketing", "authentication", "internal"] as const;

/** Which countries a WhatsApp number serves, whether it is the default, and on / off (regional routing). */
function AccountEditor({ account, onClose }: { account: ChannelAccount; onClose: () => void }) {
  const [displayName, setDisplayName] = useState(account.display_name);
  const [countries, setCountries] = useState(account.countries.join(", "));
  const [isDefault, setIsDefault] = useState(account.is_default);
  const [isActive, setIsActive] = useState(account.status === "active");
  const codes = countries.split(/[\s,]+/).filter(Boolean).map((code) => code.toUpperCase());
  const codesValid = codes.every((code) => /^[A-Z]{2}$/.test(code));

  return (
    <FormCard
      title={account.address}
      submitLabel="Save"
      canSubmit={codesValid && displayName.trim() !== ""}
      onCancel={onClose}
      onSubmit={() => void editChannelAccount(account.id, { display_name: displayName.trim(), countries: codes, is_default: isDefault, status: isActive ? "active" : "disabled" }).then((result) => result && onClose())}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextInput label="Name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={200} />
        <TextInput label="Countries (2-letter codes)" placeholder="AE, SA, OM" value={countries} onChange={(event) => setCountries(event.target.value)} />
      </div>
      <div className="flex gap-5">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} className="size-4 accent-black" /> Default number
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="size-4 accent-black" /> Active
        </label>
      </div>
    </FormCard>
  );
}

/** A message template; a WhatsApp one waits for Meta's approval before it can be sent. */
function TemplateEditor({ template, onClose }: { template: Template | null; onClose: () => void }) {
  const [form, setForm] = useState<TemplateInput>({
    channel: (template?.channel as TemplateInput["channel"]) ?? "whatsapp",
    name: template?.name ?? "",
    language: template?.language ?? "en",
    category: (template?.category as TemplateInput["category"]) ?? "utility",
    subject: template?.subject ?? "",
    body: template?.body ?? "",
    variables: template?.variables ?? [],
  });
  const update = (patch: Partial<TemplateInput>) => setForm((current) => ({ ...current, ...patch }));

  return (
    <FormCard
      title={template ? template.name : "New template"}
      submitLabel="Save template"
      canSubmit={/^[a-z0-9_]{1,64}$/.test(form.name) && form.body.trim() !== "" && (form.language?.length ?? 0) >= 2}
      onCancel={onClose}
      onSubmit={() => void saveTemplate({ ...form, subject: form.subject || null, variables: [...form.body.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]) }).then((result) => result && onClose())}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Select label="Channel" value={form.channel} onChange={(event) => update({ channel: event.target.value as TemplateInput["channel"] })} options={[{ value: "whatsapp", label: "WhatsApp" }, { value: "email", label: "Email" }]} />
        <TextInput label="Name (a-z, 0-9, _)" value={form.name} onChange={(event) => update({ name: event.target.value })} disabled={Boolean(template)} />
        <TextInput label="Language" value={form.language} onChange={(event) => update({ language: event.target.value })} maxLength={16} />
        <Select label="Category" value={form.category} onChange={(event) => update({ category: event.target.value as TemplateInput["category"] })} options={CATEGORIES.map((value) => ({ value, label: humanize(value) }))} />
      </div>
      {form.channel === "email" && <TextInput label="Subject" value={form.subject ?? ""} onChange={(event) => update({ subject: event.target.value })} maxLength={300} />}
      <TextArea label="Message ({{name}} for a variable)" rows={4} value={form.body} onChange={(event) => update({ body: event.target.value })} maxLength={4000} />
    </FormCard>
  );
}

/** §20.11 the company's WhatsApp numbers and email addresses, and the message templates. Admin edits. */
export function ChannelsSettings({ canEdit }: { canEdit: boolean }) {
  const { data: accounts } = useChannelAccounts();
  const { data: templates } = useTemplates();
  const [openAccountId, setOpenAccountId] = useState<string | null>(null);
  const [openTemplateId, setOpenTemplateId] = useState<string | null>(null);

  if (!accounts || !templates) return <LoadingState />;

  const accountColumns: Column<ChannelAccount>[] = [
    { label: "Number / address", cell: (account) => account.address, sub: (account) => account.display_name, width: "30%" },
    { label: "Channel", cell: (account) => channelLabel(account.channel), sub: (account) => humanize(account.purpose), width: "18%" },
    { label: "Countries", cell: (account) => account.countries.join(", ") || "—", sub: (account) => (account.is_default ? "Default" : undefined), width: "26%" },
    { label: "Status", cell: (account) => humanize(account.status), width: "26%" },
  ];
  const templateColumns: Column<Template>[] = [
    { label: "Template", cell: (template) => template.name, sub: (template) => template.body, width: "40%" },
    { label: "Channel", cell: (template) => channelLabel(template.channel), sub: (template) => `${humanize(template.category)} · ${template.language}`, width: "22%" },
    {
      label: "Meta approval",
      width: "38%",
      cell: (template) =>
        canEdit && template.channel === "whatsapp" ? (
          <select
            value={template.provider_status}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => void setTemplateStatus(template, event.target.value as TemplateStatus)}
            aria-label="Meta approval"
            className="cursor-pointer rounded-full bg-transparent px-2 py-1 font-medium outline-none hover:bg-black/5"
          >
            {TEMPLATE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {humanize(status)}
              </option>
            ))}
          </select>
        ) : (
          humanize(template.provider_status)
        ),
    },
  ];
  const openAccount = accounts.find((account) => account.id === openAccountId);
  const openTemplate = templates.find((template) => template.id === openTemplateId);

  return (
    <div className="space-y-4 md:space-y-5">
      <h2 className="text-lg font-medium tracking-tight">Numbers and addresses</h2>
      {openAccount && <AccountEditor key={openAccount.id} account={openAccount} onClose={() => setOpenAccountId(null)} />}
      <DataTable rows={accounts} columns={accountColumns} rowKey={(account) => account.id} activeKey={openAccountId} onRowClick={canEdit ? (account) => setOpenAccountId(account.id) : undefined} />

      <div className="flex items-center justify-between pt-2">
        <h2 className="text-lg font-medium tracking-tight">Message templates</h2>
        {canEdit && openTemplateId !== "new" && (
          <Button variant="secondary" onClick={() => setOpenTemplateId("new")}>
            <Plus className="size-4" /> Template
          </Button>
        )}
      </div>
      {(openTemplate || openTemplateId === "new") && <TemplateEditor key={openTemplateId} template={openTemplate ?? null} onClose={() => setOpenTemplateId(null)} />}
      <DataTable rows={templates} columns={templateColumns} rowKey={(template) => template.id} activeKey={openTemplateId} onRowClick={canEdit ? (template) => setOpenTemplateId(template.id) : undefined} />
    </div>
  );
}
