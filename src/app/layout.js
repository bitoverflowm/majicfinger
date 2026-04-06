import './globals.css'

import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import { siteConfig } from '@/lib/site'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'

const defaultTitle = `${siteConfig.name}: Your Quant in a Box`
const defaultDescription =
  'No more CSVs, coding, and ugly charts. Connect data directly to Polymarket, manipulate it instantly, generate beautiful dashboards, gain the ultimate edge. Zero coding. Zero friction. Real results.'

export const metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: defaultTitle,
    template: `%s - ${siteConfig.name}`,
  },
  description: defaultDescription,
  verification: {
    other: { _foundr: ['973f2a49e12fad2ad799756c823a6d3b'] },
  },
  openGraph: {
    url: siteConfig.url,
    type: 'website',
    title: defaultTitle,
    description: defaultDescription,
    siteName: siteConfig.name,
    images: [
      {
        url: 'https://lycheedata.com/ogImage2.png',
        width: 1200,
        height: 630,
        alt: 'Lychee OG Image',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    domain: 'lycheedata.com',
    url: siteConfig.url,
    title: defaultTitle,
    description: defaultDescription,
    image: 'https://lycheedata.com/ogImage2.png',
  },
}

export const viewport = {
  themeColor: 'black',
}

export default function RootLayout({ children }) {
  const fontVariables = `${GeistSans.variable} ${GeistMono.variable}`

  return (
    <html lang="en" suppressHydrationWarning className={fontVariables}>
      <body className="antialiased font-sans bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
