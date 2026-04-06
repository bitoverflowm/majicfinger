import Header from "@/components/landingPageV2/Header";
import Hero from "@/components/landingPageV2/Hero";
import Logos from "@/components/landingPageV2/Logos";
import Problem from "@/components/landingPageV2/Problem";
import Solution from "@/components/landingPageV2/Solution";
import HowItWorks from "@/components/landingPageV2/HowItWorks";
import TestimonialsCarousel from "@/components/landingPageV2/TestimonialsCarousel";
import Features from "@/components/landingPageV2/Features";
import Testimonials from "@/components/landingPageV2/Testimonials";
import Pricing from "@/components/landingPageV2/Pricing";
import FAQ from "@/components/landingPageV2/FAQ";
import GuidesSection from "@/components/landingPageV2/GuidesSection";
import CTA from "@/components/landingPageV2/CTA";
import Footer from "@/components/landingPageV2/Footer";
import { getAllContent } from "@/lib/content";

export const metadata = {
  title: "Lychee: Your Quant in a Box",
  description:
    "No more CSVs, coding, and ugly charts. Connect data directly to Polymarket, manipulate it instantly, generate beautiful dashboards, gain the ultimate edge. Zero coding. Zero friction. Real results.",
};

export default function LandingPageV2() {
  let articles = [];
  try {
    const guides = getAllContent("guides") || [];
    const blog = getAllContent("blog") || [];
    articles = [...guides, ...blog];
    articles.sort((a, b) =>
      (b.frontmatter?.publishedAt || "").localeCompare(a.frontmatter?.publishedAt || "")
    );
  } catch (e) {
    console.warn("Content could not be loaded:", e);
  }

  return (
    <main className="min-h-screen bg-background antialiased w-full mx-auto scroll-smooth font-sans">
      <Header />
      <Hero />
      <Logos />
      <Problem />
      <Solution />
      <HowItWorks />
      <TestimonialsCarousel />
      <Testimonials />
      <Pricing />
      <FAQ />
      <GuidesSection articles={articles} />
      <CTA />
      <Footer />
    </main>
  );
}
