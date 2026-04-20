import Script from "next/script";

import { StateProvider } from "@/context/stateContext";

import LandingPageV2 from "./landingpage_v2/page";

export default function Home() {
  const affiliateCode = `(function(){
                          setTimeout(function() {
                              $('a[href^="https://buy.stripe.com/"]').each(function(){
                                  const oldBuyUrl = $(this).attr("href");
                                  const referralId = window.promotekit_referral;
                                  if (!oldBuyUrl.includes("client_reference_id")) {
                                      const newBuyUrl = oldBuyUrl + "?client_reference_id=" + referralId;
                                      $(this).attr("href", newBuyUrl);
                                  }
                              });
                              $("[pricing-table-id]").each(function(){
                                $(this).attr("client-reference-id", window.promotekit_referral);
                              });
                              $("[buy-button-id]").each(function(){
                                $(this).attr("client-reference-id", window.promotekit_referral);
                              });
                          }, 2000);
                      });`;

  return (
    <>
      <Script
        async
        src="https://cdn.promotekit.com/promotekit.js"
        data-promotekit="03b8c588-8350-4a0c-97f0-0a839509e8e0"
        strategy="afterInteractive"
      />
      <Script id="promoteKit">{affiliateCode}</Script>
      <Script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js" />
      <StateProvider>
        <LandingPageV2 />
      </StateProvider>
    </>
  );
}

