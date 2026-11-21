import type { Metadata } from "next";
import { getPublished, getSettings } from "@/lib/cms";
import { AnswerSections, PageIntro } from "@/components/site/ContentParts";
import { SiteShell } from "@/components/site/SiteShell";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return { title: `FAQ · ${settings.brandName}` };
}

/** The FAQs collection, with FAQ structured data (AEO). */
export default async function FaqPage() {
  const [faqs, settings] = await Promise.all([getPublished("faqs"), getSettings()]);
  return (
    <SiteShell settings={settings}>
      <PageIntro eyebrow="Help" title="Frequently asked questions" />
      <div className="mx-auto max-w-3xl px-4 pb-20 md:px-6">
        {faqs.length > 0 ? <AnswerSections answers={{ faqs: faqs.map((faq) => ({ id: String(faq.id), question: faq.title, answer: faq.answer })) }} /> : <p className="text-neutral-500">Questions are on their way.</p>}
      </div>
    </SiteShell>
  );
}
