import {
  buildProductLandingMetadata,
  ProductLandingShell,
} from "@/components/marketing/ProductLandingShell";

const TITLE = "CSV Exports";
const DESCRIPTION =
  "Download Kalshi, Polymarket, and reference datasets as CSV for offline analysis, backtesting, and research workflows.";

export const metadata = buildProductLandingMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/csv-exports",
});

export default function CsvExportsPage() {
  return (
    <ProductLandingShell
      title={TITLE}
      description={DESCRIPTION}
      path="/csv-exports"
    />
  );
}
