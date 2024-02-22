//import React, { useState, useEffect } from 'react'

//import { CsvToHtmlTable } from 'react-csv-to-table';
import { StateProvider } from '@/context/stateContext'

import ActionMenu from '@/components/actionMenu'
import LandingPage from '@/components/landingPage'

import QuickNav from '@/components/nav/quickNav'
import FAQ from '@/components/faq'

export default function Home() {

  return (
    <>
        <script type="text/javascript">
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "l5zqf94lap");
        </script>
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
