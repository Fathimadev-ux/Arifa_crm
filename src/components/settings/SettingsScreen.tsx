"use client";

import { useState } from "react";
import { type Permission, type Role, can } from "@/config/roles";
import { useSession } from "@/store/session";
import { BusinessSettings } from "@/components/settings/BusinessSettings";
import { ChannelsSettings } from "@/components/settings/ChannelsSettings";
import { CompanySettings } from "@/components/settings/CompanySettings";
import { KillSwitchPanel } from "@/components/settings/KillSwitchPanel";
import { MessageTexts } from "@/components/settings/MessageTexts";
import { PricesSettings } from "@/components/settings/PricesSettings";
import { UsersSettings } from "@/components/settings/UsersSettings";
import { LoadingState, PageHeader, SegmentedControl } from "@/components/ui";

const TABS = [
  { id: "business", label: "Business" },
  { id: "users", label: "Users" },
  { id: "prices", label: "Prices" },
  { id: "channels", label: "Channels" },
  { id: "texts", label: "Message texts" },
  { id: "company", label: "Company" },
  { id: "kill-switch", label: "Kill switch" },
] as const;

type Tab = (typeof TABS)[number]["id"];

/**
 * Tabs that need more than opening Settings. Everything on Prices (proposed and approved material rates, FX) is
 * manager / MD only in CRM_API.md, so Admin doesn't get the tab (it would only call endpoints that answer 403).
 */
const TAB_PERMISSION: Partial<Record<Tab, Permission>> = { prices: "DECIDE_MATERIAL_PRICES" };
const tabsFor = (role: Role) => TABS.filter((item) => !TAB_PERMISSION[item.id] || can(role, TAB_PERMISSION[item.id]!));

/** §20.11 settings for manager, admin and MD (§5.2 message texts and §5.3 company details, 18 Nov). Who may change what is decided per tab (and again by the backend). */
export function SettingsScreen() {
  const { user, role } = useSession();
  const [tab, setTab] = useState<Tab>("business");

  // Wait for the signed-in person, then stop roles without Settings (e.g. Sales opening /settings by its address)
  // before any settings data is asked for.
  if (!user) return <LoadingState />;
  if (!can(role, "OPEN_SETTINGS")) {
    return (
      <div className="animate-enter panel py-16 text-center">
        <p className="font-medium">Not available</p>
        <p className="mt-1 text-sm text-neutral-500">Settings are not available for your role.</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Settings">
        <div className="max-w-full overflow-x-auto">
          <SegmentedControl options={tabsFor(role)} value={tab} onChange={setTab} label="Section" />
        </div>
      </PageHeader>
      {tab === "business" && <BusinessSettings canEdit={can(role, "OPEN_SETTINGS")} />}
      {tab === "users" && <UsersSettings canManage={can(role, "MANAGE_USERS")} />}
      {tab === "prices" && can(role, "DECIDE_MATERIAL_PRICES") && <PricesSettings canDecide={can(role, "DECIDE_MATERIAL_PRICES")} canSeeFx={can(role, "SEE_FX")} />}
      {tab === "channels" && <ChannelsSettings canEditNumbers={can(role, "EDIT_CHANNELS")} canEditTemplates={can(role, "EDIT_TEMPLATES")} />}
      {tab === "texts" && <MessageTexts canEdit={can(role, "EDIT_TEXTS")} />}
      {tab === "company" && <CompanySettings canEdit={can(role, "EDIT_COMPANY")} />}
      {tab === "kill-switch" && <KillSwitchPanel canSet={can(role, "SET_KILL_SWITCH")} />}
    </>
  );
}
