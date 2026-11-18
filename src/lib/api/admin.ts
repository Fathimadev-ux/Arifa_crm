"use client";

/** §21 dashboards, §20.11 settings (business settings, users, channels, prices, kill switch) and my account. */
import { api, unwrap, type Schemas } from "./client";
import { runAction } from "./crm";
import type { TemplateVersion } from "./schema-additions";
import { useApi } from "./use-api";

export type SalespersonBoard = Schemas["SalespersonBoard"];
export type ManagerBoard = Schemas["ManagerBoard"];
export type MdBoard = Schemas["MdBoard"];
export type Setting = Schemas["SettingOut"];
export type FxRate = Schemas["FxRow"];
export type StaffAccount = Schemas["UserAdminOut"];
export type NewStaff = Schemas["UserCreateIn"];
export type StaffPatch = Schemas["UserPatchIn"];
export type ChannelAccount = Schemas["ChannelAccountOut"];
export type ChannelPatch = Schemas["ChannelAccountPatch"];
/** Every edit is a version (18 Nov); the generated schema doesn't have the version fields yet. */
export type Template = TemplateVersion;
export type TemplateInput = Schemas["TemplateIn"];
export type TemplateStatus = Schemas["TemplateStatusIn"]["provider_status"];
export type KillSwitchLevel = Schemas["KillSwitchIn"]["level"];
export type MaterialRate = Schemas["RateOut"];
export type Period = { from: string; to: string };

const periodQuery = (period: Period) => ({ period_from: period.from || undefined, period_to: period.to || undefined });
const periodKey = (period: Period) => `${period.from}:${period.to}`;
const userPath = (id: string) => ({ params: { path: { user_id: id } } });

// ---------- Dashboards (§21) ----------

export const useSalespersonBoard = (period: Period) =>
  useApi(`dashboards:sales:${periodKey(period)}`, async () => unwrap(await api.GET("/v1/dashboards/salesperson", { params: { query: periodQuery(period) } })));
export const useManagerBoard = (period: Period, canSee: boolean) =>
  useApi(canSee ? `dashboards:manager:${periodKey(period)}` : null, async () => unwrap(await api.GET("/v1/dashboards/manager", { params: { query: periodQuery(period) } })));
export const useMdBoard = (period: Period, canSee: boolean) =>
  useApi(canSee ? `dashboards:md:${periodKey(period)}` : null, async () => unwrap(await api.GET("/v1/dashboards/md", { params: { query: periodQuery(period) } })));
export const useDashboardSummary = (canSee: boolean) => useApi(canSee ? "dashboards:summary" : null, async () => unwrap(await api.GET("/v1/dashboard/summary")));

// ---------- Business settings, feature switches, FX (§20.11, D38) ----------

export const useSettings = () => useApi("settings", async () => unwrap(await api.GET("/v1/settings")));
export const useFxRates = (canSee: boolean) => useApi(canSee ? "fx" : null, async () => unwrap(await api.GET("/v1/fx-rates")));

export function saveSetting(key: string, value: unknown) {
  return runAction(async () => unwrap(await api.PUT("/v1/settings/{key}", { params: { path: { key } }, body: { value } })), "Setting saved", ["settings"]);
}

export function setFeatureFlag(key: string, enabled: boolean) {
  return runAction(async () => unwrap(await api.PUT("/v1/feature-flags/{key}", { params: { path: { key } }, body: { enabled } })), enabled ? "Switched on" : "Switched off", ["settings"]);
}

/** The manager can override a day's rate (it replaces that day's rate). */
export function overrideFxRate(currency: string, rateToAed: string, asOf: string) {
  return runAction(async () => unwrap(await api.POST("/v1/fx-rates", { body: { currency, rate_to_aed: rateToAed, as_of: asOf } })), `${currency} rate saved`, ["fx"]);
}

// ---------- Users (§20.11, §9.3) ----------

export const useStaffAccounts = (canSee: boolean) => useApi(canSee ? "staff" : null, async () => unwrap(await api.GET("/v1/users")));

/** The one-time password in the answer is shown once. */
export function createStaff(staff: NewStaff) {
  return runAction(async () => unwrap(await api.POST("/v1/users", { body: staff })), `${staff.full_name} added`, ["staff"]);
}

export function editStaff(id: string, patch: StaffPatch) {
  return runAction(async () => unwrap(await api.PATCH("/v1/users/{user_id}", { ...userPath(id), body: patch })), "User saved", ["staff"]);
}

export function resetStaffMfa(account: StaffAccount) {
  return runAction(async () => unwrap(await api.POST("/v1/users/{user_id}/reset-mfa", userPath(account.id))), `${account.full_name} will set up the authenticator again`, ["staff"]);
}

