import {
  buildProductLandingMetadata,
  ProductLandingShell,
} from "@/components/marketing/ProductLandingShell";

const TITLE = "Quant Analysis";
const DESCRIPTION =
  "Run quantitative workflows on prediction market and reference data — volume studies, calibration, and custom analytics in Lychee.";

export const metadata = buildProductLandingMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/quant-analysis",
});

export default function QuantAnalysisPage() {
  return (
    <ProductLandingShell
      title={TITLE}
      description={DESCRIPTION}
      path="/quant-analysis"
    />
  );
}
