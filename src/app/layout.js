import './globals.css'

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
