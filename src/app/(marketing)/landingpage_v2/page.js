import { HeroSection } from "@/components/sections/hero-section";
import GuidesSection from "@/components/sections/guides-section";
import { CTASection } from "@/components/sections/cta-section";
import { FooterSection } from "@/components/sections/footer-section";
import { getAllContent } from "@/lib/content";
import { CompanyShowcase } from "@/components/sections/company-showcase";
import { BentoSection } from "@/components/sections/bento-section";
import { QuoteSection } from "@/components/sections/quote-section";
import { FeatureSection } from "@/components/sections/feature-section";
import { GrowthSection } from "@/components/sections/growth-section";
import { PricingSection } from "@/components/sections/pricing-section";
import { FAQSection } from "@/components/sections/faq-section";
import { TestimonialSection } from "@/components/sections/testimonial-section";

export default function LandingPageV2() {
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
      <GuidesSection articles={articles} />
      <CTASection />
      <FooterSection />
    </main>
  );
}

