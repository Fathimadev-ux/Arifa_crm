/** The four roles the backend puts in the token (SRS §3). The backend enforces every rule; this only hides buttons. */
export type Role = "sales" | "manager" | "md" | "admin";

export const ROLE_LABEL: Record<Role, string> = {
  sales: "Sales",
  manager: "Manager",
  md: "MD",
  admin: "Admin",
};

export type Permission = "SEE_ALL_DEALS" | "LIST_STAFF" | "REASSIGN_DEALS" | "APPROVE_QUOTES" | "LIST_APPROVALS" | "TOGGLE_AI" | "REOPEN_DEALS";

const PERMISSIONS: Record<Permission, Role[]> = {
  SEE_ALL_DEALS: ["manager", "md", "admin"],
  LIST_STAFF: ["manager", "md", "admin"],
  REASSIGN_DEALS: ["manager", "md"],
  APPROVE_QUOTES: ["sales", "manager", "md"],
  LIST_APPROVALS: ["manager", "md"],
  TOGGLE_AI: ["manager", "md"],
  REOPEN_DEALS: ["manager", "md"],
};

export function can(role: Role, permission: Permission): boolean {
  return PERMISSIONS[permission].includes(role);
}

/** The role from the API as one we know; anything unexpected gets the narrowest view. */
export function toRole(value: string): Role {
  return value in ROLE_LABEL ? (value as Role) : "sales";
}
