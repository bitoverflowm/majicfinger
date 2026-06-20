import {
  buildProductLandingMetadata,
  ProductLandingShell,
} from "@/components/marketing/ProductLandingShell";

const TITLE = "Data Sheet";
const DESCRIPTION =
  "Explore connected datasets in a spreadsheet-style workspace — filter, pivot, and analyze prediction market data without writing SQL.";

export const metadata = buildProductLandingMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/data-sheet",
});

export default function DataSheetPage() {
  return (
    <ProductLandingShell
      title={TITLE}
      description={DESCRIPTION}
      path="/data-sheet"
    />
  );
}
