"use client";

import { useState } from "react";
import { changeMyPassword, confirmAuthenticator, setAvailability, startAuthenticatorSetup, useStaffAccounts } from "@/lib/api/admin";
import { MIN_PASSWORD_LENGTH } from "@/lib/api/auth";
import { useSession } from "@/store/session";
import { ROLE_LABEL, can } from "@/config/roles";
import { FormCard, Select, TextInput } from "@/components/forms";
import { Button, LoadingState, PageHeader, Section } from "@/components/ui";

/** Changing the password ends every other session. */
function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  if (!isOpen) return <Button variant="secondary" onClick={() => setIsOpen(true)}>Change password</Button>;
  const close = () => {
    setIsOpen(false);
    setCurrent("");
    setNext("");
  };
  return (
    <FormCard title="Change password" submitLabel="Change password" canSubmit={current !== "" && next.length >= MIN_PASSWORD_LENGTH} onCancel={close} onSubmit={() => void changeMyPassword(current, next).then((result) => result !== undefined && close())}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextInput label="Current password" type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} />
        <TextInput label={`New password (at least ${MIN_PASSWORD_LENGTH} characters)`} type="password" autoComplete="new-password" value={next} onChange={(event) => setNext(event.target.value)} />
      </div>
    </FormCard>
  );
}

/** D26: a new authenticator key; it switches on with the first code. Approvals need it (an email-code session can't approve). */
function AuthenticatorSetup() {
  const [setup, setSetup] = useState<{ secret: string; otpauth_uri: string } | null>(null);
  const [code, setCode] = useState("");
  if (!setup) return <Button variant="secondary" onClick={() => void startAuthenticatorSetup().then((result) => result && setSetup(result))}>Set up authenticator app</Button>;
  return (
    <FormCard title="Set up authenticator app" submitLabel="Turn on" canSubmit={code.length >= 6} onCancel={() => setSetup(null)} onSubmit={() => void confirmAuthenticator(code).then((result) => result !== undefined && setSetup(null))}>
      <p className="text-sm text-neutral-600">In Google Authenticator or Microsoft Authenticator, add an account with this key, then type the 6-digit code it shows.</p>
      <p className="rounded-2xl bg-black/[0.04] px-4 py-3 font-mono text-sm tracking-wider break-all select-all">{setup.secret}</p>
      <a href={setup.otpauth_uri} className="inline-block text-xs text-neutral-500 underline-offset-2 hover:text-black hover:underline">
        Open in the authenticator app (on this phone)
      </a>
      <TextInput label="6-digit code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} maxLength={10} />
    </FormCard>
  );
}

/** §9.3 away / holiday: the backup covers this person's deals meanwhile. */
function Availability({ userId, isAway }: { userId: string; isAway: boolean }) {
  const { role } = useSession();
  const { data: staff } = useStaffAccounts(can(role, "LIST_STAFF"));
  const [backupId, setBackupId] = useState("");
  const backups = staff?.filter((member) => member.id !== userId && member.is_active) ?? [];

  if (isAway) return <Button onClick={() => void setAvailability(userId, false, null)}>I&apos;m back</Button>;
  return (
    <div className="flex flex-wrap items-end gap-2">
      {backups.length > 0 && (
        <Select label="Who covers" value={backupId} onChange={(event) => setBackupId(event.target.value)} options={[{ value: "", label: "Choose later" }, ...backups.map((member) => ({ value: member.id, label: member.full_name }))]} className="w-56" />
      )}
      <Button variant="secondary" onClick={() => void setAvailability(userId, true, backupId || null)}>
        I&apos;m away
      </Button>
    </div>
  );
}

/** The signed-in person's own account: password, authenticator, away. */
export function AccountScreen() {
  const { user, role } = useSession();
  if (!user) return <LoadingState />;
  return (
    <div className="mx-auto max-w-3xl space-y-4 md:space-y-5">
      <PageHeader title={user.full_name} subtitle={`${ROLE_LABEL[role]} · ${user.email}`} />
      <Section title="Sign-in" index={1}>
        <div className="flex flex-wrap items-start gap-3">
          <PasswordForm />
          <AuthenticatorSetup />
        </div>
      </Section>
      <Section title={user.is_away ? "You're away" : "Availability"} index={2}>
        <Availability userId={user.id} isAway={user.is_away} />
      </Section>
    </div>
  );
}
