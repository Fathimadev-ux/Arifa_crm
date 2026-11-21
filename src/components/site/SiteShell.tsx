import type { ReactNode } from "react";
import { type Settings, mediaUrl } from "@/lib/cms";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteImage } from "@/components/site/site-ui";

function SiteFooter({ settings }: { settings: Settings }) {
  const logo = mediaUrl(settings.logo);
  return (
    <footer className="bg-black text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex items-center gap-3">
          {logo && (
            <span className="rounded-lg bg-white p-1">
              <SiteImage src={logo} alt={settings.brandName} width={40} height={40} className="size-10 object-contain" />
            </span>
          )}
          <span className="text-sm font-semibold">{settings.divisionName || settings.brandName}</span>
        </div>
        <div className="text-sm text-neutral-400 md:text-right">
          {settings.headOfficeAddress && <p>{settings.headOfficeAddress}</p>}
          {settings.divisionEmail && (
            <p className="mt-1">
              <a href={`mailto:${settings.divisionEmail}`} className="hover:text-white">
                {settings.divisionEmail}
              </a>
            </p>
          )}
          {settings.socialLinks && settings.socialLinks.length > 0 && (
            <p className="mt-3 flex gap-4 md:justify-end">
              {settings.socialLinks.map((link) => (
                <a key={link.id ?? link.url} href={link.url} className="capitalize hover:text-white" target="_blank" rel="noreferrer">
                  {link.platform}
                </a>
              ))}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}

/** Every website page: announcement bar, header, the page, footer. */
export function SiteShell({ settings, children }: { settings: Settings; children: ReactNode }) {
  return (
    <>
      {settings.announcementEnabled && settings.announcementText && (
        <p className="bg-black px-4 py-2 text-center text-sm text-white">
          {settings.announcementLink ? (
            <a href={settings.announcementLink} className="underline-offset-2 hover:underline">
              {settings.announcementText}
            </a>
          ) : (
            settings.announcementText
          )}
        </p>
      )}
      <SiteHeader settings={{ brandName: settings.brandName, logo: mediaUrl(settings.logo), pageTitle: settings.pageTitle ?? "", metaDescription: settings.metaDescription ?? "" }} />
      <main>{children}</main>
      <SiteFooter settings={settings} />
    </>
  );
}
