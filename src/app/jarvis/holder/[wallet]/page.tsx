import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OpenHolderTerminal } from "./openHolderTerminal";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";

type Props = { params: { wallet: string }; searchParams: { market?: string } };

function cleanWallet(raw: string) {
  const wallet = String(raw || "").toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(wallet) ? wallet : null;
}

function cleanMarket(raw?: string) {
  const market = String(raw || "").toLowerCase();
  return /^0x[a-f0-9]{64}$/.test(market) ? market : null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const wallet = cleanWallet(params.wallet);
  if (!wallet) return {};
  const market = cleanMarket(searchParams.market);
  const short = `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
  const title = `Polymarket wallet ${short} · Holder Terminal`;
  const description = "PnL, Skill Score, open positions, and trade history for this Polymarket wallet, from Lychee's Holder Terminal.";
  const image = `${SITE}/api/jarvis/holder-card/${wallet}${market ? `?market=${market}` : ""}`;
  const url = `${SITE}/jarvis/holder/${wallet}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "Lychee", type: "website", images: [{ url: image, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
    robots: { index: false, follow: true },
  };
}

/** Share target for Jarvis wallet deep dives: unfurls as a Holder Terminal card, then opens the terminal on the wallet. */
export default function JarvisHolderPage({ params, searchParams }: Props) {
  const wallet = cleanWallet(params.wallet);
  if (!wallet) notFound();
  const market = cleanMarket(searchParams.market);
  const href = `/dashboard?terminal=holder&wallet=${wallet}`;
  const card = `/api/jarvis/holder-card/${wallet}${market ? `?market=${market}` : ""}`;
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-6 px-6 py-12">
      <img src={card} alt="Holder Terminal card for this wallet" className="w-full rounded-xl border shadow-sm" />
      <OpenHolderTerminal href={href} />
    </main>
  );
}
