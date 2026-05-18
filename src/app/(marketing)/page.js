import Script from "next/script";

import { StateProvider } from "@/context/stateContext";
import { HeroSection } from "@/components/sections/hero-section";
import GuidesSection from "@/components/sections/guides-section";
import { CTASection } from "@/components/sections/cta-section";
import { FooterSection } from "@/components/sections/footer-section";
import { CompanyShowcase } from "@/components/sections/company-showcase";
import { BentoSection } from "@/components/sections/bento-section";
import { QuoteSection } from "@/components/sections/quote-section";
import { FeatureSection } from "@/components/sections/feature-section";
import { GrowthSection } from "@/components/sections/growth-section";
import { PricingSection } from "@/components/sections/pricing-section";
import { FAQSection } from "@/components/sections/faq-section";
import { TestimonialSection } from "@/components/sections/testimonial-section";
import { DashboardsSection } from "@/components/sections/dashboards-section";
import { LandingJsonLd } from "@/components/seo/landing-json-ld";
import { getAllContent } from "@/lib/content";

/**
 * Tiny vanilla replacement for the jQuery + PromoteKit affiliate snippet.
 *
 * What we keep: when PromoteKit (or any other tracker) sets
 *   window.promotekit_referral
 * or a `?ref=…` URL parameter is present, we attach it as
 *   ?client_reference_id=<value>
 * to every Stripe Checkout link on the page and to Stripe Pricing Table /
 * Buy Button elements. This is the exact behaviour Stripe expects for
 * affiliate attribution via the webhook.
 *
 * What we drop: jQuery (~30 KB gz) and the PromoteKit SDK script tag
 * (~50 KB gz). The site can still load PromoteKit elsewhere if affiliate
 * tracking is reintroduced later — this snippet just opportunistically
 * reads whatever is on `window` / the URL.
 */
const stripeReferralSnippet = `(function(){
  function getReferral(){
    try {
      if (typeof window !== "undefined" && window.promotekit_referral) {
        return String(window.promotekit_referral);
      }
      var qs = new URLSearchParams(window.location.search);
      var ref = qs.get("ref") || qs.get("client_reference_id");
      return ref ? String(ref) : "";
    } catch (e) { return ""; }
  }
  function apply(){
    var ref = getReferral();
    if (!ref) return;
    var links = document.querySelectorAll('a[href^="https://buy.stripe.com/"]');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href") || "";
      if (href.indexOf("client_reference_id") !== -1) continue;
      links[i].setAttribute(
        "href",
        href + (href.indexOf("?") === -1 ? "?" : "&") + "client_reference_id=" + encodeURIComponent(ref)
      );
    }
    var els = document.querySelectorAll("[pricing-table-id],[buy-button-id]");
    for (var j = 0; j < els.length; j++) {
      els[j].setAttribute("client-reference-id", ref);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
})();`;

export default function Home() {
  let articles = [];
  try {
    const guides = getAllContent("guides") || [];
    const blog = getAllContent("blog") || [];
    articles = [...guides, ...blog];
    articles.sort((a, b) =>
      (b.frontmatter?.publishedAt || "").localeCompare(a.frontmatter?.publishedAt || ""),
    );
  } catch (e) {
    console.warn("Content could not be loaded:", e);
  }

  return (
    <>
      <Script id="stripeReferral" strategy="afterInteractive">
        {stripeReferralSnippet}
      </Script>
      <StateProvider>
        {/* JSON-LD lives outside <main> so the hero remains the first child and the
            `divide-y` border-top selector doesn't draw a line under the navbar. */}
        <LandingJsonLd />
        <main className="flex flex-col items-center justify-center divide-y divide-border min-h-screen w-full theme-landing min-h-screen bg-background antialiased w-full mx-auto scroll-smooth font-sans">
          <HeroSection />
          <CompanyShowcase />
          <BentoSection />
          <QuoteSection />
          <FeatureSection />
          <GrowthSection />
          <PricingSection />
          <FAQSection />
          <TestimonialSection />
          <DashboardsSection username="misterrpink" />
          <GuidesSection articles={articles} />
          <CTASection />
          <FooterSection />
        </main>
      </StateProvider>
    </>
  );
}
