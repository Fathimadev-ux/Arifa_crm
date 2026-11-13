"use client";

import { ChevronsUpDown, LogOut, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, Suspense, useCallback, useRef, useState } from "react";
import { useDismiss } from "@/hooks/useDismiss";
import { logOut, unpublishedSections, useWebsiteStore } from "@/store/website-store";
import { Avatar } from "@/components/ui";
import { GlassBackdrop } from "@/components/GlassBackdrop";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { CONTENT_NAV, MESSAGES_NAV, OVERVIEW_NAV } from "@/components/website/website-nav";

const ADMIN_NAME = "Admin";

/** Sidebar links, styled like the CRM: black pill for the active page. */
function NavLinks({ activePath, onNavigate }: { activePath: string | null; onNavigate?: () => void }) {
  const store = useWebsiteStore();
  const changed = new Set(unpublishedSections(store));
  const unreadCount = store.messages.filter((message) => !message.isRead).length;
  const linkClass = (href: string) => `press flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium ${activePath === href ? "bg-black text-white shadow-md" : "text-neutral-500 hover:bg-neutral-100 hover:text-black"}`;
  const badge = (isActive: boolean) => `ml-auto grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-semibold ${isActive ? "bg-white text-black" : "bg-black text-white"}`;

  return (
    <nav className="space-y-5">
      <div className="space-y-1">
        <Link href={OVERVIEW_NAV.href} onClick={onNavigate} className={linkClass(OVERVIEW_NAV.href)}>
          <OVERVIEW_NAV.icon className="size-4" strokeWidth={1.75} /> {OVERVIEW_NAV.label}
        </Link>
        <Link href={MESSAGES_NAV.href} onClick={onNavigate} className={linkClass(MESSAGES_NAV.href)}>
          <MESSAGES_NAV.icon className="size-4" strokeWidth={1.75} /> {MESSAGES_NAV.label}
          {unreadCount > 0 && <span className={badge(activePath === MESSAGES_NAV.href)}>{unreadCount}</span>}
        </Link>
      </div>
      <div className="space-y-1">
        <p className="px-4 pb-1 text-[11px] font-medium tracking-wider text-neutral-400 uppercase">Website</p>
        {CONTENT_NAV.map((item) => (
          <Link key={item.href} href={item.href} onClick={onNavigate} className={linkClass(item.href)}>
            <item.icon className="size-4" strokeWidth={1.75} /> {item.label}
            {changed.has(item.key) && <span className={`ml-auto size-1.5 rounded-full ${activePath === item.href ? "bg-white" : "bg-black"}`} title="Unpublished changes" />}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function ActiveNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return <NavLinks activePath={usePathname()} onNavigate={onNavigate} />;
}

/** The signed-in admin at the bottom of the sidebar, in the same style as the CRM profile menu. */
function ProfileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useDismiss(containerRef, isOpen, useCallback(() => setIsOpen(false), []));

  return (
    <div ref={containerRef} className="relative">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 500, damping: 36 }}
            className="absolute right-0 bottom-full left-0 z-40 mb-3 rounded-3xl bg-white p-2 shadow-2xl ring-1 ring-black/5"
          >
            <button role="menuitem" onClick={logOut} className="press flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100 hover:text-black">
              <LogOut className="size-4" /> Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`press relative z-40 flex w-full flex-col items-center gap-2 rounded-3xl py-4 hover:bg-neutral-100 ${isOpen ? "bg-neutral-100" : ""}`}
      >
        <Avatar name={ADMIN_NAME} size="lg" inverted />
        <span className="text-center">
          <span className="block text-sm font-semibold">{ADMIN_NAME}</span>
          <span className="flex items-center justify-center gap-1 text-xs text-neutral-500">
            Website editor <ChevronsUpDown className="size-3" />
          </span>
        </span>
      </button>
    </div>
  );
}

function BrandLink({ onNavigate }: { onNavigate?: () => void }) {
  const { draft } = useWebsiteStore();
  return (
    <Link href="/admin" onClick={onNavigate} className="group flex items-center gap-2.5 px-3">
      <span className="grid size-8 place-items-center rounded-full bg-black text-sm font-bold text-white transition-transform duration-300 group-hover:rotate-[360deg]">{draft.settings.brandName.charAt(0)}</span>
      <span className="text-base font-semibold tracking-tight">
        {draft.settings.brandName} <span className="font-normal text-neutral-500">CMS</span>
      </span>
    </Link>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      <GlassBackdrop />
      <div className="crm-shell flex min-h-screen flex-col gap-3 p-3 md:flex-row md:gap-4 md:p-4">
        {/* Desktop: the CRM's floating glass sidebar. */}
        <aside className="panel sticky top-4 z-50 hidden h-[calc(100vh-2rem)] w-60 shrink-0 flex-col p-4 pt-6 md:flex">
          <BrandLink />
          <div className="scroll-thin -mx-1 mt-8 flex-1 overflow-y-auto px-1">
            <Suspense fallback={<NavLinks activePath={null} />}>
              <ActiveNavLinks />
            </Suspense>
          </div>
          <ProfileMenu />
        </aside>

        {/* Phones: a glass bar with a menu button. */}
        <div className="panel relative z-50 flex items-center justify-between px-3 py-2.5 md:hidden">
          <BrandLink />
          <button onClick={() => setIsMenuOpen(true)} className="press glass grid size-10 place-items-center rounded-full shadow-sm" aria-label="Open menu">
            <Menu className="size-4" />
          </button>
        </div>
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div className="fixed inset-0 z-50 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button className="absolute inset-0 bg-black/20 backdrop-blur-sm" aria-label="Close menu" onClick={closeMenu} />
              <motion.aside initial={{ x: -24 }} animate={{ x: 0 }} exit={{ x: -24 }} className="absolute inset-y-3 left-3 flex w-64 flex-col overflow-y-auto rounded-[1.75rem] bg-white/95 p-4 shadow-2xl">
                <div className="mb-6 flex items-center justify-between">
                  <BrandLink onNavigate={closeMenu} />
                  <button onClick={closeMenu} className="press grid size-9 place-items-center rounded-full hover:bg-neutral-100" aria-label="Close menu">
                    <X className="size-4" />
                  </button>
                </div>
                <Suspense fallback={<NavLinks activePath={null} onNavigate={closeMenu} />}>
                  <ActiveNavLinks onNavigate={closeMenu} />
                </Suspense>
                <button onClick={logOut} className="press mt-6 flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-neutral-500 hover:bg-neutral-100 hover:text-black">
                  <LogOut className="size-4" /> Log out
                </button>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="min-w-0 flex-1">
          <AdminTopBar />
          <main className="px-1 pb-10 md:px-4">{children}</main>
        </div>
      </div>
    </>
  );
}
