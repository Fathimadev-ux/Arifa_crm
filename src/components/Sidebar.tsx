"use client";

import { BarChart3, Boxes, FilePen, Inbox, LayoutDashboard, Package, Settings, SquareKanban, Truck, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { type Permission, can } from "@/config/roles";
import { useSession } from "@/store/session";
import { ProfileMenu } from "@/components/ProfileMenu";

const NAV_ITEMS: { href: string; label: string; icon: typeof Inbox; matches: string[]; permission?: Permission }[] = [
  { href: "/", label: "Today", icon: LayoutDashboard, matches: [] },
  { href: "/inbox", label: "Inbox", icon: Inbox, matches: ["/inbox"] },
  { href: "/pipeline", label: "Pipeline", icon: SquareKanban, matches: ["/pipeline", "/deals"] },
  { href: "/requests", label: "Requests", icon: FilePen, matches: ["/requests"] },
  { href: "/contacts", label: "Contacts", icon: Users, matches: ["/contacts"] },
  { href: "/orders", label: "Orders", icon: Truck, matches: ["/orders"] },
  { href: "/products", label: "Products", icon: Package, matches: ["/products"] },
  { href: "/stock", label: "Stock", icon: Boxes, matches: ["/stock"] },
  { href: "/dashboards", label: "Dashboards", icon: BarChart3, matches: ["/dashboards"] },
  { href: "/settings", label: "Settings", icon: Settings, matches: ["/settings"], permission: "OPEN_SETTINGS" },
];

function NavLinks({ activePath }: { activePath: string | null }) {
  const { role } = useSession();
  return (
    <nav className="scroll-thin flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {NAV_ITEMS.filter((item) => !item.permission || can(role, item.permission)).map((item) => {
        const isActive = activePath === item.href || (activePath !== null && item.matches.some((path) => activePath.startsWith(path)));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            className={`press flex shrink-0 items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-medium md:px-4 ${isActive ? "bg-black text-white shadow-md" : "text-neutral-500 hover:bg-neutral-100 hover:text-black"}`}
          >
            <item.icon className="size-4" strokeWidth={1.75} />
            <span className="hidden md:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function ActiveNavLinks() {
  return <NavLinks activePath={usePathname()} />;
}

export function Sidebar() {
  return (
    <aside className="panel relative z-50 flex items-center justify-between gap-3 px-3 py-2.5 md:sticky md:top-4 md:h-[calc(100vh-2rem)] md:w-56 md:shrink-0 md:flex-col md:items-stretch md:justify-start md:p-4 md:pt-6">
      <Link href="/" className="group flex shrink-0 items-center gap-2.5 md:px-3">
        <span className="grid size-8 place-items-center rounded-full bg-black text-sm font-bold text-white transition-transform duration-500 group-hover:rotate-[360deg]">A</span>
        <span className="hidden text-base font-semibold tracking-tight md:inline">Arifaa</span>
      </Link>
      <div className="min-w-0 flex-1 md:mt-8">
        {/* Deal pages are created at runtime, so reading the URL waits inside Suspense. */}
        <Suspense fallback={<NavLinks activePath={null} />}>
          <ActiveNavLinks />
        </Suspense>
      </div>
      <ProfileMenu />
    </aside>
  );
}
