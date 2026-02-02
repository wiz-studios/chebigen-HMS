import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import Providers from '@/components/providers/providers'
import { ThemeProvider } from '@/components/theme-provider'

export const metadata: Metadata = {
  title: 'Chebigen HMS',
  description: 'Chebigen Hospital Management System - Comprehensive healthcare management solution',
  generator: 'Chebigen HMS',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Providers>{children}</Providers>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
