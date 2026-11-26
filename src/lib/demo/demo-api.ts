/**
 * Sample-content fallback. Every call tries the real backend first; when it can't be reached (no server, network
 * down, proxy error page), the sample backend answers instead, in the same shapes. Real answers such as 401 / 403 /
 * 422 from a live backend are never replaced. Changes made in sample mode live until a reload.
 */
import type { Middleware } from "openapi-fetch";
import type { StaffUser } from "@/lib/api/client";
import { type Body, CONTENT_ROUTES, type Handler, json, problem } from "./demo-content";

// ---------- Sample mode flag (screens show that the content is sample content) ----------

let isDemo = false;
const demoListeners = new Set<() => void>();

export const isDemoMode = () => isDemo;

export function subscribeDemoMode(listener: () => void) {
  demoListeners.add(listener);
  return () => {
    demoListeners.delete(listener);
  };
}

function enterDemoMode() {
  if (isDemo) return;
  isDemo = true;
  demoListeners.forEach((listener) => listener());
}

// ---------- Sample staff and sign-in (the CRM's /v1/auth) ----------

const staff = (id: number, full_name: string, role: string): StaffUser => ({
  id: `00000000-0000-4000-c000-${String(id).padStart(12, "0")}`, email: `${role.split("_")[0]}@arifapack.com`, full_name, role, phone_e164: null,
  is_active: true, is_away: false, languages: ["en"], countries: [], category_codes: [], alert_channels: ["in_app"],
});
const STAFF = [staff(1, "Aisha Khan", "content_editor"), staff(2, "Admin", "admin"), staff(3, "Suresh Kumar", "manager"), staff(4, "Ravi Shankar", "md"), staff(5, "Divya", "sales")];

/** In sample mode the email's first part picks the role: editor@, admin@, manager@, md@, sales@ (anything else: content editor). */
const staffForEmail = (email: string) => STAFF.find((member) => email.toLowerCase().startsWith(member.email.split("@")[0])) ?? STAFF[0];

const SESSION_KEY = "arifa-cms-demo-user";
let signedIn: StaffUser | null = null;
let loggingIn: StaffUser | null = null;

function currentUser(): StaffUser | null {
  try {
    signedIn ??= STAFF.find((member) => member.id === sessionStorage.getItem(SESSION_KEY)) ?? null;
  } catch {
    // Storage blocked: the sample session lasts until the page reloads.
  }
  return signedIn;
}

function setCurrentUser(user: StaffUser | null) {
  signedIn = user;
  try {
    if (user) sessionStorage.setItem(SESSION_KEY, user.id);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage blocked: kept in memory only.
  }
}

const tokens = (user: StaffUser, mfa: boolean) => ({ access_token: "sample-access-token", token_type: "Bearer", expires_in: 900, mfa, amr: mfa ? ["pwd", "otp"] : ["pwd", "email"], must_change_password: false, totp_enrolled: true, user });
const empty = (status = 204) => new Response(null, { status });

const AUTH_ROUTES: [string, RegExp, Handler][] = [
  ["POST", /^\/v1\/auth\/login$/, (_, body) => {
    loggingIn = staffForEmail(String(body.email ?? ""));
    return json({ challenge_token: "sample-challenge-token", methods: ["totp", "email"], totp_enrolled: true, expires_at: new Date(Date.now() + 5 * 60_000).toISOString() });
  }],
  ["POST", /^\/v1\/auth\/mfa\/(totp|email\/verify)$/, ([method]) => {
    const user = loggingIn ?? STAFF[0];
    setCurrentUser(user);
    return json(tokens(user, method === "totp"));
  }],
  ["POST", /^\/v1\/auth\/mfa\/email\/send$/, () => empty()],
  ["POST", /^\/v1\/auth\/refresh$/, () => {
    const user = currentUser();
    return user ? json(tokens(user, true)) : problem(401, "Signed out");
  }],
  ["POST", /^\/v1\/auth\/logout$/, () => (setCurrentUser(null), empty())],
  ["GET", /^\/v1\/auth\/me$/, () => {
    const user = currentUser();
    return user ? json(user) : problem(401, "Signed out");
  }],
  ["POST", /^\/v1\/auth\/password(\/reset\/finish)?$/, () => empty()],
  ["POST", /^\/v1\/auth\/password\/reset\/start$/, () => json({}, 202)],
];

// ---------- Answering ----------

const ALL_ROUTES = [...AUTH_ROUTES, ...CONTENT_ROUTES];

function answer(method: string, url: string, bodyText: string): Response {
  const { pathname, searchParams } = new URL(url);
  let body: Body = {};
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    // Not JSON (e.g. a file): the routes only read JSON bodies.
  }
  for (const [routeMethod, pattern, handle] of ALL_ROUTES) {
    const match = method === routeMethod ? pathname.match(pattern) : null;
    if (match) return handle(match.slice(1), body, searchParams, currentUser()?.full_name ?? "You");
  }
  return problem(404, "Not available with sample content");
}

/** The backend isn't there: the fetch failed, or the proxy answered with a gateway error or an HTML error page. */
function isUnreachable(response: Response): boolean {
  const isJson = (response.headers.get("Content-Type") ?? "").includes("json");
  return [502, 503, 504].includes(response.status) || ((response.status >= 500 || response.status === 404) && !isJson);
}

/**
 * Sample content only on a computer that turned it on (.env.local: NEXT_PUBLIC_SAMPLE_DATA=on). Everywhere else
 * (the backend team, Vercel) every call goes to the real backend and its errors show as they are.
 */
const isSampleDataAllowed = process.env.NEXT_PUBLIC_SAMPLE_DATA === "on";

// The request body, kept so the same call can be answered from sample content after the network attempt.
const bodies = new Map<string, Promise<string>>();

const realBackendOnly: Middleware = { onRequest: () => undefined };

const sampleFallback: Middleware = {
  async onRequest({ request, id }) {
    const bodyText = request.clone().text();
    if (isDemo) return answer(request.method, request.url, await bodyText);
    bodies.set(id, bodyText);
    return undefined;
  },
  async onResponse({ request, response, id }) {
    const bodyText = bodies.get(id) ?? Promise.resolve("");
    bodies.delete(id);
    if (!isUnreachable(response)) return response;
    enterDemoMode();
    return answer(request.method, request.url, await bodyText);
  },
  async onError({ request, id }) {
    const bodyText = bodies.get(id) ?? Promise.resolve("");
    bodies.delete(id);
    enterDemoMode();
    return answer(request.method, request.url, await bodyText);
  },
};

export const demoMiddleware = isSampleDataAllowed ? sampleFallback : realBackendOnly;
