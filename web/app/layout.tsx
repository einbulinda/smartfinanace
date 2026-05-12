import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: 'SmartFinance',
  description: 'Smarter choices. Better futures.',
  icons: {
    icon: [
      { url: '/SmartFinance/favicon_io/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/SmartFinance/favicon_io/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/SmartFinance/favicon_io/apple-touch-icon.png',
    shortcut: '/SmartFinance/favicon_io/favicon.ico',
  },
  manifest: '/manifest.webmanifest',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${inter.variable}`}>
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
