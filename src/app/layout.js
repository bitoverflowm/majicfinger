// import Nav from '@/components/nav';
import './globals.css'
import { Toaster } from "@/components/ui/toaster"

// import { StateProvider } from '@/context/stateContext'

export const metadata = {
  title: 'Lychee: Your Quant in a Box',
  description: 'No more CSVs, coding, and ugly charts. Connect data directly to Polymarket, manipulate it instantly, generate beautiful dashboards, gain the ultimate edge. Zero coding. Zero friction. Real results.',
  verification: {
    other: { _foundr: ['973f2a49e12fad2ad799756c823a6d3b'] },
  },
  openGraph: {
    url: 'https://lycheedata.com',
    type: 'website',
    title: 'Lychee: Your Quant in a Box',
    description: 'No more CSVs, coding, and ugly charts. Connect data directly to Polymarket, manipulate it instantly, generate beautiful dashboards, gain the ultimate edge. Zero coding. Zero friction. Real results.',
    siteName: 'Lychee',
    images: [
      {
        url: 'https://lycheedata.com/ogImage2.png',
        width: 1200,
        height: 630,
        alt: 'Lychee OG Image'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    domain: 'lycheedata.com',
    url: 'https://lycheedata.com',
    title: 'Lychee: Your Quant in a Box',
    description: 'No more CSVs, coding, and ugly charts. Connect data directly to Polymarket, manipulate it instantly, generate beautiful dashboards, gain the ultimate edge. Zero coding. Zero friction. Real results.',
    image: 'https://lycheedata.com/ogImage2.png'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/*
        <head /> will contain the components returned by the nearest parent
        head.js. Find out more at https://beta.nextjs.org/docs/api-reference/file-conventions/head
      */}
      <body>
        <div className=''>
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  )
}
