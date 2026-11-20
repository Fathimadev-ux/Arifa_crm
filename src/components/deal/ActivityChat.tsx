"use client";

import { useEffect, useRef } from "react";
import { type DealDetail, type TimelineEvent, useTimeline } from "@/lib/api/crm";
import { channelLabel, humanize } from "@/lib/format";
import { useNow } from "@/hooks/useNow";
import { useStaffNames } from "@/hooks/useStaffNames";
import { Section } from "@/components/ui";

const DAY = 86_400_000;
const LOCALE = "en-AE";

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(LOCALE, { hour: "numeric", minute: "2-digit" });
const dayKey = (iso: string) => new Date(iso).toDateString();

/** "Today", "Yesterday" or "18 Nov", like a chat's date chips. */
function dayLabel(iso: string, now: number | null) {
  if (now !== null) {
    if (dayKey(iso) === new Date(now).toDateString()) return "Today";
    if (dayKey(iso) === new Date(now - DAY).toDateString()) return "Yesterday";
  }
  return new Date(iso).toLocaleDateString(LOCALE, { day: "numeric", month: "short" });
}

/** Messages (WhatsApp, email, calls) are bubbles; everything else (approvals, stage moves) is a small note. */
const isMessage = (event: TimelineEvent) => event.kind === "message" || event.channel !== null;
const isFromBuyer = (event: TimelineEvent) => event.direction === "in" || event.actor_type === "buyer";

/** §20.4 the deal's history as a chat: the buyer on the left, the AI and staff on the right, oldest at the top. */
export function ActivityChat({ deal }: { deal: DealDetail }) {
  const { data: events } = useTimeline(deal.id);
  const { nameOf } = useStaffNames();
  const now = useNow();
  const scroller = useRef<HTMLDivElement>(null);
  // The API answers newest first; a chat reads oldest first.
  const history = [...(events ?? [])].reverse();
  const newestId = history.at(-1)?.id;

  // Open at the latest message, and follow new ones as they arrive.
  useEffect(() => {
    const element = scroller.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [newestId]);

  const senderOf = (event: TimelineEvent) => {
    if (event.actor_type === "staff") return nameOf(event.actor_id);
    if (isFromBuyer(event)) return deal.contact.full_name ?? "Buyer";
    return event.actor_type === "ai" ? "AI" : humanize(event.actor_type);
  };

  return (
    <Section title="Activity" index={5}>
      {!events && <div className="h-24 animate-pulse rounded-2xl bg-neutral-100" />}
      {events?.length === 0 && <p className="text-sm text-neutral-400">No activity yet</p>}
      {history.length > 0 && (
        <div ref={scroller} className="scroll-thin -mx-2 max-h-[30rem] space-y-2 overflow-y-auto rounded-3xl bg-black/[0.035] p-3">
          {history.map((event, index) => {
            const isNewDay = index === 0 || dayKey(history[index - 1].at) !== dayKey(event.at);
            const fromBuyer = isFromBuyer(event);
            return (
              <div key={event.id} className="space-y-2">
                {isNewDay && (
                  <p className="mx-auto w-fit rounded-full bg-white px-3 py-1 text-[11px] font-medium text-neutral-500 shadow-sm">{dayLabel(event.at, now)}</p>
                )}
                {isMessage(event) ? (
                  <div className={`flex ${fromBuyer ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[85%] px-3.5 py-2 text-sm shadow-sm transition-transform duration-300 hover:-translate-y-0.5 ${
                        fromBuyer ? "rounded-2xl rounded-tl-md bg-white text-black" : "rounded-2xl rounded-tr-md bg-black text-white"
                      }`}
                    >
                      <p className={`text-[11px] font-semibold ${fromBuyer ? "text-neutral-500" : "text-neutral-400"}`}>
                        {senderOf(event)}
                        {event.channel && <span className="font-normal"> · {channelLabel(event.channel)}</span>}
                      </p>
                      <p className="mt-0.5 leading-snug">{event.summary}</p>
                      <p className={`mt-1 text-right text-[10px] ${fromBuyer ? "text-neutral-400" : "text-neutral-500"}`}>{timeOf(event.at)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mx-auto w-fit max-w-[90%] rounded-2xl bg-white/70 px-3 py-1.5 text-center text-[11px] text-neutral-600">
                    <span className="font-semibold text-black">{senderOf(event)}</span> {event.summary.charAt(0).toLowerCase() + event.summary.slice(1)} · {timeOf(event.at)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}
