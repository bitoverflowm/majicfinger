import { AnalyticsWrapper } from '@/components/analytics';
import Nav from '@/components/nav';

import './globals.css'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/*
        <head /> will contain the components returned by the nearest parent
        head.js. Find out more at https://beta.nextjs.org/docs/api-reference/file-conventions/head
      */}
      <head />
      <body>
        <div>
          <Nav/>
        </div>
        <div className=''>
          {children}
          <AnalyticsWrapper />
        </div>
      </body>
    </html>
  )
}
