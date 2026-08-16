import './globals.css'
import type { Metadata } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans, Teko } from 'next/font/google'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ThemeProvider, ThemeSwitcher } from '@/components/theme/ThemeProvider'
import StoreProvider from '@/store/StoreProvider'
import Toaster from '@/components/ui/Toaster'
import { Wordmark } from '@/components/brand/Mark'

const body = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
})
const display = Teko({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
})
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
})
const UserMenu = dynamic(() => import('@/components/nav/UserMenu'), { ssr: false })

export const metadata: Metadata = {
  title: 'VeTool — Draft. Veto. Play.',
  description:
    'Organize CS2 and VALORANT customs: live lobbies, captain draft, tournament map veto, then a connect string.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('vetool-theme');if(t==='soft'){document.documentElement.classList.remove('dark');document.documentElement.setAttribute('data-theme','soft')}else{document.documentElement.classList.add('dark');document.documentElement.removeAttribute('data-theme')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${body.variable} ${display.variable} ${mono.variable} ${body.className} min-h-screen bg-bg text-text`}>
        <StoreProvider>
          <ThemeProvider>
            <div className="min-h-screen flex flex-col">
              <header className="sticky top-0 z-50 border-b border-border bg-bg/85 backdrop-blur-md">
                <nav className="container mx-auto flex items-center justify-between h-16 gap-3 whitespace-nowrap">
                  <Link href="/" className="hover:opacity-90 transition-opacity min-w-0">
                    <Wordmark />
                  </Link>
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <Link
                      href="/lobbies"
                      className="px-2 sm:px-3 py-2 text-xs font-mono font-semibold tracking-[0.16em] uppercase text-text-secondary hover:text-text hover:bg-bg-secondary"
                    >
                      Lobbies
                    </Link>
                    <div className="hidden sm:block w-px h-5 bg-border mx-1" />
                    <ThemeSwitcher />
                    <UserMenu />
                  </div>
                </nav>
              </header>
              <main className="flex-1">{children}</main>
              <footer className="border-t border-border bg-bg-secondary/70">
                <div className="container mx-auto py-10 grid gap-8 md:grid-cols-3">
                  <div className="space-y-3">
                    <Wordmark />
                    <p className="text-sm text-text-muted max-w-xs">
                      Share a link. Draft captains. Veto maps. Drop a connect string. Built for CS2 and VALORANT scrims.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="kicker">Play</div>
                    <Link href="/lobbies?game=cs2" className="block text-sm text-text-secondary hover:text-team-a">
                      CS2 lobbies
                    </Link>
                    <Link href="/lobbies?game=val" className="block text-sm text-text-secondary hover:text-team-b">
                      VALORANT lobbies
                    </Link>
                    <Link href="/signup" className="block text-sm text-text-secondary hover:text-text">
                      Create account
                    </Link>
                  </div>
                  <div className="space-y-2">
                    <div className="kicker">Stack</div>
                    <p className="text-sm text-text-muted">
                      Live SignalR lobbies. 1-2-2-2-1 captain draft. BO1 / BO3 / BO5 veto. Guest join. Map catalog extras.
                    </p>
                  </div>
                </div>
                <div className="border-t border-border">
                  <div className="container mx-auto py-4 flex flex-wrap items-center justify-between gap-2 text-[0.6875rem] font-mono tracking-[0.16em] uppercase text-text-muted">
                    <span>VeTool — custom games</span>
                    <span className="text-team-a">Red drafts</span>
                    <span className="text-team-b">Blue vetoes</span>
                  </div>
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