export function unlockStaff(account: StaffAccount) {
  return runAction(async () => unwrap(await api.POST("/v1/users/{user_id}/unlock", userPath(account.id))), `${account.full_name} unlocked`, ["staff"]);
}

/** §9.3 away / holiday with a backup who covers (the person themself, the manager or an admin). */
export function setAvailability(userId: string, isAway: boolean, backupUserId: string | null) {
  return runAction(async () => unwrap(await api.PUT("/v1/users/{user_id}/availability", { ...userPath(userId), body: { is_away: isAway, backup_user_id: backupUserId } })), isAway ? "Marked away" : "Marked back", ["staff", "me"]);
}

// ---------- Channels (§20.11) ----------

export const useChannelAccounts = () => useApi("channels", async () => unwrap(await api.GET("/v1/admin/channel-accounts")));
/** Every version, newest first (one call serves both the main table and each template's history). */
export const useTemplates = () => useApi("templates", async () => unwrap(await api.GET("/v1/admin/message-templates")) as TemplateVersion[]);

/** The newest version of each template (channel + name + language), with the version being sent next to it. */
export function currentTemplates(versions: Template[]) {
  const groups = new Map<string, Template[]>();
  for (const version of versions) {
    const key = `${version.channel}:${version.name}:${version.language}`;
    groups.set(key, [...(groups.get(key) ?? []), version]);
  }
  return [...groups.values()].map((group) => {
    const sorted = [...group].sort((a, b) => b.version - a.version);
    return { newest: sorted[0], live: sorted.find((version) => version.live) ?? null, versions: sorted };
  });
}

export function editChannelAccount(id: string, patch: ChannelPatch) {
  return runAction(async () => unwrap(await api.PATCH("/v1/admin/channel-accounts/{account_id}", { params: { path: { account_id: id } }, body: patch })), "Number saved", ["channels"]);
}

/** A WhatsApp template waits for Meta's approval (`submitted`); only approved ones can be sent. */
export function saveTemplate(template: TemplateInput) {
  return runAction(async () => unwrap(await api.PUT("/v1/admin/message-templates", { body: template })), "Template saved", ["templates"]);
}

export function setTemplateStatus(template: Template, status: TemplateStatus) {
  return runAction(async () => unwrap(await api.POST("/v1/admin/message-templates/{template_id}/status", { params: { path: { template_id: template.id } }, body: { provider_status: status } })), "Template status saved", ["templates"]);
}

// ---------- Material prices (stale rates block pricing) and the kill switch (D35) ----------

export const usePriceProposals = (canSee: boolean) =>
  useApi(canSee ? "rates:proposed" : null, async () => unwrap(await api.GET("/v1/price-proposals", { params: { query: { status: "proposed", limit: 100 } } })).items);
export const useMaterialFreshness = (canSee: boolean) => useApi(canSee ? "rates:freshness" : null, async () => unwrap(await api.GET("/v1/materials/freshness")));
export const useKillSwitch = () => useApi("kill-switch", async () => unwrap(await api.GET("/v1/admin/kill-switch")));

export function decideRate(rate: MaterialRate, approve: boolean, correctedRate: string, note: string) {
  const body = { rate_per_unit: correctedRate || null, note: note || null };
  const path = { params: { path: { rate_id: rate.id } } };
  return runAction(
    async () => unwrap(await (approve ? api.POST("/v1/price-proposals/{rate_id}/approve", { ...path, body }) : api.POST("/v1/price-proposals/{rate_id}/reject", { ...path, body }))),
    approve ? `${rate.material_code} rate approved` : `${rate.material_code} rate rejected`,
    ["rates"],
  );
}

export function setKillSwitch(level: KillSwitchLevel) {
  return runAction(async () => unwrap(await api.PUT("/v1/admin/kill-switch", { body: { level } })), level === "off" ? "Everything is running" : "Kill switch set", ["kill-switch"]);
}

// ---------- My account (§3, D26) ----------

export async function startAuthenticatorSetup() {
  return runAction(async () => unwrap(await api.POST("/v1/auth/totp/enrol")), "Add this key to your authenticator app", []);
}

export function confirmAuthenticator(code: string) {
  return runAction(async () => unwrap(await api.POST("/v1/auth/totp/confirm", { body: { code } })), "Authenticator on: log in again to use it", ["me"]);
}

export function changeMyPassword(currentPassword: string, newPassword: string) {
  return runAction(async () => unwrap(await api.POST("/v1/auth/password", { body: { current_password: currentPassword, new_password: newPassword } })), "Password changed", []);
}
