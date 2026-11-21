"use client";

import {
  Award, BadgeCheck, Building2, CircleHelp, Clapperboard, FileText, Image as ImageIcon, LayoutDashboard, LayoutGrid, LogOut, MessageSquareQuote, Package, Settings, Factory, Users, type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ROLE_LABEL } from "@/config/roles";
import { useCollections } from "@/lib/api/cms";
import { isDemoMode, subscribeDemoMode } from "@/lib/demo/demo-api";
import { useSession } from "@/store/session";
import { initialsOf } from "@/components/ui";

/** An icon per known content type; a new type from the backend gets a plain page icon. */
const ICONS: Record<string, LucideIcon> = {
  site: Settings, pages: FileText, families: LayoutGrid, products: Package, tour_chapters: Clapperboard, stations: Factory,
  faqs: CircleHelp, certificates: BadgeCheck, clients: Building2, industries: Award, stories: MessageSquareQuote, leadership: Users,
};

const LINK = "press flex shrink-0 items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-medium md:px-4";

function NavLink({ href, label, icon: Icon, isActive }: { href: string; label: string; icon: LucideIcon; isActive: boolean }) {
  return (
    <Link href={href} aria-label={label} aria-current={isActive ? "page" : undefined} className={`${LINK} ${isActive ? "bg-black text-white shadow-md" : "text-neutral-500 hover:bg-neutral-100 hover:text-black"}`}>
      <Icon className="size-4" strokeWidth={1.75} />
      <span className="hidden md:inline">{label}</span>
    </Link>
  );
}

/** The menu: Overview, every content type the backend sends (in its order), and the media library. */
export function Sidebar() {
  const pathname = usePathname();
  const { data: collections } = useCollections();
  const { user, role, logOut } = useSession();
  const name = user?.full_name ?? "";

  return (
    <aside className="panel relative z-50 flex items-center justify-between gap-3 px-3 py-2.5 md:sticky md:top-4 md:h-[calc(100vh-2rem)] md:w-60 md:shrink-0 md:flex-col md:items-stretch md:justify-start md:p-4 md:pt-6">
      <Link href="/" className="group flex shrink-0 items-center gap-2.5 md:px-3">
        <span className="grid size-8 place-items-center rounded-full bg-black text-sm font-bold text-white transition-transform duration-500 group-hover:rotate-[360deg]">A</span>
        <span className="hidden text-base font-semibold tracking-tight md:inline">Arifa CMS</span>
      </Link>

      {/* On short screens the links scroll here, so the person card (with Log out) stays in view. */}
      <nav className="scroll-thin flex min-w-0 flex-1 gap-1 overflow-x-auto md:-mx-1 md:mt-8 md:min-h-0 md:flex-col md:overflow-y-auto md:px-1 md:py-1">
        <NavLink href="/" label="Overview" icon={LayoutDashboard} isActive={pathname === "/"} />
        <p className="hidden px-4 pt-4 pb-1 text-[11px] font-semibold tracking-widest text-neutral-400 uppercase md:block">Content</p>
        {collections?.map((collection) => {
          const href = `/content/${collection.name}`;
          return <NavLink key={collection.name} href={href} label={collection.title} icon={ICONS[collection.name] ?? FileText} isActive={pathname === href || pathname.startsWith(`${href}/`)} />;
        })}
        <p className="hidden px-4 pt-4 pb-1 text-[11px] font-semibold tracking-widest text-neutral-400 uppercase md:block">Files</p>
        <NavLink href="/media" label="Media library" icon={ImageIcon} isActive={pathname.startsWith("/media")} />
      </nav>

      <div className="flex shrink-0 items-center gap-2 md:border-t md:border-dashed md:border-neutral-200 md:pt-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-black text-xs font-semibold text-white">{initialsOf(name) || "A"}</span>
        <span className="hidden min-w-0 flex-1 md:block">
          <span className="block truncate text-sm font-semibold">{name || " "}</span>
          <span className="block text-xs text-neutral-500">{user ? ROLE_LABEL[role] : " "}</span>
        </span>
        <button onClick={() => void logOut()} aria-label="Log out" title="Log out" className="press grid size-9 shrink-0 place-items-center rounded-full text-neutral-500 hover:bg-black/5 hover:text-black">
          <LogOut className="size-4" />
        </button>
      </div>
    </aside>
  );
}

/** Today's date, and a badge while the backend isn't reachable (the screens then show sample content). */
export function TopBar() {
  const isDemo = useSyncExternalStore(subscribeDemoMode, isDemoMode, () => false);
  return (
    <header className="flex items-center justify-between gap-2 px-1 pt-1 pb-5 md:px-4 md:pb-7">
      <p className="glass hidden h-11 items-center gap-2.5 rounded-full px-4 text-sm shadow-sm sm:flex">
        Website content
        {isDemo && <span className="rounded-full bg-black px-2.5 py-0.5 text-[11px] font-medium text-white">Sample content</span>}
      </p>
      <p className="text-xs text-neutral-500">Changes go live about a minute after you publish.</p>
    </header>
  );
}
