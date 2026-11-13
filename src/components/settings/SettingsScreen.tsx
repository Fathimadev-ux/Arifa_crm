"use client";

import { useState } from "react";
import { can } from "@/config/roles";
import { useSession } from "@/store/session";
import { BusinessSettings } from "@/components/settings/BusinessSettings";
import { ChannelsSettings } from "@/components/settings/ChannelsSettings";
import { KillSwitchPanel } from "@/components/settings/KillSwitchPanel";
import { PricesSettings } from "@/components/settings/PricesSettings";
import { UsersSettings } from "@/components/settings/UsersSettings";
import { PageHeader, SegmentedControl } from "@/components/ui";

const TABS = [
  { id: "business", label: "Business" },
  { id: "users", label: "Users" },
  { id: "prices", label: "Prices" },
  { id: "channels", label: "Channels" },
  { id: "kill-switch", label: "Kill switch" },
] as const;

type Tab = (typeof TABS)[number]["id"];

/** §20.11 settings for manager, admin and MD. Who may change what is decided per tab (and again by the backend). */
export function SettingsScreen() {
  const { role } = useSession();
  const [tab, setTab] = useState<Tab>("business");

  return (
    <>
      <PageHeader title="Settings">
        <div className="max-w-full overflow-x-auto">
          <SegmentedControl options={TABS} value={tab} onChange={setTab} label="Section" />
        </div>
      </PageHeader>
      {tab === "business" && <BusinessSettings canEdit={can(role, "OPEN_SETTINGS")} />}
      {tab === "users" && <UsersSettings canManage={can(role, "MANAGE_USERS")} />}
      {tab === "prices" && <PricesSettings canDecide={can(role, "DECIDE_MATERIAL_PRICES")} canSeeFx={can(role, "SEE_FX")} />}
      {tab === "channels" && <ChannelsSettings canEdit={can(role, "EDIT_CHANNELS")} />}
      {tab === "kill-switch" && <KillSwitchPanel canSet={can(role, "SET_KILL_SWITCH")} />}
    </>
  );
}
