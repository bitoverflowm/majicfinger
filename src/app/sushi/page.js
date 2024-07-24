
import Script from 'next/script'

import { GoogleAnalytics } from '@next/third-parties/google'
import EasySushi from './easySushi';

export const metadata = {
  title: 'Live Crypto Insights No Coding.',
  description: 'Access what the whales have, without the coding.',
  verification: {
    other: { _foundr: ['973f2a49e12fad2ad799756c823a6d3b'] },
  },
  openGraph: {
    url: 'https://www.lych3e.com/sushi',
    type: 'website',
    title: 'Live Crypto Insights No Coding.',
    description: 'Access what the whales have, without the coding.',
    siteName: 'Easy Sushi',
    images: [
      {
        url: 'https://www.lych3e.com/whatTheWhalesSee.png',
        width: 1200,
        height: 630,
        alt: 'What the Whales See'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    domain: 'lych3e.com/sushi',
    url: 'https://www.lych3e.com/sushi',
    title: 'Live Crypto Insights No Coding.',
    description: 'Access what the whales have, without the coding.',
    image: 'https://www.lych3e.com/whatTheWhalesSee.png'
  }
};

const sushi = () => {  
    const clairtyCode = `
        (function (c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "l5zqf94lap"); `

    return (
      <div>
          <div className='bg-black text-white'>
              <Script
                  id = "ms-clarity"
                  strategy="afterInteractive"
              >{clairtyCode}</Script>
              <Script async src="https://cdn.promotekit.com/promotekit.js" data-promotekit="03b8c588-8350-4a0c-97f0-0a839509e8e0" strategy="afterInteractive"/>
              <Script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js" strategy="afterInteractive"/>
              <GoogleAnalytics gaId="G-G8X2NEPTEG" />
              <EasySushi />              
          </div>
        </div>
    )
}

export default sushi