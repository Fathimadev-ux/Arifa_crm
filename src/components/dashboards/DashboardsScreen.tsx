"use client";

import { AlarmClock, BadgeCheck, BotOff, Clock, FileClock, Inbox, ListTodo, Percent, Send, ShieldAlert, Tag, Trophy, Wallet } from "lucide-react";
import { useState } from "react";
import { can } from "@/config/roles";
import { STAGES } from "@/config/stages";
import { type ManagerBoard, type MdBoard, type Period, type SalespersonBoard, useDashboardSummary, useManagerBoard, useMdBoard, useSalespersonBoard } from "@/lib/api/admin";
import { channelLabel, formatMoney, humanize } from "@/lib/format";
import { useNow } from "@/hooks/useNow";
import { useSession } from "@/store/session";
import { BarList } from "@/components/dashboards/BarList";
import { type Column, DataTable } from "@/components/DataTable";
import { DateInput } from "@/components/forms";
import { ErrorState, LoadingState, PageHeader, StatCard } from "@/components/ui";

const DAY = 86_400_000;
const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const percent = (ratio: number | null) => (ratio === null ? "—" : `${(ratio * 100).toFixed(1)}%`);
const minutes = (value: number | null) => (value === null ? "—" : value < 60 ? `${Math.round(value)} min` : `${(value / 60).toFixed(1)} h`);
const aed = (value: number) => formatMoney(value, "AED");

/** Stage counts in pipeline order (the API answers a map). */
const byStage = (map: Record<string, number | string>): [string, number][] =>
  STAGES.filter((stage) => stage.id in map).map((stage) => [stage.label, Number(map[stage.id])]);
const sortedEntries = (map: Record<string, number>, label = humanize): [string, number][] =>
  Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .map(([key, value]) => [label(key), value]);

function SalesSection({ board }: { board: SalespersonBoard }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard index={1} icon={Inbox} label="Waiting for me" value={board.waiting_for_me} />
        <StatCard index={2} icon={Clock} label="Average response" value={minutes(board.avg_response_minutes)} />
        <StatCard index={3} icon={Send} label="Quotes sent" value={board.quotes_sent} />
        <StatCard index={4} icon={Trophy} label="Deals won" value={board.deals_won} />
      </div>
      <BarList title="My open deals" entries={byStage(board.open_deals_by_stage)} index={5} />
    </>
  );
}

const SALES_COLUMNS: Column<SalespersonBoard>[] = [
  { label: "Salesperson", cell: (row) => row.name, width: "28%" },
  { label: "Open deals", cell: (row) => Object.values(row.open_deals_by_stage).reduce((sum, count) => sum + count, 0), width: "16%", alignRight: true },
  { label: "Waiting", cell: (row) => row.waiting_for_me, width: "14%", alignRight: true },
  { label: "Response", cell: (row) => minutes(row.avg_response_minutes), width: "14%", alignRight: true },
  { label: "Quotes sent", cell: (row) => row.quotes_sent, width: "14%", alignRight: true },
  { label: "Won", cell: (row) => row.deals_won, width: "14%", alignRight: true },
];

