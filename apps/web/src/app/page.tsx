import Link from 'next/link'

const STEPS = [
  { n: '01', title: 'Open a lobby', body: 'Name it, pick CS2 or VALORANT, set 1v1–5v5, public or private. Share one link.' },
  { n: '02', title: 'Draft captains', body: 'Two captains. 1-2-2-2-1 pick order. No Discord “who’s leftover” arguments.' },
  { n: '03', title: 'Veto the pool', body: 'BO1, BO3, or BO5. First pick or last pick. Live bans, live picks, auto leftover.' },
  { n: '04', title: 'Drop the string', body: 'Host posts the CS2 connect string or VALORANT party code. Everyone copies. You play.' },
]

const FEATURES = [
  { tag: 'Draft', title: 'Captain picks that feel like a showmatch', body: 'Stored captains, live rosters, unassigned bench. Pattern chips so nobody loses the turn.' },
  { tag: 'Veto', title: 'Tournament veto, not a spreadsheet', body: 'Active-duty / ranked defaults plus catalog extras. Hosts trim the pool before the series starts.' },
  { tag: 'Live', title: 'Everyone sees the same room', body: 'SignalR on lobby and veto hubs. Reconnect keeps membership. Guests can still sit in.' },
  { tag: 'Host', title: 'One host. Clear controls.', body: 'Map pool, best-of, first/last pick, start veto, join details. Everyone else just plays.' },
  { tag: 'Share', title: 'A URL is the invite', body: 'Copy the lobby link. Private rooms stay off the public board. No ten-step Discord setup.' },
  { tag: 'Games', title: 'CS2 and VALORANT, same flow', body: 'Same lobby → draft → veto → connect loop. Game-colored chips so the floor stays readable.' },
]

const COMPARE = [
  ['Ten-man Discord chaos', 'One lobby URL, live seats'],
  ['Captains in chat, missed picks', '1-2-2-2-1 draft with turn chips'],
  ['Map bans in a Google sheet', 'Live veto board, BO1/3/5'],
  ['“What’s the IP again?”', 'Join details on the match page'],
  ['Who even has the server?', 'Host posts once. Everyone copies.'],
]

const FAQ = [
  {
    q: 'Do people need accounts?',
    a: 'Hosts and regulars should sign in. If the lobby is full of randos, they can join as guests and still sit in the draft.',
  },
  {
    q: 'What games are supported?',
    a: 'Counter-Strike 2 and VALORANT. Same organizer loop: lobby, captains, map pool, veto, connect string.',
  },
  {
    q: 'Can I run a private scrim?',
    a: 'Yes. Flip public off when you create the room. People with the link can still join until you fill the slot count.',
  },
  {
    q: 'Who starts the veto?',
    a: 'The lobby host. You need two captains first. Then pick BO1/BO3/BO5 and whether Team A wants first pick or last pick.',
  },
  {
    q: 'What happens after maps are locked?',
    a: 'The match page keeps the selected maps and a join-details field — CS2 connect string or a VALORANT party/custom code.',
  },
]

