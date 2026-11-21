/** The staff roles in the token (CRM_API.md §3). The CMS editor routes (/v1/cms) are open to these four. */
export type Role = "content_editor" | "admin" | "manager" | "md" | "sales";

export const ROLE_LABEL: Record<Role, string> = {
  content_editor: "Content editor",
  admin: "Admin",
  manager: "Manager",
  md: "MD",
  sales: "Sales",
};

/** Who may edit content (CMS_API.md: "content_editor, admin, manager, md"). */
export const canEditContent = (role: Role) => role !== "sales";

/** The role from the API as one we know; anything unexpected gets no editing (as sales). */
export function toRole(value: string): Role {
  return value in ROLE_LABEL ? (value as Role) : "sales";
}
