import Link from "next/link";
import { SiteNav } from "@/components/votewise/marketing/site-nav";
import { SiteFooter } from "@/components/votewise/marketing/site-footer";
import { VoteWiseLogo } from "@/components/votewise/primitives/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main id="main-content" className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <Link href="/">
              <VoteWiseLogo size={36} />
            </Link>
          </div>
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
