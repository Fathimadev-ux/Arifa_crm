/** The public website: white page, its own font, none of the CMS around it. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <div className="site-theme min-h-screen bg-white font-site text-neutral-950">{children}</div>;
}
