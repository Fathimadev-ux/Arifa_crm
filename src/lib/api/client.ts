/**
 * The one way the CRM talks to the backend. Every call goes to /v1 on this site (forwarded to FastAPI by
 * next.config.ts), carries the access token, and renews it once on a 401 before giving up. While the backend
 * can't be reached, calls are answered from sample data (lib/demo).
 */
import createClient, { type Middleware } from "openapi-fetch";
import { demoMiddleware } from "@/lib/demo/demo-api";
import type { components, paths } from "./schema";

export type Schemas = components["schemas"];
export type DealStage = Schemas["DealStage"];
export type StaffUser = Schemas["StaffUserOut"];

/** A refused call, read from the backend's problem+json (or the framework's field errors). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Business reason to switch on, e.g. "window_closed", "unapproved_price". */
    readonly reason?: string,
    /** Per-field problems (e.g. invalid_company): shown under each field. */
    readonly fields: { field: string; message: string }[] = [],
  ) {
    super(message);
  }
}

// The access token lives in memory only; the refresh token is an HttpOnly cookie the browser sends itself.
let accessToken: string | null = null;
/** Signed in with the authenticator app (`mfa` in the token answer); an email-code session can't approve. */
let isMfaSession = false;
let renewal: Promise<boolean> | null = null;
let renewTimer: ReturnType<typeof setTimeout> | undefined;
let onSessionEnded: () => void = () => {};

/** CRM_API.md §3: renew the 15-minute access token before it expires; this long before. */
const RENEW_EARLY_MS = 60_000;

/**
 * Keeps the access token and schedules its renewal shortly before it expires (`expires_in`, seconds). When the
 * renewal is refused (the refresh cookie expired, the 12-hour session ended), the login screen opens.
 */
export function setAccessToken(token: string | null, mfa = false, expiresIn?: number) {
  accessToken = token;
  isMfaSession = token !== null && mfa;
  clearTimeout(renewTimer);
  if (token && expiresIn) {
    renewTimer = setTimeout(() => void renewSession().then((isRenewed) => isRenewed || onSessionEnded()), Math.max(expiresIn * 1000 - RENEW_EARLY_MS, 10_000));
  }
}

export const hasAccessToken = () => accessToken !== null;
export const hasMfaSession = () => isMfaSession;

/** Called when the session cannot be renewed (the login screen listens). */
export function handleSessionEnded(callback: () => void) {
  onSessionEnded = callback;
}

export const api = createClient<paths>({ baseUrl: "", credentials: "include" });

/** Asks for a new access token with the refresh cookie. Concurrent callers share one request. */
export function renewSession(): Promise<boolean> {
  renewal ??= api
    .POST("/v1/auth/refresh")
    .then(({ data }) => {
      setAccessToken(data?.access_token ?? null, data?.mfa ?? false, data?.expires_in);
      return Boolean(data);
    })
    .catch(() => false)
    .finally(() => {
      renewal = null;
    });
  return renewal;
}

// A copy of each request, so it can be sent again after the token is renewed.
const pendingRetries = new Map<string, Request>();

const authMiddleware: Middleware = {
  async onRequest({ request, id }) {
    const isAuthCall = request.url.includes("/v1/auth/");
    // After a page reload the token is renewed first: other calls wait for it instead of going out without one
    // (which the backend answers with 401 "Bearer token missing").
    if (!accessToken && !isAuthCall) await renewSession();
    if (accessToken) request.headers.set("Authorization", `Bearer ${accessToken}`);
    if (!isAuthCall) pendingRetries.set(id, request.clone());
    return request;
  },
  async onResponse({ response, id }) {
    const retry = pendingRetries.get(id);
    pendingRetries.delete(id);
    if (response.status !== 401 || !retry) return response;
    if (!(await renewSession())) {
      onSessionEnded();
      return response;
    }
    retry.headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(retry);
  },
};
// Sample data first: it answers on its own once the backend has proven unreachable.
api.use(demoMiddleware, authMiddleware);

interface ProblemBody {
  detail?: string | { loc: (string | number)[]; msg: string }[];
  title?: string;
  reason?: string;
  errors?: { field: string; message: string }[];
}

/** Returns the data of a call, or throws an ApiError with a message fit for a toast. */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (!result.error) return result.data as T;
  const problem = (result.error ?? {}) as ProblemBody;
  const message = Array.isArray(problem.detail)
    ? problem.detail.map((field) => (typeof field.loc?.at(-1) === "string" ? `${field.loc.at(-1)}: ${field.msg}` : field.msg)).join(", ")
    : (problem.detail ?? problem.title ?? `Request failed (${result.response.status})`);
  throw new ApiError(result.response.status, message, problem.reason, problem.errors ?? []);
}
