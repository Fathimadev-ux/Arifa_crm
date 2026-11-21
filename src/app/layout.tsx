import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/Toaster";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Arifa CMS",
  description: "Edit the Arifa Pack website: pages, products, photos and more",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
