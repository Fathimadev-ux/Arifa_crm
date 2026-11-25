/**
 * The roles the backend puts in the token (SRS §3). The backend enforces every rule; this only hides buttons.
 * content_editor (18 Nov) works in the CMS only: the CRM shows them no deal screens.
 */
export type Role = "sales" | "manager" | "md" | "admin" | "content_editor";

export const ROLE_LABEL: Record<Role, string> = {
  sales: "Sales",
  manager: "Manager",
  md: "MD",
  admin: "Admin",
  content_editor: "Content editor",
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
  | "SET_KILL_SWITCH"
  | "SET_SPECIAL_PRICE"
  | "USE_WORKBOOK"
  | "EDIT_COMPANY"
  | "EDIT_TEXTS"
  | "EDIT_TEMPLATES";

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
  // CRM_API.md "Who: admin, md" for add, edit, reset-mfa and unlock (/v1/users).
  MANAGE_USERS: ["admin", "md"],
  EDIT_CHANNELS: ["admin"],
  SET_KILL_SWITCH: ["admin", "md"],
  // 18 Nov (§12, §5.1–5.3).
  SET_SPECIAL_PRICE: ["manager", "md"],
  USE_WORKBOOK: ["manager", "md", "admin"],
  EDIT_COMPANY: ["manager", "md", "admin"],
  EDIT_TEXTS: ["manager", "md"],
  EDIT_TEMPLATES: ["manager", "md", "admin"],
};

export function can(role: Role, permission: Permission): boolean {
  return PERMISSIONS[permission].includes(role);
}

/** The role from the API as one we know; anything unexpected gets the narrowest view. */
export function toRole(value: string): Role {
  return value in ROLE_LABEL ? (value as Role) : "sales";
}
