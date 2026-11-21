import { SiteImage } from "@/components/site/site-ui";

export interface SiteButton {
  label: string;
  link: string;
  style?: "primary" | "secondary" | null;
  id?: string | null;
}

const BUTTON_STYLE = {
  primary: "bg-black text-white hover:bg-neutral-800",
  secondary: "border border-black hover:bg-black hover:text-white",
};

/** Editors' buttons: black or outlined pills. */
export function ButtonRow({ buttons, isCentered = false }: { buttons: SiteButton[]; isCentered?: boolean }) {
  if (buttons.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-3 ${isCentered ? "justify-center" : ""}`}>
      {buttons.map((button, index) => (
        <a key={button.id ?? index} href={button.link} className={`press rounded-full px-6 py-3 text-sm font-semibold transition-colors ${BUTTON_STYLE[button.style ?? "primary"]}`}>
          {button.label}
        </a>
      ))}
    </div>
  );
}

/** A banner: heading, text and buttons, with the image beside them when there is one. */
export function BannerSection({ heading, text, image, buttons }: { heading: string; text?: string | null; image: string; buttons: SiteButton[] }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
      <div className={`grid items-center gap-10 rounded-3xl bg-neutral-50 p-8 md:p-12 ${image ? "md:grid-cols-2" : "text-center"}`}>
        <div className="space-y-5">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{heading}</h2>
          {text && <p className="text-neutral-600">{text}</p>}
          <ButtonRow buttons={buttons} isCentered={!image} />
        </div>
        {image && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
            <SiteImage src={image} alt={heading} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}
