"use client";

import { Bell, CalendarDays, Search, ShieldAlert } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { hasMfaSession } from "@/lib/api/client";
import { useInbox } from "@/lib/api/crm";
import { useSession } from "@/store/session";
import { isDemoMode, subscribeDemoMode } from "@/lib/demo/demo-api";
import { formatRelative, formatToday, humanize } from "@/lib/format";
import { useDismiss } from "@/hooks/useDismiss";
import { useNow } from "@/hooks/useNow";
import { openCommandPalette } from "@/components/CommandPalette";
import { Avatar } from "@/components/ui";
import { POPOVER_SPRING } from "@/config/motion";

const ATTENTION_LIMIT = 6;

function AttentionBell() {
  const { data: inbox } = useInbox();
  const now = useNow();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useDismiss(containerRef, isOpen, useCallback(() => setIsOpen(false), []));
  // Overdue first, then by due time: the same items as the Today inbox.
  const items = [...(inbox ?? [])].sort((a, b) => Number(b.overdue) - Number(a.overdue) || (a.due_at ?? "~").localeCompare(b.due_at ?? "~"));

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`${items.length} items need attention`}
        className="group/bell relative z-40 press glass grid size-11 place-items-center rounded-full shadow-sm hover:bg-white"
      >
        <Bell className="size-4 origin-top transition-transform group-hover/bell:animate-[ring_0.6s_ease-in-out]" />
        {items.length > 0 && (
          <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-black px-1.5 text-[10px] font-semibold text-white ring-2 ring-white tabular-nums">
            {items.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-label="Needs attention"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={POPOVER_SPRING}
            className="absolute top-full right-0 z-40 mt-2 w-80 rounded-3xl bg-white/85 p-2 backdrop-blur-2xl shadow-2xl ring-1 ring-black/5"
          >
            <p className="px-3 pt-2 pb-2 text-sm font-semibold">Needs attention</p>
            {items.slice(0, ATTENTION_LIMIT).map((item) => (
              <Link
                key={`${item.kind}-${item.ref_id}`}
                href={`/deals/${item.deal_id}`}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-full px-2 py-1.5 transition-all hover:translate-x-1 hover:bg-neutral-100"
              >
                <Avatar name={item.title} size="md" inverted={item.overdue} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{item.title}</span>
                  <span className="block truncate text-xs text-neutral-500">
                    {item.deal_number} · {item.overdue ? "Overdue" : humanize(item.kind)}
                  </span>
                </span>
                {now !== null && item.due_at && <span className="shrink-0 pr-2 text-[11px] text-neutral-400">{formatRelative(item.due_at, now)}</span>}
              </Link>
            ))}
            {items.length === 0 && <p className="px-3 pb-4 text-sm text-neutral-400">Nothing needs you right now.</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DatePill() {
  const now = useNow();
  // The backend isn't reachable, so the screens show sample data.
  const isDemo = useSyncExternalStore(subscribeDemoMode, isDemoMode, () => false);
  return (
    <div className="lift glass hidden h-11 items-center gap-2.5 rounded-full px-4 text-sm shadow-sm sm:flex">
      <CalendarDays className="size-4" />
      {now !== null && <span className="tabular-nums">{formatToday(now)}</span>}
      {isDemo && <span className="rounded-full bg-black px-2.5 py-0.5 text-[11px] font-medium text-white">Sample data</span>}
    </div>
  );
}

/** An emailed-code sign-in (mfa false) can't approve, change prices or settings, confirm payment or mark Won. */
function EmailCodeNotice() {
  const { user } = useSession();
  // Wait for the signed-in person, so a reload's token renewal has finished first.
  if (!user || hasMfaSession()) return null;
  return (
    <Link href="/account" className="press hidden h-11 items-center gap-2 rounded-full bg-black px-4 text-xs font-medium text-white shadow-sm lg:flex" title="Set up or use the authenticator app">
      <ShieldAlert className="size-4" /> Signed in with an email code: approvals need the authenticator app
    </Link>
  );
}

export function TopBar() {
  return (
    <header className="flex items-center justify-between gap-2 px-1 pt-1 pb-5 md:px-4 md:pb-7">
      <DatePill />
      <EmailCodeNotice />
      <div className="flex flex-1 items-center justify-end gap-2">
        <button
          onClick={openCommandPalette}
          aria-label="Search (Ctrl+K)"
          className="group press glass flex h-11 flex-1 items-center gap-3 rounded-full py-1.5 pr-4 pl-1.5 text-sm text-neutral-400 shadow-sm hover:bg-white hover:text-black sm:w-80 sm:flex-none"
        >
          <span className="grid size-8 place-items-center rounded-full bg-black text-white transition-transform duration-500 group-hover:rotate-90">
            <Search className="size-3.5" />
          </span>
          <span className="flex-1 text-left">Search deals…</span>
          <kbd className="hidden rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500 sm:inline">Ctrl K</kbd>
        </button>
        <AttentionBell />
      </div>
    </header>
  );
}
