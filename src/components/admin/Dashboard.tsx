import { FileClock, FileText, Inbox, Package, type LucideIcon } from "lucide-react";
import type { AdminViewServerProps } from "payload";
import Link from "next/link";

const EDITED = ["pages", "products", "product-categories"] as const;
const COLLECTION_LABEL: Record<(typeof EDITED)[number], string> = { pages: "Page", products: "Product", "product-categories": "Category" };
const RECENT_LIMIT = 6;

const formatWhen = (iso: string) => new Date(iso).toLocaleString("en-AE", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** The start page (replaces Payload's card list): what needs attention, quick actions and the latest changes. */
export async function Dashboard({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult;
  const { payload } = req;
  const adminRoute = payload.config.routes.admin;
  const person = req.user as { name?: string | null; email?: string } | null;
  const firstName = (person?.name || person?.email || "").split(/[\s@]/)[0];

  const [pages, products, newEnquiries, home, ...drafts] = await Promise.all([
    payload.count({ collection: "pages", req }),
    payload.count({ collection: "products", req }),
    payload.count({ collection: "enquiries", where: { isRead: { equals: false } }, req }),
    payload.find({ collection: "pages", where: { slug: { equals: "home" } }, limit: 1, depth: 0, req }),
    ...EDITED.map((collection) => payload.count({ collection, where: { _status: { equals: "draft" } }, req })),
  ]);
  const recent = (
    await Promise.all(EDITED.map(async (collection) => (await payload.find({ collection, sort: "-updatedAt", limit: RECENT_LIMIT, depth: 0, req })).docs.map((doc) => ({ ...doc, collection }))))
  )
    .flat()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, RECENT_LIMIT);

  const homeId = home.docs[0]?.id;
  const stats: { label: string; value: number; href: string; icon: LucideIcon; isUrgent?: boolean }[] = [
    { label: "Pages", value: pages.totalDocs, href: `${adminRoute}/collections/pages`, icon: FileText },
    { label: "Products", value: products.totalDocs, href: `${adminRoute}/collections/products`, icon: Package },
    { label: "Not published yet", value: drafts.reduce((sum, count) => sum + count.totalDocs, 0), href: `${adminRoute}/collections/pages?where[_status][equals]=draft`, icon: FileClock },
    { label: "New enquiries", value: newEnquiries.totalDocs, href: `${adminRoute}/collections/enquiries?where[isRead][equals]=false`, icon: Inbox, isUrgent: newEnquiries.totalDocs > 0 },
  ];
  const actions = [
    ...(homeId ? [{ label: "Edit home page", href: `${adminRoute}/collections/pages/${homeId}`, isPrimary: true }] : []),
    { label: "Add product", href: `${adminRoute}/collections/products/create` },
    { label: "Add category", href: `${adminRoute}/collections/product-categories/create` },
    { label: "Add page", href: `${adminRoute}/collections/pages/create` },
    { label: "Upload media", href: `${adminRoute}/collections/media/create` },
  ];

  return (
    <div className="arifa-dash">
      <header className="arifa-enter arifa-dash__header">
        <h1>{firstName ? `Welcome back, ${firstName}` : "Welcome back"}</h1>
        <p>{newEnquiries.totalDocs > 0 ? `${newEnquiries.totalDocs} new ${newEnquiries.totalDocs === 1 ? "enquiry is" : "enquiries are"} waiting.` : "Everything is up to date."}</p>
      </header>

      <div className="arifa-dash__stats">
        {stats.map((stat, index) => (
          <Link key={stat.label} href={stat.href} style={{ "--enter-index": index + 1 } as React.CSSProperties} className={`arifa-card arifa-enter arifa-dash__stat${stat.isUrgent ? " arifa-dash__stat--urgent" : ""}`}>
            <span className="arifa-dash__stat-icon">
              <stat.icon size={16} strokeWidth={1.75} />
            </span>
            <span className="arifa-dash__stat-text">
              <span className="arifa-dash__stat-label">{stat.label}</span>
              <span className="arifa-dash__stat-value">{stat.value}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="arifa-enter arifa-dash__actions" style={{ "--enter-index": 5 } as React.CSSProperties}>
        {actions.map((action) => (
          <Link key={action.label} href={action.href} className={`arifa-pill${action.isPrimary ? " arifa-pill--primary" : ""}`}>
            {action.label}
          </Link>
        ))}
      </div>

      <section className="arifa-card arifa-enter arifa-dash__recent" style={{ "--enter-index": 6 } as React.CSSProperties}>
        <h2>Latest changes</h2>
        <ul>
          {recent.map((doc) => (
            <li key={`${doc.collection}-${doc.id}`}>
              <Link href={`${adminRoute}/collections/${doc.collection}/${doc.id}`}>
                <span className="arifa-dash__recent-title">{doc.title || "Untitled"}</span>
                <span className="arifa-dash__recent-meta">
                  {COLLECTION_LABEL[doc.collection]} · {doc._status === "published" ? "Published" : "Draft"} · {formatWhen(doc.updatedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
