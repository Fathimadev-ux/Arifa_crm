"use client";

/** Rows and panels shared by Today and the Inbox page. */
import { ArrowRight, CircleCheck } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LAYOUT_SPRING } from "@/config/motion";
import type { InboxItem } from "@/lib/api/crm";
import { formatRelative, humanize } from "@/lib/format";
import { ApprovalTimerRing } from "@/components/charts/ApprovalTimerRing";
import { Avatar, enterDelay } from "@/components/ui";

export function Panel({ title, count, index, children }: { title: string; count?: number; index: number; children: ReactNode }) {
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

export function EmptyRow({ text }: { text: string }) {
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
export function DealRow({ href, title, detail, trailing, isUrgent = false, leading, action }: DealRowProps) {
  return (
    <motion.li layout transition={LAYOUT_SPRING} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="group relative">
      <Link
        href={href}
        className={`flex items-center gap-3 rounded-full border py-1.5 pr-4 pl-1.5 transition-all duration-500 group-hover:translate-x-1 group-hover:bg-white/70 group-hover:shadow-sm ${isUrgent ? "border-black" : "border-neutral-200 group-hover:border-neutral-400"}`}
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

/** One inbox item (§20.2): an approval, change request, below-minimum alert or buyer message, with its timer. */
export function InboxRow({ item, now }: { item: InboxItem; now: number }) {
  return (
    <DealRow
      href={`/deals/${item.deal_id}`}
      title={item.title}
      detail={`${item.deal_number} · ${humanize(item.kind)}`}
      trailing={item.overdue ? "Overdue" : formatRelative(item.due_at ?? item.created_at, now)}
      isUrgent={item.overdue}
      leading={
        item.due_at ? (
          <span className="grid size-8 place-items-center">
            <ApprovalTimerRing start={item.created_at} deadline={item.due_at} now={now} />
          </span>
        ) : undefined
      }
    />
  );
}
