import CheckoutClient from "@/components/checkout/CheckoutClient";

export const metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default function CheckoutPage({ searchParams }) {
  const plan = typeof searchParams?.plan === "string" ? searchParams.plan : "";
  const cycle = typeof searchParams?.cycle === "string" ? searchParams.cycle : "";
  const referral =
    (typeof searchParams?.ref === "string" && searchParams.ref) ||
    (typeof searchParams?.client_reference_id === "string" && searchParams.client_reference_id) ||
    "";

  return <CheckoutClient plan={plan} cycle={cycle} referral={referral} />;
}
