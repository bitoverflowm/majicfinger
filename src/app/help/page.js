import Link from "next/link";

import { FooterSection } from "@/components/sections/footer-section";
import { MarketingNavbar } from "@/components/sections/marketing-navbar";
import { canonicalUrl } from "@/lib/site";

export const metadata = {
  title: "Help | Lychee",
  description: "Contact MisterrPink, creator of Lychee, for support and questions.",
  alternates: {
    canonical: canonicalUrl("/help"),
  },
};

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-background font-sans antialiased theme-landing">
      <MarketingNavbar />
      <article className="mx-auto max-w-3xl px-4 py-16 md:py-24">
        <h1 className="mb-8 text-4xl font-bold tracking-tight text-foreground">Help</h1>

        <div className="space-y-6 text-base leading-relaxed text-muted-foreground">
          <p className="text-foreground">
            Hi, I&apos;m Kash, aka MisterrPink — the creator of Lychee.
          </p>
          <p>
            I personally respond to every email and DM I receive, so please don&apos;t be
            afraid to reach out!
          </p>
          <p>
            If you use X/Twitter:{" "}
            <Link
              href="https://twitter.com/misterrpink1"
              className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
              rel="noopener noreferrer"
              target="_blank"
            >
              @misterrpink1
            </Link>
          </p>
          <p>
            Email:{" "}
            <Link
              href="mailto:kash@lycheedata.com"
              className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
            >
              kash@lycheedata.com
            </Link>
          </p>
          <p>
            Please follow me and DM me. If you don&apos;t follow me I probably won&apos;t see
            your DMs. 😊
          </p>
        </div>

        <Link
          href="/"
          className="mt-12 inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back to Home
        </Link>
      </article>
      <FooterSection />
    </main>
  );
}
