"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { type ChannelAccount, type Template, type TemplateInput, type TemplateStatus, currentTemplates, editChannelAccount, saveTemplate, setTemplateStatus, useChannelAccounts, useTemplates } from "@/lib/api/admin";
import { channelLabel, formatDateTime, humanize } from "@/lib/format";
import { useStaffNames } from "@/hooks/useStaffNames";
import { type Column, DataTable } from "@/components/DataTable";
import { FormCard, Select, TextArea, TextInput } from "@/components/forms";
import { Button, LoadingState } from "@/components/ui";

const TEMPLATE_STATUSES: TemplateStatus[] = ["draft", "submitted", "approved", "rejected", "paused"];
const CATEGORIES = ["utility", "marketing", "authentication", "internal"] as const;

/** Which countries a WhatsApp number serves, whether it is the default, and on / off (regional routing). */
function AccountEditor({ account, onClose }: { account: ChannelAccount; onClose: () => void }) {
  const [displayName, setDisplayName] = useState(account.display_name);
  const [region, setRegion] = useState(account.region ?? "");
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
      onSubmit={() => void editChannelAccount(account.id, { display_name: displayName.trim(), region: region.trim() || null, countries: codes, is_default: isDefault, status: isActive ? "active" : "disabled" }).then((result) => result && onClose())}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextInput label="Name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={200} />
        <TextInput label="Region" placeholder="Gulf" value={region} onChange={(event) => setRegion(event.target.value)} maxLength={64} />
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

/** Every version of one template, newest first; "live" is the one being sent. */
function TemplateVersions({ versions }: { versions: Template[] }) {
  const { nameOf } = useStaffNames();
  return (
    <div className="space-y-1 border-t border-dashed border-neutral-200 pt-3">
      <p className="text-xs font-semibold text-neutral-500">Versions</p>
      {versions.map((version) => (
        <p key={version.id} className="text-xs text-neutral-600">
          v{version.version} · {humanize(version.provider_status)}
          {version.live && <span className="ml-1.5 rounded-full bg-black px-2 py-0.5 font-medium text-white">Live</span>}
          {version.provider_name && <span className="font-mono text-neutral-400"> · {version.provider_name}</span>} · {formatDateTime(version.created_at)}
          {version.created_by && ` · ${nameOf(version.created_by)}`}
        </p>
      ))}
    </div>
  );
}

/**
 * A message template. Editing the live WhatsApp version makes a new version that waits for Meta; the live one keeps
 * sending until Meta approves it. A version not yet approved is changed in place; email goes live at once.
 */
function TemplateEditor({ template, versions, onClose }: { template: Template | null; versions: Template[]; onClose: () => void }) {
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
      {template?.live && template.channel === "whatsapp" && <p className="text-xs text-neutral-500">This version is live: saving makes a new version for Meta to approve. This one keeps sending until then.</p>}
      {versions.length > 1 && <TemplateVersions versions={versions} />}
    </FormCard>
  );
}

/** §20.11 the company's WhatsApp numbers and email addresses (admin edits) and the message templates (manager, MD, admin). */
export function ChannelsSettings({ canEditNumbers, canEditTemplates }: { canEditNumbers: boolean; canEditTemplates: boolean }) {
  const { data: accounts } = useChannelAccounts();
  const { data: templates } = useTemplates();
  const [openAccountId, setOpenAccountId] = useState<string | null>(null);
  const [openTemplateId, setOpenTemplateId] = useState<string | null>(null);

  if (!accounts || !templates) return <LoadingState />;

  const accountColumns: Column<ChannelAccount>[] = [
    { label: "Number / address", cell: (account) => account.address, sub: (account) => account.display_name, width: "30%" },
    { label: "Channel", cell: (account) => channelLabel(account.channel), sub: (account) => `${humanize(account.purpose)} · ${humanize(account.provider)}`, width: "18%" },
    { label: "Countries", cell: (account) => account.countries.join(", ") || "—", sub: (account) => [account.region, account.is_default && "Default"].filter(Boolean).join(" · ") || undefined, width: "26%" },
    { label: "Status", cell: (account) => humanize(account.status), width: "26%" },
  ];
  const groups = currentTemplates(templates);
  const liveOf = (template: Template) => groups.find((group) => group.newest.id === template.id)?.live ?? null;
  const templateColumns: Column<Template>[] = [
    { label: "Template", cell: (template) => template.name, sub: (template) => template.body, width: "34%" },
    { label: "Channel", cell: (template) => channelLabel(template.channel), sub: (template) => `${humanize(template.category)} · ${template.language}`, width: "18%" },
    {
      label: "Version",
      width: "18%",
      cell: (template) => `v${template.version}`,
      sub: (template) => {
        const live = liveOf(template);
        return template.live ? "Live" : live ? `v${live.version} is live` : "Not live yet";
      },
    },
    {
      label: "Meta approval",
      width: "30%",
      cell: (template) =>
        canEditTemplates && template.channel === "whatsapp" ? (
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
  const openGroup = groups.find((group) => group.newest.id === openTemplateId);
  const openTemplate = openGroup?.newest;

  return (
    <div className="space-y-4 md:space-y-5">
      <h2 className="text-lg font-medium tracking-tight">Numbers and addresses</h2>
      {openAccount && <AccountEditor key={openAccount.id} account={openAccount} onClose={() => setOpenAccountId(null)} />}
      <DataTable rows={accounts} columns={accountColumns} rowKey={(account) => account.id} activeKey={openAccountId} onRowClick={canEditNumbers ? (account) => setOpenAccountId(account.id) : undefined} />

      <div className="flex items-center justify-between pt-2">
        <h2 className="text-lg font-medium tracking-tight">Message templates</h2>
        {canEditTemplates && openTemplateId !== "new" && (
          <Button variant="secondary" onClick={() => setOpenTemplateId("new")}>
            <Plus className="size-4" /> Template
          </Button>
        )}
      </div>
      {(openTemplate || openTemplateId === "new") && <TemplateEditor key={openTemplateId} template={openTemplate ?? null} versions={openGroup?.versions ?? []} onClose={() => setOpenTemplateId(null)} />}
      <DataTable rows={groups.map((group) => group.newest)} columns={templateColumns} rowKey={(template) => template.id} activeKey={openTemplateId} onRowClick={canEditTemplates ? (template) => setOpenTemplateId(template.id) : undefined} />
    </div>
  );
}
