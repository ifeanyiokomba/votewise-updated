import { SiteNav } from "@/components/votewise/marketing/site-nav";
import { SiteFooter } from "@/components/votewise/marketing/site-footer";
import { Hero } from "@/components/votewise/marketing/hero";
import {
  TrustStrip,
  FeatureBento,
  HowItWorks,
  SecuritySection,
  TrustSection,
  CTASection,
} from "@/components/votewise/marketing/sections";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main id="main-content" className="flex-1">
        <Hero />
        <TrustStrip />
        <FeatureBento />
        <HowItWorks />
        <SecuritySection />
        <TrustSection />
        <CTASection />
      </main>
      <SiteFooter />
    </div>
  );
}
