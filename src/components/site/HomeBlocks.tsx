import { type PageBlock, type Settings, mediaUrl, toProductCards } from "@/lib/cms";
import type { ProductCategory } from "@/payload-types";
import { BannerSection, ButtonRow } from "@/components/site/BannerSection";
import { ContactSection } from "@/components/site/ContactSection";
import { HeroSlider } from "@/components/site/HeroSlider";
import { HomeEssentials, Leadership, Services, Sustainability } from "@/components/site/InfoSections";
import { AboutSection, ProductsSection } from "@/components/site/ProductsAbout";

/** The site's sections take list items with an id and a visible flag; CMS rows always show. */
const shown = <Row extends { id?: string | null }>(rows: Row[] | null | undefined) => (rows ?? []).map((row, index) => ({ ...row, id: row.id ?? String(index), isVisible: true }));

/** One block of a page, drawn with the arifapack.com section it stands for. */
function Block({ block, categories, settings }: { block: PageBlock; categories: ProductCategory[]; settings: Settings }) {
  switch (block.blockType) {
    case "hero":
      return (
        <HeroSlider
          slides={shown(block.slides).map((slide) => ({ ...slide, tagline: slide.tagline ?? "", subtext: slide.subtext ?? "", image: mediaUrl(slide.image), productsButtonLabel: slide.productsButtonLabel ?? "", contactButtonLabel: slide.contactButtonLabel ?? "" }))}
        />
      );
    case "banner":
      return <BannerSection heading={block.heading} text={block.text} image={mediaUrl(block.image)} buttons={block.buttons ?? []} />;
    case "buttons":
      return (
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
          <ButtonRow buttons={block.buttons ?? []} />
        </div>
      );
    case "productCategories":
      return <ProductsSection heading={block.heading} products={toProductCards(categories)} />;
    case "about":
      return (
        <AboutSection
          brandName={settings.brandName}
          about={{
            productsHeading: "",
            companyName: block.companyName,
            heading: block.heading,
            intro: block.intro ?? "",
            paragraphs: (block.paragraphs ?? []).map((paragraph) => paragraph.text),
            image: mediaUrl(block.image),
            pillars: (block.pillars ?? []).map((pillar) => pillar.label),
          }}
        />
      );
    case "sustainability":
      return <Sustainability content={{ eyebrow: block.eyebrow ?? "", heading: block.heading, statValue: block.statValue ?? "", statText: block.statText ?? "", features: shown(block.features) }} />;
    case "essentials":
      return <HomeEssentials content={{ heading: block.heading, categories: shown(block.categories).map((category) => ({ ...category, icon: mediaUrl(category.icon), items: (category.items ?? []).map((item) => item.label) })) }} />;
    case "services":
      return <Services content={{ heading: block.heading, intro: block.intro ?? "", services: shown(block.services), buttonLabel: block.buttonLabel ?? "" }} />;
    case "leadership":
      return <Leadership content={{ eyebrow: block.eyebrow ?? "", heading: block.heading, members: shown(block.members).map((member) => ({ ...member, role: member.role ?? "", photo: mediaUrl(member.photo) })) }} />;
    case "contact":
      return (
        <ContactSection
          content={{
            eyebrow: block.eyebrow ?? "",
            heading: block.heading,
            submitLabel: block.submitLabel ?? "Send Message",
            headOfficeAddress: settings.headOfficeAddress ?? "",
            headOfficePhone: settings.headOfficePhone ?? "",
            headOfficeEmail: settings.headOfficeEmail ?? "",
            divisionName: settings.divisionName ?? "",
            divisionAddress: settings.divisionAddress ?? "",
            divisionPhone: settings.divisionPhone ?? "",
            divisionEmail: settings.divisionEmail ?? "",
          }}
        />
      );
  }
}

/** A page's sections in the order the editor arranged them. */
export function HomeBlocks({ blocks, categories, settings }: { blocks: PageBlock[]; categories: ProductCategory[]; settings: Settings }) {
  return (
    <>
      {blocks.map((block, index) => (
        <Block key={block.id ?? index} block={block} categories={categories} settings={settings} />
      ))}
    </>
  );
}
