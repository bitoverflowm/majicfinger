import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { reportHeadlines, reportSummary, traderReport } from "@/lib/mcp/research/traderReport";
import { insightLinesById } from "@/lib/mcp/research/insightFacts";
import { CLUSTER_LABELS, INSIGHTS } from "@/lib/mcp/research/traderInsights";
import { TraderReportView } from "./traderReportView";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";

type Props = { params: { wallet: string } };

function cleanWallet(raw: string) {
  const wallet = String(raw || "").toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(wallet) ? wallet : null;
}

const loadReport = cache(async (wallet: string) => traderReport(wallet).catch(() => null));

const displayName = (report: any, wallet: string) => report?.name || `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const wallet = cleanWallet(params.wallet);
  if (!wallet) return {};
  const report = await loadReport(wallet);
  const title = `${displayName(report, wallet)} · Ultra deep dive by Jarvis`;
  const description = report
    ? reportSummary(report)
    : "Edge, style, category ranks, current book, and crowd for this Polymarket trader, from Lychee's Jarvis.";
  const image = `${SITE}/api/jarvis/report-card/${wallet}`;
  const url = `${SITE}/jarvis/report/${wallet}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "Lychee", type: "website", images: [{ url: image, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
    robots: { index: false, follow: true },
  };
}

/** Public dashboard for a Jarvis "go ultra deep" reply: every trader insight, charted. */
export default async function JarvisTraderReportPage({ params }: Props) {
  const wallet = cleanWallet(params.wallet);
  if (!wallet) notFound();
  const report = await loadReport(wallet);
  if (!report) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-medium tracking-tight">Couldn&apos;t build this report right now</h1>
        <p className="text-sm text-muted-foreground">Polymarket didn&apos;t return data for this wallet. Try again in a minute.</p>
        <a href={`/dashboard?terminal=holder&wallet=${wallet}`} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Open in Holder Terminal
        </a>
      </main>
    );
  }
  return (
    <TraderReportView
      report={report}
      headlines={reportHeadlines(report)}
      reads={insightLinesById(report.insights)}
      insights={INSIGHTS.map(({ id, cluster, label }) => ({ id, cluster, label }))}
      clusters={CLUSTER_LABELS}
    />
  );
}
