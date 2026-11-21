import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { cms } from "@/lib/cms";

/** Only paths on this site, so the preview link can't send anyone elsewhere. */
const safePath = (path: string | null) => (path && path.startsWith("/") && !path.startsWith("//") ? path : "/");

/**
 * The admin's Preview button lands here: a signed-in editor sees drafts (draft → preview → publish).
 * `?exit=1` goes back to the published site.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = safePath(url.searchParams.get("path"));
  const draft = await draftMode();

  if (url.searchParams.has("exit")) {
    draft.disable();
    redirect(path);
  }

  const { user } = await (await cms()).auth({ headers: request.headers });
  if (!user) return new Response("Sign in to the CMS (/admin) to preview drafts.", { status: 401 });
  draft.enable();
  redirect(path);
}
