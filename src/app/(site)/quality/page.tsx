import type { Metadata } from "next";
import { getPublished, getSettings, mediaUrl } from "@/lib/cms";
import { PageIntro } from "@/components/site/ContentParts";
import { SiteShell } from "@/components/site/SiteShell";
import { SiteImage } from "@/components/site/site-ui";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return { title: `Quality and certificates · ${settings.brandName}` };
}

/** CMS.md §4 quality and certificates, with the client logos and testimonials. */
export default async function QualityPage() {
  const [certificates, logos, testimonials, settings] = await Promise.all([getPublished("certificates"), getPublished("client-logos"), getPublished("testimonials"), getSettings()]);
  const isEmpty = certificates.length + logos.length + testimonials.length === 0;

  return (
    <SiteShell settings={settings}>
      <PageIntro eyebrow="Quality" title="Quality and certificates" />
      <div className="mx-auto max-w-6xl space-y-16 px-4 pb-20 md:px-6">
        {isEmpty && <p className="text-neutral-500">Certificates are on their way.</p>}
        {certificates.length > 0 && (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {certificates.map((certificate) => {
              const file = mediaUrl(certificate.file);
              return (
                <li key={certificate.id} className="rounded-2xl border border-neutral-200 p-6">
                  <h2 className="font-semibold">{certificate.title}</h2>
                  {certificate.description && <p className="mt-2 text-sm text-neutral-600">{certificate.description}</p>}
                  {file && (
                    <a href={file} className="mt-4 inline-block text-sm font-medium underline-offset-2 hover:underline">
                      View certificate
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {logos.length > 0 && (
          <section>
            <h2 className="mb-6 text-2xl font-semibold tracking-tight">Trusted by</h2>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {logos.map((logo) => (
                <li key={logo.id} className="relative aspect-[3/2] rounded-xl border border-neutral-200">
                  <SiteImage src={mediaUrl(logo.logo)} alt={logo.title} fill sizes="160px" className="object-contain p-4 grayscale" />
                </li>
              ))}
            </ul>
          </section>
        )}
        {testimonials.length > 0 && (
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {testimonials.map((testimonial) => (
              <figure key={testimonial.id} className="rounded-2xl bg-neutral-50 p-6">
                <blockquote className="text-neutral-700">“{testimonial.quote}”</blockquote>
                <figcaption className="mt-4 text-sm font-semibold">
                  {testimonial.title}
                  {testimonial.company && <span className="font-normal text-neutral-500"> · {testimonial.company}</span>}
                </figcaption>
              </figure>
            ))}
          </section>
        )}
      </div>
    </SiteShell>
  );
}
