//import React, { useState, useEffect } from 'react'

//import { CsvToHtmlTable } from 'react-csv-to-table';
import Script from 'next/script'
import { GoogleAnalytics } from '@next/third-parties/google'

import { StateProvider } from '@/context/stateContext'

import ActionMenu from '@/components/actionMenu'
import LandingPage from '@/components/landingPage'

import QuickNav from '@/components/nav/quickNav'
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
        <GoogleAnalytics gaId="G-G8X2NEPTEG" />
        <StateProvider>
          <Nav/>
          <div className="p-10 flex flex-col place-items-center">
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
