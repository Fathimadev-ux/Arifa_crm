/**
 * Sample-data fallback. Every call tries the real backend first; when it can't be reached (no server, network
 * down, proxy error page), the sample backend (demo-routes.ts) answers instead, in the same shapes. Real answers
 * such as 401 / 403 / 422 from a live backend are never replaced. Changes made in demo mode live until a reload.
 */
import type { Middleware } from "openapi-fetch";
import { ROUTES } from "./demo-routes";
import { ADMIN_ROUTES } from "./demo-routes-admin";
import { CONTENT_ROUTES } from "./demo-routes-content";
import { RECORD_ROUTES } from "./demo-routes-records";
import { type Body, problem } from "./demo-store";

// ---------- Demo mode flag (screens can show that the data is sample data) ----------

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

// ---------- Answering ----------

const ALL_ROUTES = [...ROUTES, ...RECORD_ROUTES, ...ADMIN_ROUTES, ...CONTENT_ROUTES];

function answer(method: string, url: string, bodyText: string): Response {
  const { pathname, searchParams } = new URL(url);
  let body: Body = {};
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    // Not JSON (e.g. a file upload): the routes only read JSON bodies.
  }
  for (const [routeMethod, pattern, handle] of ALL_ROUTES) {
    const match = method === routeMethod ? pathname.match(pattern) : null;
    if (match) return handle(match.slice(1), body, searchParams);
  }
  return problem(404, "Not available with sample data yet");
}

/** The backend isn't there: the fetch failed, or the proxy answered with a gateway error or an HTML error page. */
function isUnreachable(response: Response): boolean {
  const isJson = (response.headers.get("Content-Type") ?? "").includes("json");
  return [502, 503, 504].includes(response.status) || ((response.status >= 500 || response.status === 404) && !isJson);
}

// The request body, kept so the same call can be answered from sample data after the network attempt.
const bodies = new Map<string, Promise<string>>();

export const demoMiddleware: Middleware = {
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
