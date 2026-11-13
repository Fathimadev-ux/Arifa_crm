"use client";

import { ArrowLeft, CalendarDays, Clock, Package, UserRound } from "lucide-react";
import Link from "next/link";
import { lostReasonLabel } from "@/config/stages";
import { useChangeRequests } from "@/lib/api/change-requests";
import { type DealDetail as Deal, type TimelineEvent, useDeal, useTimeline } from "@/lib/api/crm";
import { channelLabel, formatCount, formatDate, formatDateTime, formatRelative, humanize } from "@/lib/format";
import { useNow } from "@/hooks/useNow";
import { useStaffNames } from "@/hooks/useStaffNames";
import { BuyerConversation } from "@/components/deal/BuyerConversation";
import { AiCard, OwnerValue, StageActions } from "@/components/deal/DealActions";
import { DealOrder } from "@/components/deal/DealOrder";
import { QuotePanel } from "@/components/deal/QuotePanel";
import { RequestCard } from "@/components/requests/RequestCard";
import { StageProgress } from "@/components/StageProgress";
import { Avatar, DealFlag, DetailList, ErrorState, LoadingState, Section, StageTag, StatCard, enterDelay } from "@/components/ui";

/** The buyer's open change requests on this deal (§13), each with its own actions. */
function DealRequests({ dealId }: { dealId: string }) {
  const { data: requests } = useChangeRequests("open", dealId);
  if (!requests?.length) return null;
  return (
    <>
      {requests.map((request, index) => (
        <RequestCard key={request.id} request={request} index={index} />
      ))}
    </>
  );
}

