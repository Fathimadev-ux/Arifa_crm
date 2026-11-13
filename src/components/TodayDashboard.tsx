"use client";

import { AlarmClock, ArrowRight, BotOff, CircleCheck, Inbox, UserPlus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { STAGES, isClosedStage, stageLabel } from "@/config/stages";
import { type Deal, type InboxItem, moveDeal, useDeals, useInbox } from "@/lib/api/crm";
import { formatRelative, humanize } from "@/lib/format";
import { useNow } from "@/hooks/useNow";
import { useStaffNames } from "@/hooks/useStaffNames";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { ApprovalTimerRing } from "@/components/charts/ApprovalTimerRing";
import { StageChart } from "@/components/charts/StageChart";
import { FollowUpTimeline, timelineDeals } from "@/components/FollowUpTimeline";
import { Avatar, ErrorState, LoadingState, StatCard, enterDelay } from "@/components/ui";

const LIST_LIMIT = 6;
const LIST_SPRING = { type: "spring", stiffness: 380, damping: 34 } as const;

function greetingFor(now: number): string {
  const hour = new Date(now).getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function Panel({ title, count, index, children }: { title: string; count?: number; index: number; children: ReactNode }) {
  return (
    <section className="animate-enter lift panel" style={enterDelay(index)}>
      <header className="flex items-center justify-between px-6 pt-5 pb-3">
        <h2 className="text-lg font-medium tracking-tight">{title}</h2>
        {count !== undefined && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-black px-2 text-xs font-semibold text-white tabular-nums transition-transform hover:scale-110">{count}</span>}
      </header>
      {children}
    </section>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 px-6 pt-1 pb-6 text-sm text-neutral-400">
      <CircleCheck className="size-4" /> {text}
    </p>
  );
}

interface DealRowProps {
  href: string;
  title: string;
  detail: string;
  trailing: ReactNode;
  isUrgent?: boolean;
  leading?: ReactNode;
  /** Quick action shown on hover, so common work is done without opening the deal. */
  action?: { label: string; onClick: () => void };
}

/** One clickable row that leads to a deal page. */
function DealRow({ href, title, detail, trailing, isUrgent = false, leading, action }: DealRowProps) {
  return (
    <motion.li layout transition={LIST_SPRING} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="group relative">
      <Link
        href={href}
        className={`flex items-center gap-3 rounded-full border py-1.5 pr-4 pl-1.5 transition-all duration-200 group-hover:translate-x-1 group-hover:bg-white/70 group-hover:shadow-sm ${isUrgent ? "border-black" : "border-neutral-200 group-hover:border-neutral-400"}`}
      >
        {leading ?? <Avatar name={title} size="md" inverted={isUrgent} />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="truncate text-xs text-neutral-500">{detail}</p>
        </div>
        <span className={`shrink-0 text-xs tabular-nums transition-opacity ${isUrgent ? "font-semibold" : "text-neutral-500"} ${action ? "group-hover:opacity-0" : ""}`}>{trailing}</span>
        <ArrowRight className="size-4 shrink-0 -translate-x-1 text-neutral-400 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
      </Link>
      {action && (
        <button
          onClick={action.onClick}
          className="absolute top-1/2 right-11 -translate-y-1/2 press rounded-full bg-black px-3.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-neutral-800 focus-visible:opacity-100"
        >
          {action.label}
        </button>
      )}
    </motion.li>
  );
}

/** Approvals, change requests, below-minimum alerts and buyer messages waiting for this person (§20.2). */
function InboxPanel({ items, now }: { items: InboxItem[]; now: number }) {
  return (
    <Panel title="Waiting for you" count={items.length} index={5}>
      <ul className="space-y-2 px-4 pb-4">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <DealRow
              key={`${item.kind}-${item.ref_id}`}
              href={`/deals/${item.deal_id}`}
              title={item.title}
              detail={`${item.deal_number} · ${humanize(item.kind)}`}
              trailing={item.overdue ? "Overdue" : item.due_at ? formatRelative(item.due_at, now) : formatRelative(item.created_at, now)}
              isUrgent={item.overdue}
              leading={
                item.due_at ? (
                  <span className="grid size-8 place-items-center">
                    <ApprovalTimerRing start={item.created_at} deadline={item.due_at} now={now} />
                  </span>
                ) : undefined
              }
            />
          ))}
        </AnimatePresence>
      </ul>
      {items.length === 0 && <EmptyRow text="Nothing waiting" />}
    </Panel>
  );
}

function NewDealsPanel({ deals, now }: { deals: Deal[]; now: number }) {
  return (
    <Panel title="New deals" count={deals.length} index={7}>
      <ul className="space-y-2 px-4 pb-4">
        <AnimatePresence initial={false}>
          {deals.slice(0, LIST_LIMIT).map((deal) => (
            <DealRow
              key={deal.id}
              href={`/deals/${deal.id}`}
              title={deal.number}
              detail={deal.ai_enabled ? "AI is talking to the buyer" : "AI paused"}
              trailing={formatRelative(deal.updated_at, now)}
              action={{ label: "Qualify", onClick: () => void moveDeal(deal, "QUALIFIED") }}
            />
          ))}
        </AnimatePresence>
      </ul>
      {deals.length === 0 && <EmptyRow text="No new deals" />}
    </Panel>
  );
}

function FollowUpsPanel({ deals, now }: { deals: Deal[]; now: number }) {
  return (
    <Panel title="Other follow-ups" index={8}>
      <ul className="space-y-2 px-4 pb-4">
        <AnimatePresence initial={false}>
          {deals.map((deal) => {
            const isOverdue = new Date(deal.next_action_at!).getTime() < now;
            return (
              <DealRow
                key={deal.id}
                href={`/deals/${deal.id}`}
                title={deal.number}
                detail={stageLabel(deal.stage)}
                trailing={isOverdue ? `Overdue ${formatRelative(deal.next_action_at!, now)}` : formatRelative(deal.next_action_at!, now)}
                isUrgent={isOverdue}
              />
            );
          })}
        </AnimatePresence>
      </ul>
      {deals.length === 0 && <EmptyRow text="All caught up" />}
    </Panel>
  );
}

export function TodayDashboard() {
  const { data: deals, error } = useDeals();
  const { data: inbox } = useInbox();
  const { nameOf } = useStaffNames();
  const now = useNow();

  if (error && !deals) return <ErrorState message={error.message} />;
  if (!deals || !inbox || now === null) return <LoadingState />;

  const openDeals = deals.filter((deal) => !isClosedStage(deal.stage));
  const newDeals = deals.filter((deal) => deal.stage === "NEW").sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const onTimeline = new Set(timelineDeals(deals, now).map(({ deal }) => deal.id));
  const laterFollowUps = openDeals
    .filter((deal) => deal.next_action_at && !onTimeline.has(deal.id))
    .sort((a, b) => a.next_action_at!.localeCompare(b.next_action_at!))
    .slice(0, LIST_LIMIT);
  const overdueCount = inbox.filter((item) => item.overdue).length;
  const aiPausedCount = openDeals.filter((deal) => !deal.ai_enabled).length;
  const stageCounts = STAGES.filter((stage) => !isClosedStage(stage.id)).map((stage) => ({ label: stage.label, count: openDeals.filter((deal) => deal.stage === stage.id).length }));

  return (
    <div className="space-y-4 md:space-y-5">
      <header className="animate-enter mb-2">
        <h1 className="text-4xl font-light tracking-tight md:text-5xl">{greetingFor(now)}</h1>
        <p className="mt-2 text-sm text-neutral-500">{inbox.length > 0 ? `You have ${inbox.length} things waiting.` : "You're all caught up."}</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard index={1} icon={Inbox} label="Waiting for you" value={<AnimatedNumber value={inbox.length} />} />
        <StatCard index={2} icon={AlarmClock} label="Overdue" value={<AnimatedNumber value={overdueCount} />} />
        <StatCard index={3} icon={UserPlus} label="New deals" value={<AnimatedNumber value={newDeals.length} />} />
        <StatCard index={4} icon={BotOff} label="AI paused" value={<AnimatedNumber value={aiPausedCount} />} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FollowUpTimeline deals={deals} ownerName={nameOf} now={now} index={5} />
        </div>
        <InboxPanel items={inbox} now={now} />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 md:gap-5 lg:grid-cols-3">
        <section className="animate-enter lift panel-dark p-6" style={enterDelay(6)}>
          <StageChart stages={stageCounts} />
        </section>
        <NewDealsPanel deals={newDeals} now={now} />
        <FollowUpsPanel deals={laterFollowUps} now={now} />
      </div>
    </div>
  );
}
