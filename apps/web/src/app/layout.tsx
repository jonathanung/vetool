import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ThemeProvider, ThemeSwitcher } from '@/components/theme/ThemeProvider'
import StoreProvider from '@/store/StoreProvider'
import Toaster from '@/components/ui/Toaster'

const inter = Inter({ subsets: ['latin'] })
const UserMenu = dynamic(() => import('@/components/nav/UserMenu'), { ssr: false })

export const metadata: Metadata = {
  title: 'VeTool',
  description: 'Scrim organizer for CS2 and VAL',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-50`}>
        <StoreProvider>
          <ThemeProvider>
            <header className="border-b border-gray-200 dark:border-gray-800">
              <nav className="container mx-auto flex items-center justify-between p-4">
                <Link href="/" className="font-semibold">VeTool</Link>
                <div className="flex items-center gap-4 text-sm">
                  <Link href="/lobbies">Lobbies</Link>
                  <ThemeSwitcher />
                  <UserMenu />
                </div>
              </nav>
            </header>
            <main className="container mx-auto p-4">
              {children}
            </main>
            <Toaster />
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  )
}
