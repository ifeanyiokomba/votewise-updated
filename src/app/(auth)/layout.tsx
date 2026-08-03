import Link from "next/link";
import { SiteNav } from "@/components/votewise/marketing/site-nav";
import { SiteFooter } from "@/components/votewise/marketing/site-footer";
import { ShieldCheck } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main id="main-content" className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
                <ShieldCheck className="size-4" />
              </span>
              <span className="vw-display text-xl">
                VoteWise<span className="text-accent">.</span>
              </span>
            </Link>
          </div>
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
