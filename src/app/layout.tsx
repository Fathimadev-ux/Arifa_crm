import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { Toaster } from "@/components/Toaster";
import { DEFAULT_CONTENT } from "@/data/website-content";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
/** The public website keeps the font arifapack.com uses. */
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: DEFAULT_CONTENT.settings.pageTitle,
  description: DEFAULT_CONTENT.settings.metaDescription,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${poppins.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
