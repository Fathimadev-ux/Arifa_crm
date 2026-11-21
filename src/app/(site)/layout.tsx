import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { draftMode } from "next/headers";
import { Toaster } from "@/components/Toaster";
import "./site.tw.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
/** The public website keeps the font arifapack.com uses. */
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://arifapack.com") };

/** The public website (its content comes from Payload). The admin panel has its own layout under /admin. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled: isPreview } = await draftMode();
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${poppins.variable} h-full antialiased`}>
      <body className="site-theme min-h-full bg-white font-site text-neutral-950">
        {isPreview && (
          <p className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-black px-4 py-2 text-sm text-white">
            Previewing drafts
            {/* A full request: /preview is a route that clears the preview cookie, not a page Link can prefetch. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/preview?exit=1" className="rounded-full bg-white px-3 py-0.5 text-xs font-semibold text-black">
              Exit
            </a>
          </p>
        )}
        {children}
        <Toaster />
      </body>
    </html>
  );
}
