
import Script from 'next/script'

import { GoogleAnalytics } from '@next/third-parties/google'
import EasyCharts from './easyCharts';

export const metadata = {
  title: 'Easy Charts - Refreshingly simple charts.',
  description: 'Create stunning charts effortlessly with Easy Charts. Unlimited exports, and fully customizable. Get started today and simplify your data visualization.',
  verification: {
    other: { _foundr: ['973f2a49e12fad2ad799756c823a6d3b'] },
  },
  openGraph: {
    url: 'https://www.lych3e.com/charts',
    type: 'website',
    title: 'Easy Charts - Refreshingly simple charts. 0Code shadcn/charts.',
    description: 'Create stunning charts effortlessly with Easy Charts. No Code Shdcn Charts. No subscriptions, unlimited exports, and fully customizable. Get started today and simplify your data visualization.',
    siteName: 'Easy Charts',
    images: [
      {
        url: 'https://www.lych3e.com/ogImage.png',
        width: 1200,
        height: 630,
        alt: 'Easy Charts OG Image'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    domain: 'lych3e.com/charts',
    url: 'https://www.lych3e.com/charts',
    title: 'Easy Charts - Refreshingly simple charts. 0Code shadcn/charts.',
    description: 'Create stunning charts effortlessly with Easy Charts. No Code Shdcn Charts. No subscriptions, unlimited exports, and fully customizable. Get started today and simplify your data visualization.',
    image: 'https://www.lych3e.com/ogImage.png'
  }
};

const charts = () => {  
    const clairtyCode = `
        (function (c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "l5zqf94lap"); `

    return (
      <div>
          <div className='bg-[#0064E6] text-white'>
              <Script
                  id = "ms-clarity"
                  strategy="afterInteractive"
              >{clairtyCode}</Script>
              <Script async src="https://cdn.promotekit.com/promotekit.js" data-promotekit="03b8c588-8350-4a0c-97f0-0a839509e8e0" strategy="afterInteractive"/>
              <Script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js" strategy="afterInteractive"/>
              <GoogleAnalytics gaId="G-G8X2NEPTEG" />
            <EasyCharts />              
          </div>
        </div>
    )
}

export default charts