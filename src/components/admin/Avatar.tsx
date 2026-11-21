"use client";

import { useAuth } from "@payloadcms/ui";

/** The signed-in person's initials in the header, like the CRM (instead of a grey placeholder face). */
export function Avatar() {
  const { user } = useAuth<{ name?: string | null; email?: string }>();
  const name = user?.name || user?.email || "";
  const initials = name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
  return <span className="arifa-avatar">{initials || "A"}</span>;
}
