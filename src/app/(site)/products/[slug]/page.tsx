import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getSettings, mediaUrl, seoMetadata } from "@/lib/cms";
import type { Product } from "@/payload-types";
import { AnswerSections, JsonLd, PageIntro, RichBody } from "@/components/site/ContentParts";
import { SiteShell } from "@/components/site/SiteShell";
import { SiteImage } from "@/components/site/site-ui";

export const revalidate = 60;

const SPEC_LABELS: [keyof NonNullable<Product["specs"]>, string][] = [
  ["material", "Material"],
  ["capacity", "Capacity"],
  ["dimensions", "Dimensions"],
  ["thickness", "Thickness"],
  ["colours", "Colours"],
  ["lidOptions", "Lid options"],
  ["piecesPerCarton", "Pieces per carton"],
];

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProduct(slug), getSettings()]);
  return product ? seoMetadata(product.seo, product.title, settings) : {};
}

/** A product page: photos, the spec table (a fact table for AI assistants), datasheet, answers. Never a price. */
export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProduct(slug), getSettings()]);
  if (!product) notFound();

  const category = typeof product.category === "object" ? product.category : null;
  const photos = (product.photos ?? []).map(mediaUrl).filter(Boolean);
  const specs = SPEC_LABELS.map(([key, label]): [string, string] => [label, String(product.specs?.[key] ?? "")]).filter(([, value]) => value);
  const datasheet = mediaUrl(product.datasheet);

  return (
    <SiteShell settings={settings}>
      <PageIntro eyebrow={category?.title ?? "Product"} title={product.title}>
        {product.shortDescription}
      </PageIntro>

      <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 md:grid-cols-2 md:px-6">
        <div className="space-y-3">
          {photos.length > 0 ? (
            photos.map((photo, index) => (
              <div key={photo} className="relative aspect-square overflow-hidden rounded-3xl bg-neutral-50">
                <SiteImage src={photo} alt={`${product.title} ${index + 1}`} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-contain p-6" priority={index === 0} />
              </div>
            ))
          ) : (
            <div className="aspect-square rounded-3xl bg-neutral-50" />
          )}
        </div>

        <div className="space-y-10">
          {specs.length > 0 && (
            <dl className="divide-y divide-neutral-200 border-y border-neutral-200">
              {specs.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-3 text-sm">
                  <dt className="text-neutral-500">{label}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
              {product.moqDisplay && (
                <div className="flex justify-between gap-4 py-3 text-sm">
                  <dt className="text-neutral-500">Minimum order</dt>
                  <dd className="text-right font-medium">{product.moqDisplay}</dd>
                </div>
              )}
            </dl>
          )}
          <div className="flex flex-wrap gap-2">
            {product.customPrinting && <span className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white">Custom printing available</span>}
            <Link href="/#contact" className="rounded-full border border-black px-4 py-2 text-sm font-medium hover:bg-black hover:text-white">
              Ask for a quote
            </Link>
            {datasheet && (
              <a href={datasheet} className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:border-black">
                Datasheet (PDF)
              </a>
            )}
          </div>
          <RichBody data={product.description} />
          {product.videos && product.videos.length > 0 && (
            <ul className="space-y-2">
              {product.videos.map((video, index) => {
                const href = mediaUrl(video.file) || video.link;
                return href ? (
                  <li key={video.id ?? index}>
                    <a href={href} target="_blank" rel="noreferrer" className="text-sm font-medium underline-offset-2 hover:underline">
                      Watch video {index + 1}
                    </a>
                  </li>
                ) : null;
              })}
            </ul>
          )}
          <AnswerSections answers={product} />
        </div>
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.title,
          sku: product.code,
          description: product.summary || product.shortDescription || undefined,
          image: photos[0] || undefined,
          category: category?.title,
          brand: { "@type": "Brand", name: settings.brandName },
          additionalProperty: specs.map(([name, value]) => ({ "@type": "PropertyValue", name, value })),
        }}
      />
    </SiteShell>
  );
}
