"use client";

import { ArrowLeft, CalendarDays, Clock, Package, UserRound } from "lucide-react";
import Link from "next/link";
import { lostReasonLabel } from "@/config/stages";
import { useChangeRequests } from "@/lib/api/change-requests";
import { type DealDetail as Deal, useDeal } from "@/lib/api/crm";
import { channelLabel, formatCount, formatDate, formatRelative, humanize } from "@/lib/format";
import { useNow } from "@/hooks/useNow";
import { useStaffNames } from "@/hooks/useStaffNames";
import { ActivityChat } from "@/components/deal/ActivityChat";
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
        <StatCard index={6} icon={UserRound} label="Salesperson" value={<OwnerValue deal={deal} />} />
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
                ["Phone status", contact.phone_status && `${humanize(contact.phone_status)}${contact.phone_status_at ? ` · ${formatDate(contact.phone_status_at)}` : ""}`],
                ["WhatsApp", contact.whatsapp_e164],
                ["WhatsApp name", contact.whatsapp_profile_name],
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
          <ActivityChat deal={deal} />
        </div>
      </div>
    </div>
  );
}
