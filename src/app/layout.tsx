import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navigation } from '@/components/Navigation'
import { AuthProvider } from '@/contexts/AuthContext'

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'TWOS | P2P Duel Platform',
  description: 'Challenge opponents in 1v1 duels. Bet skins, win prizes, climb the ranks.',
  keywords: ['P2P', 'duels', 'skins', 'betting', 'gaming'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <Navigation />
            <main className="flex-1">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}

