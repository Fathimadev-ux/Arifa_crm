import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategory, getSettings, mediaUrl, seoMetadata } from "@/lib/cms";
import { AnswerSections, PageIntro } from "@/components/site/ContentParts";
import { SiteShell } from "@/components/site/SiteShell";
import { SiteImage } from "@/components/site/site-ui";

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [found, settings] = await Promise.all([getCategory(slug), getSettings()]);
  return found ? seoMetadata(found.category.seo, found.category.title, settings) : {};
}

/** One product category (CMS.md §4): its introduction and its products. */
export default async function CategoryPage({ params }: PageProps<"/categories/[slug]">) {
  const { slug } = await params;
  const [found, settings] = await Promise.all([getCategory(slug), getSettings()]);
  if (!found) notFound();
  const { category, products } = found;
  const heroImage = mediaUrl(category.heroImage);

  return (
    <SiteShell settings={settings}>
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[1fr_20rem]">
        <PageIntro eyebrow="Products" title={category.title}>
          {category.description}
        </PageIntro>
        {heroImage && (
          <div className="relative mx-4 aspect-square overflow-hidden rounded-3xl bg-neutral-50 md:mx-6 md:mt-16">
            <SiteImage src={heroImage} alt={category.title} fill sizes="320px" className="object-contain p-6" priority />
          </div>
        )}
      </div>

      <div className="mx-auto max-w-6xl space-y-16 px-4 pb-20 md:px-6">
        {category.heroVideoUrl && (
          <a href={category.heroVideoUrl} target="_blank" rel="noreferrer" className="inline-block rounded-full border border-black px-5 py-2.5 text-sm font-medium hover:bg-black hover:text-white">
            Watch the video
          </a>
        )}
        {products.length > 0 ? (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const photo = mediaUrl(product.photos?.[0]);
              return (
                <li key={product.id}>
                  <a href={`/products/${product.slug}`} className="lift block rounded-2xl border border-neutral-200 p-5">
                    <div className="relative mb-4 aspect-square overflow-hidden rounded-xl bg-neutral-50">{photo && <SiteImage src={photo} alt={product.title} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-contain p-4" />}</div>
                    <h2 className="font-semibold">{product.title}</h2>
                    {product.shortDescription && <p className="mt-1.5 text-sm text-neutral-600">{product.shortDescription}</p>}
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-neutral-500">Products in this range are coming soon. Ask us about them on the contact form.</p>
        )}
        <AnswerSections answers={category} />
      </div>
    </SiteShell>
  );
}
