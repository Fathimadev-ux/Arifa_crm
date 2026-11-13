/** The four roles the backend puts in the token (SRS §3). The backend enforces every rule; this only hides buttons. */
export type Role = "sales" | "manager" | "md" | "admin";

export const ROLE_LABEL: Record<Role, string> = {
  sales: "Sales",
  manager: "Manager",
  md: "MD",
  admin: "Admin",
};

export type Permission =
  | "SEE_ALL_DEALS"
  | "LIST_STAFF"
  | "REASSIGN_DEALS"
  | "APPROVE_QUOTES"
  | "LIST_APPROVALS"
  | "TOGGLE_AI"
  | "REOPEN_DEALS"
  | "TAKE_OVER_DEALS"
  | "CONFIRM_PAYMENT"
  | "UPDATE_ORDERS"
  | "EDIT_PRODUCTS"
  | "EDIT_PRICES"
  | "SET_STOCK"
  | "SEE_MANAGER_BOARD"
  | "SEE_MD_BOARD"
  | "OPEN_SETTINGS"
  | "SEE_FX"
  | "DECIDE_MATERIAL_PRICES"
  | "MANAGE_USERS"
  | "EDIT_CHANNELS"
  | "SET_KILL_SWITCH";

const PERMISSIONS: Record<Permission, Role[]> = {
  SEE_ALL_DEALS: ["manager", "md", "admin"],
  LIST_STAFF: ["manager", "md", "admin"],
  REASSIGN_DEALS: ["manager", "md"],
  APPROVE_QUOTES: ["sales", "manager", "md"],
  LIST_APPROVALS: ["manager", "md"],
  TOGGLE_AI: ["manager", "md"],
  REOPEN_DEALS: ["manager", "md"],
  TAKE_OVER_DEALS: ["md"],
  // Payment and WON are human, MFA steps (§15): not for admin.
  CONFIRM_PAYMENT: ["sales", "manager", "md"],
  UPDATE_ORDERS: ["manager", "md"],
  // D22: the CRM-owned product fields; price tiers and the Excel import also allow admin.
  EDIT_PRODUCTS: ["manager", "md"],
  EDIT_PRICES: ["manager", "admin", "md"],
  SET_STOCK: ["manager", "admin", "md"],
  SEE_MANAGER_BOARD: ["manager", "md"],
  SEE_MD_BOARD: ["md"],
  OPEN_SETTINGS: ["manager", "admin", "md"],
  SEE_FX: ["manager", "md"],
  DECIDE_MATERIAL_PRICES: ["manager", "md"],
  MANAGE_USERS: ["admin"],
  EDIT_CHANNELS: ["admin"],
  SET_KILL_SWITCH: ["admin", "md"],
};

export function can(role: Role, permission: Permission): boolean {
  return PERMISSIONS[permission].includes(role);
}

/** The role from the API as one we know; anything unexpected gets the narrowest view. */
export function toRole(value: string): Role {
  return value in ROLE_LABEL ? (value as Role) : "sales";
}
