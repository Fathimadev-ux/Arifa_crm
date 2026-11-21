import type { Metadata } from "next";
import { getCategories, getPage, getSettings, mediaUrl, seoMetadata } from "@/lib/cms";
import { AnswerSections, JsonLd, PageIntro, RichBody } from "@/components/site/ContentParts";
import { HomeBlocks } from "@/components/site/HomeBlocks";
import { SiteShell } from "@/components/site/SiteShell";

/** Published changes also refresh the site at once (see cms/hooks.ts); this is the fallback. */
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([getPage("home"), getSettings()]);
  return seoMetadata(page?.seo, page?.title ?? "", settings);
}

/** The home page: the "home" page's sections, plus the company's structured data (GEO). */
export default async function HomePage() {
  const [page, categories, settings] = await Promise.all([getPage("home"), getCategories(), getSettings()]);

  return (
    <SiteShell settings={settings}>
      {page ? <HomeBlocks blocks={page.layout ?? []} categories={categories} settings={settings} /> : <PageIntro title={settings.brandName} />}
      {page && (page.body || page.faqs?.length || page.keyFacts?.length || page.howToOrder?.length) ? (
        <div className="mx-auto max-w-6xl space-y-12 px-4 py-16 md:px-6">
          <RichBody data={page.body} />
          <AnswerSections answers={page} />
        </div>
      ) : null}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: settings.divisionName || settings.brandName,
          logo: mediaUrl(settings.logo) || undefined,
          email: settings.divisionEmail || undefined,
          telephone: settings.divisionPhone || undefined,
          address: settings.headOfficeAddress || undefined,
          sameAs: settings.socialLinks?.map((link) => link.url),
          additionalProperty: settings.companyFacts?.map((fact) => ({ "@type": "PropertyValue", name: fact.label, value: fact.value })),
        }}
      />
    </SiteShell>
  );
}
