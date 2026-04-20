import './globals.css'
import Script from 'next/script'
import { GoogleAnalytics } from '@next/third-parties/google'

import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'

export { metadata } from './metadata'

export const viewport = {
  themeColor: 'black',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }) {
  const fontVariables = `${GeistSans.variable} ${GeistMono.variable}`

  return (
    <html lang="en" suppressHydrationWarning className={fontVariables}>
      <body className="antialiased font-sans bg-background">
        <Script id="ms-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "l5zqf94lap");`}
        </Script>
        <GoogleAnalytics gaId="G-WLN6YMVHF1" />
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
