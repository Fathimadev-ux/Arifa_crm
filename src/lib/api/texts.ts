"use client";

/**
 * §5.2 message texts: what the AI says in fixed situations, the buyer messages that carry quotes and summaries,
 * and staff alerts. Staff write English; the AI translates buyer and AI texts into five languages.
 */
import { showToast } from "@/components/Toaster";
import { ApiError, api, unwrap, type Schemas } from "./client";
import { runAction } from "./crm";
import { revalidate, useApi } from "./use-api";

export type TextOut = Schemas["TextOut"];
export type LanguageOut = Schemas["LanguageOut"];
export type TextChangeOut = Schemas["kx__crm__api__texts__ChangeOut"];

const TEXTS = "texts";
/** Translations arrive about a minute after a save, so the list reloads once then. */
const TRANSLATION_DELAY_MS = 60_000;

export const TEXT_GROUPS = [
  { id: "ai", label: "AI", hint: "What the AI says in fixed situations" },
  { id: "buyer", label: "Buyer", hint: "Messages that carry quotes and summaries" },
  { id: "staff", label: "Staff", hint: "Alerts to the team (English only)" },
] as const;

const keyPath = (key: string) => ({ params: { path: { key } } });

export const useTexts = (canSee: boolean) => useApi(canSee ? TEXTS : null, async () => unwrap(await api.GET("/v1/texts")));
export const useTextHistory = (key: string | null) =>
  useApi(key ? `${TEXTS}:${key}:history` : null, async () => unwrap(await api.GET("/v1/texts/{key}/history", { params: { path: { key: key! }, query: { limit: 100 } } })));

const reloadAfterTranslation = () => setTimeout(() => revalidate(TEXTS), TRANSLATION_DELAY_MS);

/** Live within 30 seconds. A placeholder missing or added, or an amount with a currency, is refused (invalid_text). */
export async function saveText(key: string, text: string, isTranslated: boolean) {
  const saved = await runAction(async () => unwrap(await api.PUT("/v1/texts/{key}", { ...keyPath(key), body: { text } })), isTranslated ? "Saved. Translating into 5 languages…" : "Saved", [TEXTS]);
  if (saved && isTranslated) reloadAfterTranslation();
  return saved;
}

export function resetText(key: string) {
  return runAction(async () => unwrap(await api.POST("/v1/texts/{key}/reset", keyPath(key))), "Back to the built-in wording", [TEXTS]);
}

/** The toast says how many texts the backend queued, so "nothing to translate" is clear too. */
export async function translateMissing() {
  try {
    const { queued } = unwrap(await api.POST("/v1/texts/translate-missing"));
    showToast(queued > 0 ? `${queued} texts sent for translation` : "Nothing to translate");
    if (queued > 0) reloadAfterTranslation();
  } catch (error) {
    showToast(error instanceof ApiError ? error.message : "Something went wrong");
  }
}
