"use client";

/**
 * CMS store. Keeps the draft, the published site, the inbox and the demo login in localStorage,
 * and syncs across tabs so the public site updates as soon as someone publishes.
 * When the backend API is ready, each action below becomes an API call.
 */
import { useSyncExternalStore } from "react";
import { DEFAULT_CONTENT } from "@/data/website-content";
import { createMockMessages } from "@/data/website-messages";
import type { ContactMessage, ContentKey, SiteContent } from "@/lib/website-types";

const STORAGE_KEY = "arifaa-cms-v1";

/** Demo login only. Real authentication comes from the backend. */
export const DEMO_LOGIN = { username: "admin", password: "arifa@123" };

interface PersistedState {
  draft: SiteContent;
  published: SiteContent;
  publishedAt: string | null;
  messages: ContactMessage[];
  isLoggedIn: boolean;
}

export interface WebsiteState extends PersistedState {
  /** False on the server and during the first render, before localStorage is read. */
  isReady: boolean;
}

function createInitialState(): PersistedState {
  return { draft: DEFAULT_CONTENT, published: DEFAULT_CONTENT, publishedAt: null, messages: createMockMessages(Date.now()), isLoggedIn: false };
}

/** The server renders the default (live) content, so the website is never blank. */
const SERVER_STATE: WebsiteState = { ...createInitialState(), messages: [], isReady: false };

let state: WebsiteState | null = null;
const listeners = new Set<() => void>();

function readStorage(): PersistedState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as PersistedState;
  } catch {
    // Corrupt or blocked storage: fall back to the defaults below.
  }
  return createInitialState();
}

function getState(): WebsiteState {
  state ??= { ...readStorage(), isReady: true };
  return state;
}

function setState(patch: Partial<PersistedState>) {
  const next = { ...getState(), ...patch };
  const persisted: PersistedState = { draft: next.draft, published: next.published, publishedAt: next.publishedAt, messages: next.messages, isLoggedIn: next.isLoggedIn };
  state = { ...persisted, isReady: true };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // Storage full (e.g. very large uploaded images): the change still applies for this session.
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  // Another tab saved: reload from storage so this tab shows the same content.
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    state = { ...readStorage(), isReady: true };
    notify();
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useWebsiteStore(): WebsiteState {
  return useSyncExternalStore(subscribe, getState, () => SERVER_STATE);
}

/* ---------- Content: draft → preview → publish ---------- */

export function updateDraft<Key extends ContentKey>(key: Key, value: SiteContent[Key]) {
  setState({ draft: { ...getState().draft, [key]: value } });
}

export function publishDraft() {
  setState({ published: getState().draft, publishedAt: new Date().toISOString() });
}

export function discardDraft() {
  setState({ draft: getState().published });
}

/** Sections whose draft differs from what the website shows. */
export function unpublishedSections(current: WebsiteState): ContentKey[] {
  return (Object.keys(current.draft) as ContentKey[]).filter((key) => JSON.stringify(current.draft[key]) !== JSON.stringify(current.published[key]));
}

/** Puts back the original arifapack.com content and sample messages, keeping the login. */
export function resetDemo() {
  setState({ ...createInitialState(), isLoggedIn: getState().isLoggedIn });
}

/* ---------- Messages from the website contact form ---------- */

/** Saves the enquiry to the Messages inbox. Sending it on to the CRM as a lead is the backend's job later. */
export function sendContactMessage(input: Pick<ContactMessage, "name" | "email" | "subject" | "message">) {
  const message: ContactMessage = { ...input, id: crypto.randomUUID(), receivedAt: new Date().toISOString(), isRead: false };
  setState({ messages: [message, ...getState().messages] });
}

export function setMessageRead(id: string, isRead: boolean) {
  setState({ messages: getState().messages.map((message) => (message.id === id ? { ...message, isRead } : message)) });
}

export function deleteMessage(id: string) {
  setState({ messages: getState().messages.filter((message) => message.id !== id) });
}

/* ---------- Mock admin session ---------- */

export function logIn(username: string, password: string): boolean {
  const isValid = username.trim() === DEMO_LOGIN.username && password === DEMO_LOGIN.password;
  if (isValid) setState({ isLoggedIn: true });
  return isValid;
}

export function logOut() {
  setState({ isLoggedIn: false });
}
