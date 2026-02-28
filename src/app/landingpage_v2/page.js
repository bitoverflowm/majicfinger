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
import Blog from "@/components/landingPageV2/Blog";
import CTA from "@/components/landingPageV2/CTA";
import Footer from "@/components/landingPageV2/Footer";

export const metadata = {
  title: "Easy Charts - Refreshingly simple charts | Landing V2",
  description:
    "Create stunning charts effortlessly with Easy Charts. No subscriptions, unlimited exports, and fully customizable. Get started today.",
};

export default function LandingPageV2() {
  return (
    <main className="min-h-screen bg-background antialiased w-full mx-auto scroll-smooth">
      <Header />
      <Hero />
      <Logos />
      <Problem />
      <Solution />
      <HowItWorks />
      <TestimonialsCarousel />
      <Features />
      <Testimonials />
      <Pricing />
      <FAQ />
      <Blog />
      <CTA />
      <Footer />
    </main>
  );
}
