"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { ROLE_LABEL, type Role } from "@/config/roles";
import { type NewStaff, type StaffAccount, type StaffPatch, createStaff, editStaff, resetStaffMfa, setAvailability, unlockStaff, useStaffAccounts } from "@/lib/api/admin";
import { type Column, DataTable } from "@/components/DataTable";
import { FormCard, Select, TextInput } from "@/components/forms";
import { Button, ErrorState, LoadingState } from "@/components/ui";

const ROLE_OPTIONS = (Object.keys(ROLE_LABEL) as Role[]).map((role) => ({ value: role, label: ROLE_LABEL[role] }));
const PHONE_PATTERN = /^\+[1-9][0-9]{6,14}$/;
type AlertChannel = NonNullable<StaffPatch["alert_channels"]>[number];
const ALERT_CHANNELS: { value: AlertChannel; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "call", label: "Call" },
  { value: "in_app", label: "In the CRM" },
];
const alertLabel = (channel: string) => ALERT_CHANNELS.find((option) => option.value === channel)?.label ?? channel;
/** "en, ar" ⇄ ["en", "ar"]: lists typed as comma-separated codes. */
const toList = (text: string, upper = false) => text.split(/[\s,]+/).filter(Boolean).map((item) => (upper ? item.toUpperCase() : item.toLowerCase()));
const joinList = (items: string[] | null | undefined) => (items ?? []).join(", ");

/** Admin (MFA): a new staff user. The one-time password is shown here once, then never again. */
function NewUserForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<NewStaff>({ email: "", full_name: "", role: "sales", phone_e164: "", break_glass: false });
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const update = (patch: Partial<NewStaff>) => setForm((current) => ({ ...current, ...patch }));
  const phoneValid = !form.phone_e164 || PHONE_PATTERN.test(form.phone_e164);

  if (temporaryPassword) {
    return (
      <div className="animate-enter space-y-3 rounded-3xl bg-black p-5 text-white">
        <p className="text-sm">One-time password for {form.full_name}. Share it now: it is not shown again.</p>
        <p className="font-mono text-xl tracking-wider select-all">{temporaryPassword}</p>
        <button onClick={onClose} className="press rounded-full bg-white px-4 py-2 text-sm font-medium text-black">
          Done
        </button>
      </div>
    );
  }

  return (
    <FormCard
      title="New user"
      submitLabel="Add user"
      canSubmit={form.email.includes("@") && form.full_name.trim() !== "" && phoneValid}
      onCancel={onClose}
      onSubmit={() => void createStaff({ ...form, full_name: form.full_name.trim(), phone_e164: form.phone_e164 || null }).then((created) => created && setTemporaryPassword(created.temporary_password))}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextInput label="Name" autoFocus value={form.full_name} onChange={(event) => update({ full_name: event.target.value })} maxLength={200} />
        <TextInput label="Work email" type="email" value={form.email} onChange={(event) => update({ email: event.target.value })} maxLength={320} />
        <Select label="Role" value={form.role} onChange={(event) => update({ role: event.target.value as NewStaff["role"] })} options={ROLE_OPTIONS} />
        <TextInput label="Phone (for calls, e.g. +971501234567)" value={form.phone_e164 ?? ""} onChange={(event) => update({ phone_e164: event.target.value.trim() })} />
      </div>
      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <input type="checkbox" checked={Boolean(form.break_glass)} onChange={(event) => update({ break_glass: event.target.checked })} className="mt-0.5 size-4 accent-black" />
        <span>
          Break-glass account
          <span className="block text-xs text-neutral-500">An emergency account, kept for when no one else can sign in.</span>
        </span>
      </label>
    </FormCard>
  );
}

/**
 * Name, role, phone, active, and what the person is given (§9: languages, countries, product categories) and how
 * they are alerted; plus away with a backup (§9.3). Admin edits users; the manager can set availability.
 */
