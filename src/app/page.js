import Script from 'next/script'
import { GoogleAnalytics } from '@next/third-parties/google'

import { StateProvider } from '@/context/stateContext'

import LandingPageV2 from '@/app/landingpage_v2/page'

const SITE_URL = 'https://lycheedata.com';
const OG_IMAGE = `${SITE_URL}/ogImage2.png`;
// Twitter/social cards work best at 1200×630 (1.91:1). If ogImage2.png is not 1200×630, resize it for consistent display.
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

export const metadata = {
  title: 'Lychee: Your Quant in a Box',
  description: 'No more CSVs, coding, and ugly charts. Connect data directly to Polymarket, manipulate it instantly, generate beautiful dashboards, gain the ultimate edge. Zero coding. Zero friction. Real results.',
  openGraph: {
    url: SITE_URL,
    type: 'website',
    title: 'Lychee: Your Quant in a Box',
    description: 'No more CSVs, coding, and ugly charts. Connect data directly to Polymarket, manipulate it instantly, generate beautiful dashboards, gain the ultimate edge. Zero coding. Zero friction. Real results.',
    siteName: 'Lychee',
    images: [
      {
        url: OG_IMAGE,
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        alt: 'Lychee OG Image',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    domain: 'lycheedata.com',
    url: SITE_URL,
    title: 'Lychee: Your Quant in a Box',
    description: 'No more CSVs, coding, and ugly charts. Connect data directly to Polymarket, manipulate it instantly, generate beautiful dashboards, gain the ultimate edge. Zero coding. Zero friction. Real results.',
    image: OG_IMAGE,
  },
};

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
        <LandingPageV2 />
      </StateProvider>
    </>
  )
}
