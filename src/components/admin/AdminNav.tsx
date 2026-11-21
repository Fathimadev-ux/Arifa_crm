import type { ServerProps } from "payload";
import { AdminNavLinks, type NavGroup } from "./AdminNavLinks";

/** The order of the menu groups (each collection's `admin.group`). */
const GROUP_ORDER = ["Content", "Trust", "Inbox", "Admin"];

const labelOf = (label: unknown, slug: string) => (typeof label === "string" ? label : slug.replace(/-/g, " ").replace(/^./, (letter) => letter.toUpperCase()));

/**
 * The CRM-style side menu (replaces Payload's): every collection and global this person may open, grouped,
 * with the signed-in person at the bottom. Always visible on a computer; a drawer on a phone.
 */
export function AdminNav({ payload, permissions, user, visibleEntities }: ServerProps) {
  const adminRoute = payload.config.routes.admin;
  const visible = visibleEntities ?? { collections: [], globals: [] };
  const entries = [
    ...payload.config.collections
      .filter((collection) => visible.collections.includes(collection.slug) && permissions?.collections?.[collection.slug]?.read)
      .map((collection) => ({ slug: collection.slug, group: collection.admin.group, label: labelOf(collection.labels.plural, collection.slug), href: `${adminRoute}/collections/${collection.slug}` })),
    ...payload.config.globals
      .filter((global) => visible.globals.includes(global.slug) && permissions?.globals?.[global.slug]?.read)
      .map((global) => ({ slug: global.slug, group: global.admin.group, label: labelOf(global.label, global.slug), href: `${adminRoute}/globals/${global.slug}` })),
  ];

  const groups: NavGroup[] = GROUP_ORDER.map((name) => ({ name, items: entries.filter((entry) => labelOf(entry.group, "") === name) })).filter((group) => group.items.length > 0);
  const person = user as { name?: string | null; email?: string; role?: string } | null;

  return (
    <AdminNavLinks
      adminRoute={adminRoute}
      groups={groups}
      person={{ name: person?.name || person?.email || "", role: person?.role === "admin" ? "Admin" : "Content editor" }}
    />
  );
}
