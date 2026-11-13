import { Building2, Images, LayoutDashboard, LayoutGrid, Leaf, type LucideIcon, Mail, Package, Phone, Settings, Users, Wrench } from "lucide-react";
import type { ContentKey } from "@/lib/website-types";

export interface ContentNavItem {
  key: ContentKey;
  label: string;
  href: string;
  icon: LucideIcon;
}

/** One CMS screen per part of the website, in the same order as the page. */
export const CONTENT_NAV: ContentNavItem[] = [
  { key: "hero", label: "Hero slides", href: "/admin/hero", icon: Images },
  { key: "products", label: "Products", href: "/admin/products", icon: Package },
  { key: "about", label: "About", href: "/admin/about", icon: Building2 },
  { key: "sustainability", label: "Sustainability", href: "/admin/sustainability", icon: Leaf },
  { key: "essentials", label: "Home Essentials", href: "/admin/essentials", icon: LayoutGrid },
  { key: "services", label: "Services", href: "/admin/services", icon: Wrench },
  { key: "leadership", label: "Leadership", href: "/admin/leadership", icon: Users },
  { key: "contact", label: "Contact", href: "/admin/contact", icon: Phone },
  { key: "settings", label: "Site settings", href: "/admin/settings", icon: Settings },
];

export const OVERVIEW_NAV = { label: "Overview", href: "/admin", icon: LayoutDashboard };
export const MESSAGES_NAV = { label: "Messages", href: "/admin/messages", icon: Mail };

export const sectionLabel = (key: ContentKey) => CONTENT_NAV.find((item) => item.key === key)?.label ?? key;
