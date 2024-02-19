//import React, { useState, useEffect } from 'react'

//import { CsvToHtmlTable } from 'react-csv-to-table';
import { StateProvider } from '@/context/stateContext'

import ActionMenu from '@/components/actionMenu'
import LandingPage from '@/components/landingPage'

import QuickNav from '@/components/nav/quickNav'

export default function Home() {

  return (
    <StateProvider>
      <div className="p-10 flex flex-col place-items-center">
        <QuickNav />
        <div className='text-center'>
          <LandingPage />
        </div>
        <div className="bg-lychee-white bg-opacity-50 w-2/3 px-64 pt-20 pb-96">
            <div className="font-black text-2xl font-title py-4">
              Lychee.
            </div>
            <div className="text-4xl text-lychee-green">
              Analyze and Visualize Data
            </div>
            <div className="text-4xl text-lychee-green pb-16">
              Without <span className="">Spreadsheets</span>
            </div>
            <ActionMenu />
        </div>
      </div>
    </StateProvider>
  )
}