function ManagerSection({ board }: { board: ManagerBoard }) {
  const { data: summary } = useDashboardSummary(true);
  return (
    <>
      <h2 className="pt-4 text-2xl font-light tracking-tight">Team</h2>
      {summary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard index={1} icon={Wallet} label="Open pipeline" value={aed(Number(summary.open_pipeline_aed))} />
          <StatCard index={2} icon={FileClock} label="Approvals waiting" value={summary.approvals_pending} />
          <StatCard index={3} icon={AlarmClock} label="Approvals overdue" value={summary.approvals_overdue} />
          <StatCard index={4} icon={BotOff} label="AI paused" value={summary.ai_paused_deals} />
          <StatCard index={5} icon={ListTodo} label="Open tasks" value={summary.open_tasks} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard index={5} icon={Tag} label="Below-minimum requests" value={board.below_minimum_requests} />
        <StatCard index={6} icon={ShieldAlert} label="SLA breaches" value={board.sla_breaches} />
        <StatCard index={7} icon={BadgeCheck} label="Price list changes" value={board.price_list_changes} />
        <StatCard index={8} icon={BotOff} label="Opted out" value={board.opted_out} />
      </div>
      <DataTable rows={board.salespeople} columns={SALES_COLUMNS} rowKey={(row) => row.user_id} minWidth={640} emptyText="No salespeople" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {summary && <BarList title="Deals by stage (team)" entries={byStage(summary.deals_by_stage)} />}
        <BarList title="Change requests" entries={sortedEntries(board.change_requests_by_type)} />
        <BarList title="Why buyers opted out" entries={sortedEntries(board.opt_out_reasons)} />
        {summary && <BarList title="Material rates (days old)" entries={summary.materials.map((material) => [`${material.material_code}${material.level === "ok" ? "" : ` · ${material.level}`}`, material.days_since_approval ?? 0])} format={(days) => `${days} d`} />}
      </div>
    </>
  );
}

function MdSection({ board }: { board: MdBoard }) {
  return (
    <>
      <h2 className="pt-4 text-2xl font-light tracking-tight">Business</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard index={1} icon={Trophy} label="Win rate" value={percent(board.win_rate)} />
        <StatCard index={2} icon={Percent} label="Average discount from list" value={percent(board.avg_discount_from_list)} />
        <StatCard index={3} icon={Wallet} label="Pipeline" value={aed(Object.values(board.pipeline_aed_by_stage).reduce((sum, value) => sum + Number(value), 0))} />
        <StatCard index={4} icon={ShieldAlert} label="Waiting for takeover" value={board.takeover_queue.length} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BarList title="Pipeline by stage" entries={byStage(board.pipeline_aed_by_stage)} format={aed} isDark />
        <BarList title="Top buyers" entries={board.top_buyers.map((buyer) => [String(buyer.name ?? buyer.company ?? "Buyer"), Number(buyer.value_aed ?? buyer.deals ?? 0)])} format={aed} />
        <BarList title="Deals by country" entries={sortedEntries(board.deals_by_country, (code) => code)} />
        <BarList title="Deals by category" entries={sortedEntries(board.deals_by_category)} />
        <BarList title="Deals by channel" entries={sortedEntries(board.deals_by_channel, channelLabel)} />
      </div>
    </>
  );
}

/** §21 dashboards: everyone sees their own numbers; the manager adds the team, the MD the business. */
function Dashboards({ today }: { today: number }) {
  const { role } = useSession();
  const [period, setPeriod] = useState<Period>(() => ({ from: isoDate(today - 30 * DAY), to: isoDate(today) }));
  const sales = useSalespersonBoard(period);
  const manager = useManagerBoard(period, can(role, "SEE_MANAGER_BOARD"));
  const md = useMdBoard(period, can(role, "SEE_MD_BOARD"));

  return (
    <div className="space-y-4 md:space-y-5">
      <PageHeader title="Dashboards">
        <div className="flex gap-2">
          <DateInput label="From" value={period.from} max={period.to} onChange={(event) => setPeriod((current) => ({ ...current, from: event.target.value }))} />
          <DateInput label="To" value={period.to} min={period.from} onChange={(event) => setPeriod((current) => ({ ...current, to: event.target.value }))} />
        </div>
      </PageHeader>
      {sales.error && !sales.data ? <ErrorState message={sales.error.message} /> : sales.data ? <SalesSection board={sales.data} /> : <LoadingState />}
      {manager.data && <ManagerSection board={manager.data} />}
      {md.data && <MdSection board={md.data} />}
    </div>
  );
}

/** Today comes from the browser (the page is pre-built without a clock), so the default period waits for it. */
export function DashboardsScreen() {
  const today = useNow(DAY);
  return today === null ? <LoadingState /> : <Dashboards today={today} />;
}
