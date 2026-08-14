import './globals.css'
import type { Metadata } from 'next'
import { Inter, Outfit } from 'next/font/google'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ThemeProvider, ThemeSwitcher } from '@/components/theme/ThemeProvider'
import StoreProvider from '@/store/StoreProvider'
import Toaster from '@/components/ui/Toaster'

const inter = Inter({ subsets: ['latin'], variable: '--font-body' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-display' })
const UserMenu = dynamic(() => import('@/components/nav/UserMenu'), { ssr: false })

export const metadata: Metadata = {
  title: 'vetool',
  description: 'organize cs2 and valorant custom games',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} ${inter.className} min-h-screen bg-bg text-text`}>
        <StoreProvider>
          <ThemeProvider>
            <div className="min-h-screen flex flex-col">
              <header className="sticky top-0 z-50 bg-bg/80 backdrop-blur-xl border-b border-border">
                <nav className="container mx-auto flex items-center justify-between h-16 px-4">
                  <Link
                    href="/"
                    className="text-lg font-semibold tracking-tight hover:text-primary transition-colors lowercase"
                    style={{ fontFamily: 'var(--font-display), sans-serif' }}
                  >
                    vetool
                  </Link>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/lobbies"
                      className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text hover:bg-bg-secondary rounded-bento-sm transition-all lowercase"
                    >
                      lobbies
                    </Link>
                    <div className="w-px h-5 bg-border mx-1" />
                    <ThemeSwitcher />
                    <UserMenu />
                  </div>
                </nav>
              </header>
              <main className="flex-1 container mx-auto px-4 py-8">
                {children}
              </main>
              <footer className="border-t border-border py-6">
                <div className="container mx-auto px-4 text-center text-sm text-text-muted">
                  vetool — custom games
                </div>
              </footer>
            </div>
            <Toaster />
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  )
}
