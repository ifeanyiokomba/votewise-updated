import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { OrgNav } from "@/components/votewise/org/org-nav";
import { SiteFooter } from "@/components/votewise/marketing/site-footer";

export const dynamic = "force-dynamic";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const org = await db.organization.findUnique({
    where: { subdomain },
    include: { brand: true },
  });
  if (!org) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <OrgNav subdomain={subdomain} orgName={org.name} />
      <main id="main-content" className="flex-1 vw-page-enter">{children}</main>
      <SiteFooter />
    </div>
  );
}
