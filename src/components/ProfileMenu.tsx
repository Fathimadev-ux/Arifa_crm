"use client";

import { ChevronsUpDown, LogOut, UserRound } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { ROLE_LABEL } from "@/config/roles";
import { useDismiss } from "@/hooks/useDismiss";
import { useSession } from "@/store/session";
import { Avatar } from "@/components/ui";
import { POPOVER_SPRING } from "@/config/motion";

/** The signed-in person, with Log out. */
export function ProfileMenu() {
  const { user, role, logOut } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useDismiss(containerRef, isOpen, useCallback(() => setIsOpen(false), []));
  const name = user?.full_name ?? "";

  return (
    <div ref={containerRef} className="relative">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={POPOVER_SPRING}
            className="absolute top-full right-0 z-40 mt-2 w-60 rounded-3xl bg-white p-2 shadow-2xl ring-1 ring-black/5 md:top-auto md:bottom-full md:left-0 md:mt-0 md:mb-3 md:w-full"
          >
            {user && <p className="truncate px-3 pt-1.5 pb-2 text-xs text-neutral-500">{user.email}</p>}
            <Link role="menuitem" href="/account" onClick={() => setIsOpen(false)} className="press flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-sm hover:bg-neutral-100">
              <UserRound className="size-4" /> My account
            </Link>
            <button
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                void logOut();
              }}
              className="press flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-sm hover:bg-neutral-100"
            >
              <LogOut className="size-4" /> Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`press relative z-40 flex w-full items-center rounded-full p-1 hover:bg-neutral-100 md:flex-col md:gap-2 md:rounded-3xl md:py-4 ${isOpen ? "bg-neutral-100" : ""}`}
      >
        <span className="md:hidden">
          <Avatar name={name} size="md" inverted />
        </span>
        <span className="hidden md:block">
          <Avatar name={name} size="lg" inverted />
        </span>
        <span className="hidden min-w-0 text-center md:block">
          <span className="block truncate text-sm font-semibold">{name || " "}</span>
          <span className="flex items-center justify-center gap-1 text-xs text-neutral-500">
            {user ? ROLE_LABEL[role] : " "} <ChevronsUpDown className="size-3" />
          </span>
        </span>
      </button>
    </div>
  );
}
