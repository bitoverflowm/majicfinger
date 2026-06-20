import { FooterSection } from "@/components/sections/footer-section";
import { LycheeContentShell } from "@/components/content/LycheeContentShell";
import { getLycheeContentNavData } from "@/lib/content/lychee-content-nav";

/**
 * lychee_content article routes at `/guides/[slug]` (guides + blog MDX).
 * Doc-style left sidebar; no marketing navbar.
 */
export default async function GuidesSectionLayout({ children }) {
  const navData = getLycheeContentNavData();

  return (
    <LycheeContentShell navData={navData}>
      {children}
      <FooterSection />
    </LycheeContentShell>
  );
}
