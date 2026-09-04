import Link from "next/link";
import {
  buildProductLandingMetadata,
  ProductLandingShell,
} from "@/components/marketing/ProductLandingShell";
import { getQuantAnalysisContent } from "@/lib/content/featureReleases";

const TITLE = "Quant Analysis";
const DESCRIPTION =
  "Run quantitative workflows on prediction market and reference data — volume studies, calibration, and custom analytics in Lychee.";

export const metadata = buildProductLandingMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/quant-analysis",
});

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-us", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function QuantAnalysisPage() {
  const guides = getQuantAnalysisContent();

  return (
    <ProductLandingShell title={TITLE} description={DESCRIPTION} path="/quant-analysis">
      {guides.length > 0 ? (
        <div className="mt-8 border-t border-border pt-6">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Quant guides & case studies
          </h2>
          <ul className="mt-3 divide-y divide-border rounded-md border border-border">
            {guides.map((item) => {
              const description =
                item.frontmatter?.description || item.frontmatter?.summary || "";
              return (
                <li key={`${item.contentType}-${item.slug}`}>
                  <Link
                    href={`/guides/${item.slug}`}
                    className="block px-3 py-3 transition-colors hover:bg-muted/40"
                    prefetch={false}
                  >
                    <span className="block text-sm font-medium text-foreground">
                      {item.frontmatter?.title || item.slug}
                    </span>
                    {item.frontmatter?.publishedAt ? (
                      <time
                        dateTime={item.frontmatter.publishedAt}
                        className="mt-0.5 block text-xs text-muted-foreground"
                      >
                        {formatDate(item.frontmatter.publishedAt)}
                      </time>
                    ) : null}
                    {description ? (
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground line-clamp-2">
                        {description}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </ProductLandingShell>
  );
}
