import { GlassBackdrop } from "@/components/GlassBackdrop";
import { Sidebar, TopBar } from "@/components/Shell";
import { CmsOnly, SessionProvider } from "@/store/session";

/** The CMS screens: glass backdrop, the content menu and the top bar around every page. */
export default function CmsLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GlassBackdrop />
      <CmsOnly>
        <div className="app-shell flex min-h-screen flex-col gap-3 p-3 md:flex-row md:gap-4 md:p-4">
          <Sidebar />
          <div className="min-w-0 flex-1">
            <TopBar />
            <main className="px-1 pb-10 md:px-4">{children}</main>
          </div>
        </div>
      </CmsOnly>
    </SessionProvider>
  );
}