function ActivityTimeline({ deal }: { deal: Deal }) {
  const { data: events } = useTimeline(deal.id);
  const { nameOf } = useStaffNames();

  const actorOf = (event: TimelineEvent) => {
    if (event.actor_type === "staff") return nameOf(event.actor_id);
    if (event.actor_type === "buyer") return deal.contact.full_name ?? "Buyer";
    return event.actor_type === "ai" ? "AI" : humanize(event.actor_type);
  };

  return (
    <Section title="Activity" index={5}>
      {!events && <div className="h-24 animate-pulse rounded-2xl bg-neutral-100" />}
      {events?.length === 0 && <p className="text-sm text-neutral-400">No activity yet</p>}
      <ol className="relative space-y-5 before:absolute before:top-1.5 before:bottom-1.5 before:left-[3px] before:w-px before:bg-neutral-200">
        {events?.map((event, index) => (
          <li key={event.id} className="group relative -mx-2 rounded-2xl py-1 pr-2 pl-7 transition-colors hover:bg-black/[0.04]">
            <span className={`absolute top-2.5 left-2 size-[7px] rounded-full transition-transform group-hover:scale-150 ${index === 0 ? "bg-black" : "bg-neutral-300"}`} />
            <p className="text-sm font-medium">
              {actorOf(event)}
              {event.channel && <span className="font-normal text-neutral-400"> · {channelLabel(event.channel)}</span>}
            </p>
            <p className="mt-0.5 text-sm text-neutral-600">{event.summary}</p>
            <p className="mt-1 text-xs text-neutral-400">{formatDateTime(event.at)}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Requirements({ deal }: { deal: Deal }) {
  if (deal.requirements.length === 0) return null;
  return (
    <Section title="Requirement" index={5}>
      <ul className="space-y-4">
        {deal.requirements.map((requirement) => (
          <li key={requirement.id}>
            <DetailList
              items={[
                ["Product", requirement.product_text],
                ["Quantity", requirement.quantity && `${formatCount(requirement.quantity)} ${requirement.unit}`],
                ["Deliver to", [requirement.delivery_city, requirement.delivery_country].filter(Boolean).join(", ")],
                ["Needed by", requirement.needed_by && formatDate(requirement.needed_by)],
              ]}
            />
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function DealDetail({ id }: { id: string }) {
  const { data: deal, error } = useDeal(id);
  const { nameOf } = useStaffNames();
  const now = useNow();

  if (error && !deal) {
    return error.status === 404 || error.status === 403 ? (
      <div className="py-20 text-center">
        <p className="text-sm text-neutral-500">This deal doesn&apos;t exist or isn&apos;t assigned to you.</p>
        <Link href="/pipeline" className="mt-3 inline-block text-sm font-medium underline">
          Back to pipeline
        </Link>
      </div>
    ) : (
      <ErrorState message={error.message} />
    );
  }
  if (!deal) return <LoadingState />;

  const { contact } = deal;
  const title = contact.full_name ?? deal.number;
  const firstRequirement = deal.requirements[0];
  const isOverdue = now !== null && deal.next_action_at !== null && new Date(deal.next_action_at).getTime() < now;

  return (
    <div className="mx-auto max-w-6xl space-y-4 md:space-y-5">
      <Link href="/pipeline" className="group press glass inline-flex h-10 items-center gap-2 rounded-full pr-4 pl-3 text-sm font-medium shadow-sm transition-colors hover:bg-white">
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" /> Pipeline
      </Link>

      <header className="animate-enter flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={title} size="lg" inverted />
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-light tracking-tight md:text-5xl">{title}</h1>
              <StageTag stage={deal.stage} />
              <DealFlag deal={deal} />
              {deal.taken_over_by && <span className="rounded-full bg-black px-2.5 py-1 text-[10px] font-semibold text-white">Taken over by {nameOf(deal.taken_over_by)}</span>}
            </div>
            <p className="mt-1 text-sm text-neutral-500">{[deal.number, firstRequirement?.product_text].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <StageActions deal={deal} />
      </header>

      <div className="animate-enter lift panel px-6 py-5" style={enterDelay(1)}>
        <StageProgress stage={deal.stage} />
      </div>

      {deal.lost_reason && (
        <p className="animate-enter lift rounded-full bg-black px-5 py-3 text-sm text-white shadow-sm" style={enterDelay(2)}>
          <span className="font-semibold">Lost:</span> {lostReasonLabel(deal.lost_reason)}
          {deal.lost_note && ` · ${deal.lost_note}`}
        </p>
      )}
      {deal.missing_fields.length > 0 && (
        <p className="animate-enter glass rounded-full px-5 py-3 text-sm shadow-sm" style={enterDelay(2)}>
          <span className="font-semibold">Missing:</span> {deal.missing_fields.map(humanize).join(", ")}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard index={3} icon={Clock} label={isOverdue ? "Overdue" : "Next action"} value={deal.next_action_at && now !== null ? formatRelative(deal.next_action_at, now) : "—"} />
        <StatCard index={4} icon={Package} label="Quantity" value={firstRequirement?.quantity ? formatCount(firstRequirement.quantity) : "—"} />
        <StatCard index={5} icon={CalendarDays} label="Needed by" value={firstRequirement?.needed_by ? formatDate(firstRequirement.needed_by) : "—"} />
        <StatCard index={6} icon={UserRound} label="Owner" value={<OwnerValue deal={deal} />} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-3">
        <div className="space-y-4 md:space-y-5 lg:col-span-2">
          <DealRequests dealId={deal.id} />
          <QuotePanel deal={deal} />
          <DealOrder deal={deal} />
          <Requirements deal={deal} />
          <Section title="Contact" index={5}>
            <DetailList
              items={[
                ["Name", contact.full_name],
                ["Phone", contact.phone_e164],
                ["WhatsApp", contact.whatsapp_e164],
                ["Email", contact.email],
                ["Prefers", contact.preferred_channel && channelLabel(contact.preferred_channel)],
                ["Language", contact.language],
              ]}
            />
          </Section>
        </div>
        <div className="space-y-4 md:space-y-5">
          <AiCard deal={deal} now={now} />
          <BuyerConversation deal={deal} />
          <ActivityTimeline deal={deal} />
        </div>
      </div>
    </div>
  );
}
