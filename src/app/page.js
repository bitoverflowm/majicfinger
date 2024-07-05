import Script from 'next/script'
import { GoogleAnalytics } from '@next/third-parties/google'

import 'tailwindcss/tailwind.css';

import { StateProvider } from '@/context/stateContext'

import LandingPage from '@/components/landingPage'
import Nav from '@/components/nav'

export default function Home() {

  const clairtyCode = `
                      (function (c,l,a,r,i,t,y){
                          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                      })(window, document, "clarity", "script", "l5zqf94lap"); `

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
                      });`

  return (
    <>
      <Script
        id = "ms-clarity"
        strategy="afterInteractive"
      >{clairtyCode}</Script>
      <Script async src="https://cdn.promotekit.com/promotekit.js" data-promotekit="03b8c588-8350-4a0c-97f0-0a839509e8e0" strategy="afterInteractive"/>
      <Script id="promoteKit">{affiliateCode}</Script>
      <Script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"/>
      <GoogleAnalytics gaId="G-G8X2NEPTEG" />
      <StateProvider>
        <Nav/>
        <div className="bg-lychee_black z-10 pt-32 pb-20">
          <LandingPage />
        </div>
      </StateProvider>
    </>
  )
}
