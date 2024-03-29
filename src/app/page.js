//import React, { useState, useEffect } from 'react'

//import { CsvToHtmlTable } from 'react-csv-to-table';
import Script from 'next/script'
import { GoogleAnalytics } from '@next/third-parties/google'

import { StateProvider } from '@/context/stateContext'

import ActionMenu from '@/components/actionMenu'
import LandingPage from '@/components/landingPage'

import FAQ from '@/components/faq'
import Nav from '@/components/nav'

export default function Home() {

  const clairtyCode = `
                      (function (c,l,a,r,i,t,y){
                          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                      })(window, document, "clarity", "script", "l5zqf94lap"); `

  return (
    <>
        <Script
          id = "ms-clarity"
          strategy="afterInteractive"
        >{clairtyCode}</Script>
        <Script async src="https://cdn.promotekit.com/promotekit.js" data-promotekit="03b8c588-8350-4a0c-97f0-0a839509e8e0" strategy="afterInteractive"/>
        <Script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js" strategy="afterInteractive"/>
        <GoogleAnalytics gaId="G-G8X2NEPTEG" />
        <StateProvider>
          <Nav/>
          <div className="flex flex-col place-items-center bg-white/20">
            <div className='text-center max-w-screen overflow-hidden'>
              <LandingPage />
            </div>
            <div className="">
                <ActionMenu />
            </div>
              <FAQ />
          </div>
        </StateProvider>
    </>
  )
}
