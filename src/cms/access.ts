import type { Access, FieldAccess } from "payload";

/** CMS.md §1 roles: a content editor edits and publishes; an admin also manages users and settings. */
export type CmsRole = "admin" | "editor";

const roleOf = (user: unknown) => (user as { role?: CmsRole } | null)?.role;

export const isAdmin: Access = ({ req }) => roleOf(req.user) === "admin";
export const isAdminField: FieldAccess = ({ req }) => roleOf(req.user) === "admin";
export const isStaff: Access = ({ req }) => Boolean(req.user);
export const anyone: Access = () => true;

/** The website and the platform read published content; drafts are for signed-in staff only. */
export const publishedOrStaff: Access = ({ req }) => (req.user ? true : { _status: { equals: "published" } });

/** Admins manage every account; anyone else may only change their own. */
export const adminOrSelf: Access = ({ req }) => (roleOf(req.user) === "admin" ? true : req.user ? { id: { equals: req.user.id } } : false);
