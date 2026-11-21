import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories, getPage, getSettings, seoMetadata } from "@/lib/cms";
import { AnswerSections, PageIntro, RichBody } from "@/components/site/ContentParts";
import { HomeBlocks } from "@/components/site/HomeBlocks";
import { SiteShell } from "@/components/site/SiteShell";

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [page, settings] = await Promise.all([getPage(slug), getSettings()]);
  return page ? seoMetadata(page.seo, page.title, settings) : {};
}

/** Any other page (about, custom packaging, sustainability, privacy, terms…): its sections, text and answers. */
export default async function ContentPage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  if (slug === "home") notFound();
  const [page, categories, settings] = await Promise.all([getPage(slug), getCategories(), getSettings()]);
  if (!page) notFound();

  return (
    <SiteShell settings={settings}>
      {page.layout && page.layout.length > 0 ? <HomeBlocks blocks={page.layout} categories={categories} settings={settings} /> : <PageIntro title={page.title}>{page.summary}</PageIntro>}
      <div className="mx-auto max-w-6xl space-y-12 px-4 pb-20 md:px-6">
        <RichBody data={page.body} />
        <AnswerSections answers={page} />
      </div>
    </SiteShell>
  );
}
