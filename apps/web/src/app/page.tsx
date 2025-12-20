import Link from 'next/link'

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto space-y-12 py-8 animate-fade-in">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Organize Your Scrims
        </h1>
        <p className="text-lg text-text-muted max-w-xl mx-auto">
          The minimalist way to handle CS2 and Valorant scrimmages with realtime lobbies, captain picks, and map veto.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Main CTA Card - spans 2 columns on larger screens */}
        <div className="md:col-span-2 lg:col-span-2 bento-card p-8 flex flex-col justify-between min-h-[200px]">
          <div className="space-y-3">
            <div className="bento-badge bento-badge-primary w-fit">Get Started</div>
            <h2 className="text-2xl font-semibold">Browse Lobbies</h2>
            <p className="text-text-muted">
              Find open scrims, join existing lobbies, or create your own match.
            </p>
          </div>
          <div className="mt-6">
            <Link
              href="/lobbies"
              className="bento-btn bento-btn-primary"
            >
              View Lobbies
            </Link>
          </div>
        </div>

        {/* Feature Card 1 */}
        <div className="bento-card p-6 space-y-3">
          <div className="w-10 h-10 rounded-bento-sm bg-primary-soft flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="font-semibold">Captain Picks</h3>
          <p className="text-sm text-text-muted">
            Fair 1-2-2-2-1 draft pattern for balanced teams.
          </p>
        </div>

        {/* Feature Card 2 */}
        <div className="bento-card p-6 space-y-3">
          <div className="w-10 h-10 rounded-bento-sm bg-accent-soft flex items-center justify-center">
            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h3 className="font-semibold">Map Veto</h3>
          <p className="text-sm text-text-muted">
            BO3/BO5 veto system with realtime updates.
          </p>
        </div>

        {/* Feature Card 3 */}
        <div className="bento-card p-6 space-y-3">
          <div className="w-10 h-10 rounded-bento-sm bg-success-soft flex items-center justify-center">
            <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="font-semibold">Realtime</h3>
          <p className="text-sm text-text-muted">
            Instant updates across all participants via SignalR.
          </p>
        </div>

        {/* Games Supported */}
        <div className="bento-card p-6 space-y-4">
          <h3 className="font-semibold">Supported Games</h3>
          <div className="flex gap-3">
            <span className="bento-badge bento-badge-warning">CS2</span>
            <span className="bento-badge bento-badge-danger">Valorant</span>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="text-center space-y-4">
        <p className="text-text-muted">Ready to get started?</p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/signup" className="bento-btn bento-btn-secondary">
            Create Account
          </Link>
          <Link href="/login" className="bento-btn bento-btn-ghost">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
