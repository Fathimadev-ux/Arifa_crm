import type { CollectionConfig } from "payload";
import { adminOrSelf, isAdmin, isAdminField, isStaff } from "@/cms/access";

/**
 * Staff who edit the website. CMS.md §1: content editors edit and publish; admins also manage users and
 * settings. API keys (§3) let the platform read content back: create a user, switch "Enable API key" on.
 */
export const Users: CollectionConfig = {
  slug: "users",
  auth: { useAPIKey: true },
  admin: { useAsTitle: "email", group: "Admin", defaultColumns: ["name", "email", "role"] },
  access: { read: isStaff, create: isAdmin, update: adminOrSelf, delete: isAdmin },
  fields: [
    { name: "name", type: "text" },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "editor",
      saveToJWT: true,
      options: [
        { label: "Content editor", value: "editor" },
        { label: "Admin", value: "admin" },
      ],
      access: { update: isAdminField },
    },
  ],
};
