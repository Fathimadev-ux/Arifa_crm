"use client";

import { Bell, Eye, Rocket, Undo2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useDismiss } from "@/hooks/useDismiss";
import { discardDraft, publishDraft, unpublishedSections, useWebsiteStore } from "@/store/website-store";
import { showToast } from "@/components/Toaster";
import { Avatar } from "@/components/ui";
import { useSelectionToolbar } from "@/components/website/toolbar-store";
import { MESSAGES_NAV } from "@/components/website/website-nav";

const UNREAD_LIMIT = 5;
const GLASS_PILL = "press glass flex h-11 items-center gap-2 rounded-full px-4 text-sm shadow-sm hover:bg-white";
const formatReceived = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** Same bell as the CRM: swings on hover, opens the unread website messages. */
function MessagesBell() {
  const { messages } = useWebsiteStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useDismiss(containerRef, isOpen, useCallback(() => setIsOpen(false), []));
  const unread = messages.filter((message) => !message.isRead).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`Messages, ${unread.length} unread`}
        title="Messages"
        className="group/bell press glass relative grid size-11 place-items-center rounded-full shadow-sm hover:bg-white"
      >
        <Bell className="size-4 origin-top transition-transform group-hover/bell:animate-[ring_0.6s_ease-in-out]" />
        {unread.length > 0 && <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-black px-1.5 text-[10px] font-semibold text-white tabular-nums ring-2 ring-white">{unread.length}</span>}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-label="Unread messages"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 500, damping: 36 }}
            className="absolute top-full right-0 z-40 mt-2 w-80 rounded-3xl bg-white/85 p-2 shadow-2xl ring-1 ring-black/5 backdrop-blur-2xl"
          >
            <p className="px-3 pt-2 pb-2 text-sm font-semibold">Unread messages</p>
            {unread.slice(0, UNREAD_LIMIT).map((message) => (
              <Link key={message.id} href={MESSAGES_NAV.href} onClick={() => setIsOpen(false)} className="flex items-center gap-3 rounded-full px-2 py-1.5 transition-all hover:translate-x-1 hover:bg-neutral-100">
                <Avatar name={message.name} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{message.name}</span>
                  <span className="block truncate text-xs text-neutral-500">{message.subject || message.message}</span>
                </span>
                <span className="shrink-0 pr-2 text-[11px] text-neutral-400">{formatReceived(message.receivedAt)}</span>
              </Link>
            ))}
            {unread.length === 0 && <p className="px-3 pb-4 text-sm text-neutral-400">No unread messages.</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Top bar in the CRM style: status pill on the left; Preview, Publish and the bell on the right. */
export function AdminTopBar() {
  const store = useWebsiteStore();
  const selection = useSelectionToolbar();
  const changedCount = unpublishedSections(store).length;
  const hasChanges = changedCount > 0;

  const publish = () => {
    publishDraft();
    showToast("Published. The website is updated.");
  };
  const discard = () => {
    if (!window.confirm("Discard all unpublished changes?")) return;
    discardDraft();
    showToast("Draft discarded");
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1 pb-5 md:px-4 md:pb-7">
      <div className="lift glass flex h-11 items-center gap-2.5 rounded-full px-4 text-sm shadow-sm">
        <span className={`size-2 rounded-full ${hasChanges ? "bg-black" : "bg-neutral-300"}`} />
        {hasChanges ? `${changedCount} unpublished ${changedCount === 1 ? "section" : "sections"}` : "Everything is published"}
      </div>

      <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {selection ? (
            <motion.div key="selection" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex h-11 items-center gap-0.5 rounded-full bg-black p-1 text-white shadow-lg" role="toolbar" aria-label="Selected items">
              <span className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-black">{selection.count} selected</span>
              {selection.actions.map((action) => (
                <button key={action.label} onClick={action.onClick} className="press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white">
                  <action.icon className="size-3.5" /> <span className="max-sm:hidden">{action.label}</span>
                </button>
              ))}
              <button onClick={selection.onClear} aria-label="Clear selection" title="Clear selection" className="press grid size-8 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white">
                <X className="size-3.5" />
              </button>
            </motion.div>
          ) : (
            <motion.div key="publish" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex items-center gap-2">
              {hasChanges && (
                <button onClick={discard} className={GLASS_PILL}>
                  <Undo2 className="size-4" /> <span className="max-sm:hidden">Discard</span>
                </button>
              )}
              <Link href="/admin/preview" target="_blank" className={`group ${GLASS_PILL} pl-1.5`}>
                <span className="grid size-8 place-items-center rounded-full bg-black text-white transition-transform duration-300 group-hover:rotate-12">
                  <Eye className="size-3.5" />
                </span>
                Preview
              </Link>
              <button onClick={publish} disabled={!hasChanges} className="press flex h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white shadow-md hover:bg-neutral-800 disabled:bg-white/60 disabled:text-neutral-400 disabled:shadow-none">
                <Rocket className="size-4" /> Publish
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <MessagesBell />
      </div>
    </header>
  );
}
