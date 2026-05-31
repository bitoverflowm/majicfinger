import { Navbar } from "@/components/sections/navbar";
import { FooterSection } from "@/components/sections/footer-section";

/**
 * Article-style guides at `/guides/[slug]` live outside `(marketing)` so they need
 * the same top chrome as `/guides` and the rest of the marketing site.
 */
export default function GuidesSectionLayout({ children }) {
  return (
    <div className="relative mx-auto min-w-0 max-w-[min(100%,84rem)] border-x">
      <div className="absolute left-6 top-0 z-10 block h-full w-px border-l border-border" />
      <div className="absolute right-6 top-0 z-10 block h-full w-px border-r border-border" />
      <Navbar />
      {children}
      <FooterSection />
    </div>
  );
}
