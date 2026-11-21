import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { RichText as LexicalRichText } from "@payloadcms/richtext-lexical/react";
import type { ReactNode } from "react";

interface Answers {
  summary?: string | null;
  faqs?: { question: string; answer: string; id?: string | null }[] | null;
  keyFacts?: { label: string; value: string; id?: string | null }[] | null;
  howToOrder?: { step: string; id?: string | null }[] | null;
}

/** Structured data for search engines and AI assistants (SEO / AEO / GEO). Never includes prices. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export const faqJsonLd = (faqs: NonNullable<Answers["faqs"]>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
});

/** A page's opening: small line, big title, intro. */
export function PageIntro({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mx-auto max-w-6xl px-4 pt-16 pb-10 md:px-6 md:pt-24">
      {eyebrow && <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase">{eyebrow}</p>}
      <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{title}</h1>
      {children && <div className="mt-5 max-w-2xl text-lg text-neutral-600">{children}</div>}
    </header>
  );
}

/** Rich text written in the CMS editor. */
export function RichBody({ data }: { data: unknown }) {
  if (!data || typeof data !== "object") return null;
  return (
    <div className="prose-site max-w-3xl text-neutral-700">
      <LexicalRichText data={data as SerializedEditorState} />
    </div>
  );
}

/** AEO: the key-facts box, "how to order" steps and FAQs, plus the FAQ structured data. */
export function AnswerSections({ answers }: { answers: Answers }) {
  const faqs = answers.faqs ?? [];
  return (
    <div className="space-y-12">
      {answers.keyFacts && answers.keyFacts.length > 0 && (
        <dl className="grid grid-cols-1 gap-3 rounded-3xl border border-neutral-200 p-6 sm:grid-cols-2">
          {answers.keyFacts.map((fact) => (
            <div key={fact.id ?? fact.label}>
              <dt className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">{fact.label}</dt>
              <dd className="mt-1 font-medium">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {answers.howToOrder && answers.howToOrder.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl font-semibold tracking-tight">How to order</h2>
          <ol className="space-y-2">
            {answers.howToOrder.map((item, index) => (
              <li key={item.id ?? index} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-black text-xs font-semibold text-white">{index + 1}</span>
                <span className="pt-0.5">{item.step}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
      {faqs.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl font-semibold tracking-tight">Questions</h2>
          <div className="divide-y divide-neutral-200 border-y border-neutral-200">
            {faqs.map((faq) => (
              <details key={faq.id ?? faq.question} className="group py-4">
                <summary className="cursor-pointer list-none font-medium">{faq.question}</summary>
                <p className="mt-2 text-neutral-600">{faq.answer}</p>
              </details>
            ))}
          </div>
          <JsonLd data={faqJsonLd(faqs)} />
        </section>
      )}
    </div>
  );
}
