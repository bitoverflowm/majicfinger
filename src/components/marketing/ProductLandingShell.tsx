import type { Metadata } from "next";
import Link from "next/link";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";

type ProductLandingShellProps = {
  title: string;
  description: string;
  path: string;
  children?: React.ReactNode;
};

export function buildProductLandingMetadata({
  title,
  description,
  path,
}: Omit<ProductLandingShellProps, "children">): Metadata {
  const url = `${SITE.replace(/\/$/, "")}${path}`;
  return {
    metadataBase: new URL(SITE),
    title: { absolute: `${title} · Lychee Data` },
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${title} · Lychee Data`,
      description,
      url,
      siteName: "Lychee",
      type: "website",
      images: [
        {
          url: `${SITE}/ogImage2.png`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · Lychee Data`,
      description,
      images: [`${SITE}/ogImage2.png`],
    },
  };
}

export function ProductLandingShell({
  title,
  description,
  path,
  children,
}: ProductLandingShellProps) {
  const url = `${SITE.replace(/\/$/, "")}${path}`;

  return (
    <main className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: title,
            description,
            url,
            isPartOf: { "@type": "WebSite", name: "Lychee", url: SITE },
          }),
        }}
      />
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <div className="rounded-xl border border-border bg-background/80 p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            This page is a placeholder — detailed product content is coming soon.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/#demo"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Start free query
            </Link>
            <Link
              href="/guides"
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Browse guides
            </Link>
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
