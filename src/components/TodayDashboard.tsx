"use client";

import { AlarmClock, BotOff, Inbox, UserPlus } from "lucide-react";
import { AnimatePresence } from "motion/react";
import Link from "next/link";
import { STAGES, isClosedStage, stageLabel } from "@/config/stages";
import { type Deal, type InboxItem, moveDeal, useDeals, useInbox } from "@/lib/api/crm";
import { formatRelative } from "@/lib/format";
import { useNow } from "@/hooks/useNow";
import { useStaffNames } from "@/hooks/useStaffNames";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { StageChart } from "@/components/charts/StageChart";
import { FollowUpTimeline, timelineDeals } from "@/components/FollowUpTimeline";
import { DealRow, EmptyRow, InboxRow, Panel } from "@/components/lists";
import { ErrorState, LoadingState, StatCard, enterDelay } from "@/components/ui";

const LIST_LIMIT = 6;

function greetingFor(now: number): string {
  const hour = new Date(now).getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

/** Approvals, change requests, below-minimum alerts and buyer messages waiting for this person (§20.2). */
function InboxPanel({ items, now }: { items: InboxItem[]; now: number }) {
  return (
    <Panel title="Waiting for you" count={items.length} index={5}>
      <ul className="space-y-2 px-4 pb-4">
        <AnimatePresence initial={false}>
          {items.slice(0, LIST_LIMIT).map((item) => (
            <InboxRow key={`${item.kind}-${item.ref_id}`} item={item} now={now} />
          ))}
        </AnimatePresence>
      </ul>
      {items.length > LIST_LIMIT && (
        <Link href="/inbox" className="press mx-6 mb-5 inline-block rounded-full px-3 py-1.5 text-xs font-medium text-neutral-500 hover:bg-black/5 hover:text-black">
          Show all {items.length}
        </Link>
      )}
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