function UserEditor({ account, staff, canManage, onClose }: { account: StaffAccount; staff: StaffAccount[]; canManage: boolean; onClose: () => void }) {
  const [fullName, setFullName] = useState(account.full_name);
  const [role, setRole] = useState(account.role);
  const [phone, setPhone] = useState(account.phone_e164 ?? "");
  const [isActive, setIsActive] = useState(account.is_active);
  const [languages, setLanguages] = useState(joinList(account.languages));
  const [countries, setCountries] = useState(joinList(account.countries));
  const [categories, setCategories] = useState(joinList(account.category_codes));
  const [alertChannels, setAlertChannels] = useState<string[]>(account.alert_channels ?? []);
  const [isAway, setIsAway] = useState(account.is_away);
  const [backupId, setBackupId] = useState(account.backup_user_id ?? "");
  const backups = staff.filter((member) => member.id !== account.id && member.is_active);
  const countriesValid = toList(countries, true).every((code) => /^[A-Z]{2}$/.test(code));
  const toggleAlert = (channel: string) => setAlertChannels((current) => (current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel]));

  const save = async () => {
    if (canManage) {
      const saved = await editStaff(account.id, {
        full_name: fullName.trim(),
        role: role as NewStaff["role"],
        phone_e164: phone || null,
        is_active: isActive,
        languages: toList(languages),
        countries: toList(countries, true),
        category_codes: toList(categories),
        alert_channels: alertChannels as AlertChannel[],
      });
      if (!saved) return;
    }
    if (isAway !== account.is_away || backupId !== (account.backup_user_id ?? "")) await setAvailability(account.id, isAway, backupId || null);
    onClose();
  };

  return (
    <FormCard title={account.full_name} submitLabel="Save" canSubmit={(!phone || PHONE_PATTERN.test(phone)) && fullName.trim() !== "" && countriesValid} onSubmit={() => void save()} onCancel={onClose}>
      {canManage && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextInput label="Name" value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={200} />
            <Select label="Role" value={role} onChange={(event) => setRole(event.target.value)} options={ROLE_OPTIONS} />
            <TextInput label="Phone" value={phone} onChange={(event) => setPhone(event.target.value.trim())} />
            <TextInput label="Languages (e.g. en, ar, hi)" value={languages} onChange={(event) => setLanguages(event.target.value)} />
            <TextInput label="Countries (2 letters, e.g. AE, IN)" value={countries} onChange={(event) => setCountries(event.target.value)} />
            <TextInput label="Product categories (codes)" placeholder="foil_containers, sauce_cups" value={categories} onChange={(event) => setCategories(event.target.value)} />
          </div>
          <div>
            <p className="mb-1.5 px-1 text-xs text-neutral-500">Alerts by</p>
            <div className="flex flex-wrap gap-4">
              {ALERT_CHANNELS.map((option) => (
                <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={alertChannels.includes(option.value)} onChange={() => toggleAlert(option.value)} className="size-4 accent-black" /> {option.label}
                </label>
              ))}
            </div>
          </div>
        </>
      )}
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
        <Select label="Backup while away" value={backupId} onChange={(event) => setBackupId(event.target.value)} options={[{ value: "", label: "None" }, ...backups.map((member) => ({ value: member.id, label: member.full_name }))]} />
        <div className="flex flex-wrap gap-5 pb-2.5">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={isAway} onChange={(event) => setIsAway(event.target.checked)} className="size-4 accent-black" /> Away
          </label>
          {canManage && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="size-4 accent-black" /> Active
            </label>
          )}
        </div>
      </div>
      {canManage && (
        <div className="flex flex-wrap gap-2 border-t border-dashed border-neutral-200 pt-4">
          <Button type="button" variant="secondary" onClick={() => void resetStaffMfa(account)}>
            Reset authenticator
          </Button>
          {/* Always offered (team decision): the admin can lift a lock-out whenever someone asks. */}
          <Button type="button" variant="secondary" onClick={() => void unlockStaff(account)}>
            Unlock
          </Button>
        </div>
      )}
    </FormCard>
  );
}

/** §20.11 users and roles, with authenticator and lock state. */
export function UsersSettings({ canManage }: { canManage: boolean }) {
  const { data: staff, error } = useStaffAccounts(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  if (error && !staff) return <ErrorState message={error.message} />;
  if (!staff) return <LoadingState />;

  const columns: Column<StaffAccount>[] = [
    { label: "Name", cell: (account) => account.full_name, sub: (account) => account.email, width: "24%" },
    { label: "Role", cell: (account) => ROLE_LABEL[account.role as Role] ?? account.role, sub: (account) => account.phone_e164, width: "14%" },
    { label: "Status", cell: (account) => (!account.is_active ? "Inactive" : account.locked ? "Locked" : account.is_away ? "Away" : "Active"), sub: (account) => (account.totp_enrolled ? "Authenticator set up" : "No authenticator"), width: "16%" },
    {
      label: "Gets deals in",
      cell: (account) => [joinList(account.languages), joinList(account.countries)].filter(Boolean).join(" · ") || "—",
      sub: (account) => joinList(account.category_codes) || undefined,
      width: "18%",
    },
    { label: "Alerts", cell: (account) => (account.alert_channels ?? []).map(alertLabel).join(", ") || "—", width: "14%" },
    { label: "Covers", cell: (account) => staff.find((member) => member.id === account.backup_user_id)?.full_name ?? "—", width: "14%" },
  ];
  const openAccount = staff.find((account) => account.id === openId);

  return (
    <div className="space-y-4">
      {canManage && !isAdding && (
        <Button
          onClick={() => {
            setIsAdding(true);
            setOpenId(null);
          }}
        >
          <Plus className="size-4" /> User
        </Button>
      )}
      {isAdding && <NewUserForm onClose={() => setIsAdding(false)} />}
      {openAccount && <UserEditor key={openAccount.id} account={openAccount} staff={staff} canManage={canManage} onClose={() => setOpenId(null)} />}
      <DataTable rows={staff} columns={columns} rowKey={(account) => account.id} activeKey={openId} onRowClick={(account) => (setOpenId(account.id), setIsAdding(false))} />
    </div>
  );
}
