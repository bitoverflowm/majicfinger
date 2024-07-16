// import Nav from '@/components/nav';
import './globals.css'
import { Toaster } from "@/components/ui/toaster"

// import { StateProvider } from '@/context/stateContext'

export const metadata = {
  title: 'Easy Charts - Refreshingly simple charts.',
  description: 'Create stunning charts effortlessly with Easy Charts. No subscriptions, unlimited exports, and fully customizable. Get started today and simplify your data visualization.',
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