export default function Home() {
  return (
    <div className="animate-fade-in">
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-team-a" />
        <div className="absolute inset-y-0 right-0 w-1.5 bg-team-b" />
        <div className="container mx-auto py-16 md:py-24">
          <div className="max-w-4xl space-y-6">
            <p className="kicker">CS2 · VALORANT · Custom games</p>
            <h1 className="font-display text-6xl sm:text-7xl md:text-8xl leading-[0.85] tracking-[0.02em]">
              Share a link.
              <br />
              <span className="text-team-a">Draft.</span>{' '}
              <span className="text-team-b">Veto.</span>
              <br />
              Play.
            </h1>
            <p className="text-lg md:text-xl text-text-secondary max-w-2xl">
              VeTool is the scrim floor for CS2 and VALORANT customs — live lobbies, captain draft,
              tournament veto, then a connect string. Built like a scoreboard, not a form wizard.
              <span className="sr-only">cs2 and valorant</span>
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/lobbies" className="bento-btn bento-btn-primary">
                Browse lobbies
              </Link>
              <Link href="/signup" className="bento-btn bento-btn-secondary">
                Create account
              </Link>
              <span className="text-xs font-mono tracking-[0.16em] uppercase text-text-muted">
                Guest join supported
              </span>
            </div>
          </div>

          <dl className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="stat">
              <div className="stat-value">2</div>
              <div className="stat-label">Titles — CS2 / VAL</div>
            </div>
            <div className="stat">
              <div className="stat-value score-a">1-2-2-2-1</div>
              <div className="stat-label">Captain draft</div>
            </div>
            <div className="stat">
              <div className="stat-value score-b">BO1–5</div>
              <div className="stat-label">Map veto</div>
            </div>
            <div className="stat">
              <div className="stat-value">LIVE</div>
              <div className="stat-label">SignalR rooms</div>
            </div>
          </dl>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="container mx-auto py-16 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="kicker">First 60 seconds</p>
              <h2 className="font-display text-4xl md:text-5xl mt-2">From URL to knife round</h2>
            </div>
            <p className="text-sm text-text-muted max-w-sm">
              Not another empty dashboard. Four beats, then you are in server.
            </p>
          </div>
          <ol className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
            {STEPS.map((step) => (
              <li key={step.n} className="bento-card p-5 space-y-3">
                <div className="font-display text-3xl text-team-a">{step.n}</div>
                <h3 className="font-display text-2xl">{step.title}</h3>
                <p className="text-sm text-text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="container mx-auto py-16 grid lg:grid-cols-2 gap-4">
          <Link href="/lobbies?game=cs2" className="bento-card-interactive p-8 min-h-[240px] flex flex-col justify-between">
            <div className="space-y-3">
              <span className="bento-badge chip-cs2">CS2</span>
              <h2 className="font-display text-5xl">Counter-Strike 2</h2>
              <p className="text-text-muted max-w-md">
                Active-duty defaults, extra catalog maps, connect string on the match page.
                Five-man or pug it down to 1v1.
              </p>
            </div>
            <span className="font-display tracking-[0.14em] text-cs2">Open CS2 floor →</span>
          </Link>
          <Link href="/lobbies?game=val" className="bento-card-interactive p-8 min-h-[240px] flex flex-col justify-between">
            <div className="space-y-3">
              <span className="bento-badge chip-val">VALORANT</span>
              <h2 className="font-display text-5xl">VALORANT</h2>
              <p className="text-text-muted max-w-md">
                Ranked pool plus extras. Same captain draft. Party or custom-game code after veto.
              </p>
            </div>
            <span className="font-display tracking-[0.14em] text-val">Open VAL floor →</span>
          </Link>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="container mx-auto py-16 space-y-8">
          <div>
            <p className="kicker">Why VeTool</p>
            <h2 className="font-display text-4xl md:text-5xl mt-2">The organizer, not the chat log</h2>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {FEATURES.map((f) => (
              <article key={f.tag} className="bento-card p-6 space-y-3">
                <span className="bento-badge bento-badge-primary">{f.tag}</span>
                <h3 className="font-display text-2xl">{f.title}</h3>
                <p className="text-sm text-text-muted">{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="container mx-auto py-16 grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
          <div>
            <p className="kicker">Versus the usual</p>
            <h2 className="font-display text-4xl md:text-5xl mt-2 mb-6">Stop running scrims out of a pin</h2>
            <div className="overflow-hidden border border-border">
              <table className="w-full text-sm">
                <thead className="bg-bg-secondary text-left font-mono text-[0.6875rem] tracking-[0.16em] uppercase text-text-muted">
                  <tr>
                    <th className="px-4 py-3">The pin / sheet</th>
                    <th className="px-4 py-3 text-team-a">VeTool</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map(([left, right]) => (
                    <tr key={left} className="border-t border-border">
                      <td className="px-4 py-3 text-text-muted">{left}</td>
                      <td className="px-4 py-3">{right}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <aside className="bento-card p-6 space-y-4">
            <p className="kicker">Live floor</p>
            <h3 className="font-display text-3xl">Walk into an open lobby</h3>
            <p className="text-sm text-text-muted">
              Public rooms sit on the browse page with game, status, and seats. Private ones stay
              link-only. If you already host one, jump straight back in.
            </p>
            <Link href="/lobbies" className="bento-btn bento-btn-primary w-full">
              View lobbies
            </Link>
            <p className="text-xs font-mono uppercase tracking-[0.14em] text-text-muted">
              Need an account for hosting. Players can guest.
            </p>
          </aside>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="container mx-auto py-16 space-y-8">
          <div>
            <p className="kicker">FAQ</p>
            <h2 className="font-display text-4xl md:text-5xl mt-2">Straight answers</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {FAQ.map((item) => (
              <article key={item.q} className="bento-card p-6 space-y-2">
                <h3 className="font-semibold">{item.q}</h3>
                <p className="text-sm text-text-muted">{item.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="container mx-auto py-16 text-center space-y-5">
          <p className="kicker mx-auto">Ready</p>
          <h2 className="font-display text-5xl md:text-6xl">Put ten players in a room</h2>
          <p className="text-text-muted max-w-xl mx-auto">
            Create an account, stand up a lobby, throw the link in the team chat.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="bento-btn bento-btn-primary">
              Create account
            </Link>
            <Link href="/login" className="bento-btn bento-btn-secondary">
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
