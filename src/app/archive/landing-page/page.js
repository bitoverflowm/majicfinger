import Script from 'next/script'
import { StateProvider } from '@/context/stateContext'
import LandingPageOriginal from '@/components/archive/landingPage'
import Nav from '@/components/nav'

export default function ArchiveLandingPage() {
  return (
    <>
      <StateProvider>
        <Nav />
        <div className="z-10 pt-32 pb-20">
          <LandingPageOriginal />
        </div>
      </StateProvider>
    </>
  )
}
