//import React, { useState, useEffect } from 'react'

//import { CsvToHtmlTable } from 'react-csv-to-table';
import Script from 'next/script'
import { StateProvider } from '@/context/stateContext'

import ActionMenu from '@/components/actionMenu'
import LandingPage from '@/components/landingPage'

import QuickNav from '@/components/nav/quickNav'
import FAQ from '@/components/faq'

export default function Home() {

  return (
    <>
        <Script
          strategy="afterInteractive"
          src="https://www.clarity.ms/tag/l5zqf94lap"
        />
        <StateProvider>
          <div className="p-10 flex flex-col place-items-center">
            <QuickNav />
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
