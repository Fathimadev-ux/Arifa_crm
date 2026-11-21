"use client";

import { useNav } from "@payloadcms/ui";
import {
  BadgeCheck,
  Building2,
  CircleHelp,
  FileText,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MapPin,
  Package,
  Quote,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavGroup {
  name: string;
  items: { slug: string; label: string; href: string }[];
}

const ICONS: Record<string, LucideIcon> = {
  pages: FileText,
  "product-categories": LayoutGrid,
  products: Package,
  "tour-hotspots": MapPin,
  media: ImageIcon,
  faqs: CircleHelp,
  certificates: BadgeCheck,
  "client-logos": Building2,
  testimonials: Quote,
  enquiries: Inbox,
  users: Users,
  "site-settings": Settings,
};

const initialsOf = (name: string) =>
  name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

/** The menu's links (the open page in black), and the person with Log out. Uses Payload's ☰ state on phones. */
export function AdminNavLinks({ adminRoute, groups, person }: { adminRoute: string; groups: NavGroup[]; person: { name: string; role: string } }) {
  const pathname = usePathname();
  const { navOpen, setNavOpen } = useNav();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const closeOnPhone = () => {
    if (window.matchMedia("(max-width: 1024px)").matches) setNavOpen(false);
  };

  const link = (href: string, label: string, Icon: LucideIcon, isCurrent: boolean) => (
    <Link key={href} href={href} onClick={closeOnPhone} className={`arifa-nav__link${isCurrent ? " arifa-nav__link--active" : ""}`} aria-current={isCurrent ? "page" : undefined}>
      <Icon size={16} strokeWidth={1.75} />
      <span>{label}</span>
    </Link>
  );

  return (
    <>
      {navOpen && <button type="button" aria-label="Close menu" className="arifa-nav__overlay" onClick={() => setNavOpen(false)} />}
      <aside className={`arifa-nav${navOpen ? " arifa-nav--open" : ""}`}>
        <Link href={adminRoute} onClick={closeOnPhone} className="arifa-nav__brand">
          <span className="arifa-nav__mark">A</span>
          <span>Arifa CMS</span>
        </Link>

        <nav className="arifa-nav__links">
          {link(adminRoute, "Overview", LayoutDashboard, pathname === adminRoute)}
          {groups.map((group) => (
            <div key={group.name} className="arifa-nav__group">
              <p className="arifa-nav__group-label">{group.name}</p>
              {group.items.map((item) => link(item.href, item.label, ICONS[item.slug] ?? FileText, isActive(item.href)))}
            </div>
          ))}
        </nav>

        <div className="arifa-nav__person">
          <Link href={`${adminRoute}/account`} onClick={closeOnPhone} className="arifa-nav__account">
            <span className="arifa-nav__avatar">{initialsOf(person.name) || "A"}</span>
            <span className="arifa-nav__who">
              <span className="arifa-nav__name">{person.name}</span>
              <span className="arifa-nav__role">{person.role}</span>
            </span>
          </Link>
          <Link href={`${adminRoute}/logout`} className="arifa-nav__logout" aria-label="Log out">
            <LogOut size={16} strokeWidth={1.75} />
          </Link>
        </div>
      </aside>
    </>
  );
}
