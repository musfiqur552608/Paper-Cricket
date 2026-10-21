# Paper Cricket · কাগজের ক্রিকেট

A mobile-first, real-time two-player paper cricket game. Two friends open the same room on their phones, one spins the paper, the other slides a pen across a hidden board, and the scorebook fills itself in.

No accounts. No downloads. Just a room code, a bit of mischief, and eleven hand-drawn segments.

---

## What is inside

- **Real-time two-player rooms** with six-character codes (for example `/room/A7KQ2M`).
- **Hidden, server-side spins** — the final board rotation is generated with Postgres randomness, sealed in a private table, and revealed only after the ball is scored.
- **The full paper-cricket ritual** — batter holds the pen, bowler spins, an opaque paper screen hides the board, the batter drags the pen blindly, then the paper lifts and the result is stamped.
- **Complete scoring** — runs, fours, sixes, wickets, extras, free hits, fall of wickets, targets, required run rate, over timelines, and player scorecards.
- **Lobby rules** — 1–10 overs, 1–squad-size wickets, editable squads (default 5, max 11), host/guest bat-first choice or server coin toss, optional one-over super over.
- **Result scorebook** — winner banner, both innings, super-over scorecards, fall of wickets, over-by-over timeline, runs-per-over chart, match stats, PNG/PDF export, native share, and WhatsApp/Telegram/Messenger fallbacks.
- **Reconnect and grace** — anonymous sessions restore seats, snapshots restore the match, and a disconnected opponent can be claimed after a 60-second grace period.
- **Bilingual by default** — Bengali first, English toggle, complete UI translation.
- **Paper-notebook design** — ruled paper, blue ballpoint ink, sticky notes, handwritten headings, tactile buttons, synthesized sounds, haptics, and reduced-motion support.
- **Ephemeral by design** — rooms live only while the players need them.

---

## Stack

| Layer | Choice |
| --- | --- |
| UI | React 18, Vite, TypeScript, Tailwind CSS |
| State | Zustand, React hooks |
| Routing | React Router data router |
| Realtime | Supabase Postgres changes + presence, with polling fallback |
| Auth | Supabase anonymous sessions |
| Server | Supabase Postgres, RLS, `SECURITY DEFINER` RPCs |
| Motion | Framer Motion |
| i18n | i18next + react-i18next |
| Export | html-to-image + jsPDF |
| Tests | Vitest |

No custom backend server. The authoritative game lives in Postgres RPCs.

---

## Local development

### Requirements

- Node.js **20+**
- npm 10+
- A Supabase project for online multiplayer

### Run the app

```bash
npm install
cp .env.example .env
npm run dev
```

On Windows PowerShell, if `npm` is blocked by the execution policy, use:

```powershell
npm.cmd install
npm.cmd run dev
```

Open the printed Vite URL. Without Supabase credentials the app opens in a **setup preview**: the board and pages render, but online rooms are unavailable.

### Environment variables

Copy `.env.example` to `.env` (or `.env.local`) and fill in:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY
```

Use the **anon public** key only. Never put a service-role key in a Vite environment variable or in the browser.

`VITE_*` values are baked in at build time. After changing them, restart the dev server or rebuild the deployment.

---

## Supabase setup

### 1. Create the project

Create a project at [supabase.com](https://supabase.com). Wait for the database to finish provisioning.

### 2. Enable anonymous sign-ins

In the dashboard:

**Authentication → Providers → Anonymous** → enable anonymous sign-ins.

The game has no login screen. Every browser silently opens an anonymous Supabase session; that user id is what owns a seat in a room. If anonymous sign-ins are disabled, online rooms cannot start. If CAPTCHA is enabled, anonymous sign-in can also fail; disable CAPTCHA for this project.

### 3. Run the database migration

Open **SQL Editor → New query**, paste the complete contents of:

```text
supabase/migrations/0001_init.sql
```

and run it once on a fresh project.

The migration creates:

- `rooms`, `room_players`, `squads`, `innings`, `balls`, `spins`
- indexes, checks, foreign keys, and cascade rules
- row-level security policies
- all game RPCs, including sealed spin creation and scoring
- Realtime publication entries for the public match tables
- a `pg_cron` cleanup job when `pg_cron` is available

> The migration is written for a Supabase database, including its `auth`, `extensions`, and `supabase_realtime` objects. It is not a generic standalone Postgres schema.

### 4. Check Realtime

The migration adds `rooms`, `room_players`, `innings`, and `balls` to the `supabase_realtime` publication. You can confirm this in **Database → Publications**.

Realtime is the fast path. The client also refreshes every 9 seconds while a room is open, so a blocked WebSocket does not stop the match from advancing.

### 5. Set the site URL

In **Authentication → URL Configuration**, set **Site URL** to your deployed origin, for example:

```text
https://paper-cricket.example.com
```

Anonymous sessions do not need a login redirect, but this keeps Auth URLs coherent for the project.

### 6. Add keys to the app

Use **Project Settings → API**:

- Project URL → `VITE_SUPABASE_URL`
- `anon` public key → `VITE_SUPABASE_ANON_KEY`

Set these in `.env` for local development and in your host's environment settings for production.

### 7. Optional: confirm the cleanup job

If `pg_cron` is available, the migration schedules:

```sql
select public.cleanup_stale_rooms();
```

every 10 minutes, deleting rooms untouched for 30 minutes. If Supabase reports that `pg_cron` was not installed, enable it in the dashboard and schedule that statement manually. The in-app leave flow still deletes rooms immediately when the last player leaves.

---

## Scripts

```bash
npm run dev        # Vite dev server
npm run build      # type-check + production build
npm run preview    # preview the production build
npm test           # Vitest unit tests
npm run typecheck  # TypeScript project check
npm run lint       # alias for typecheck
```

Windows PowerShell equivalent: prefix with `npm.cmd`.

The production build writes to `dist/`. Vendor code is split into React, Supabase, motion, and i18n chunks, and the PDF renderer is dynamically imported, so the app does not emit the large-chunk warning.

---

## How a match works

### Lobby

1. The host creates a room; the server generates a code from the safe alphabet `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (no `0/O/1/I`).
2. The second player opens `/room/CODE`, sees the host's team, and joins.
3. A third player sees **Room full**.
4. Both players edit their names, team names, and squads.
5. The host sets overs, wickets, bat-first choice, and whether a super over is enabled.
6. Both players mark ready, then the host starts the match.

Defaults: **2 overs, 2 wickets, 5-player squad, toss decides who bats, super over enabled**. Squads can hold up to 11 players.

### One delivery

1. The batter taps **Hold the pen**. The server records readiness.
2. The bowler taps **Spin the paper**. The server creates a sealed spin:
   - a cryptographically random final rotation
   - a random 2.2–4.8 second duration
   - an independent public animation seed
   - a 10-second aim deadline after the spin ends
3. Both clients see the opaque paper screen. The board is hidden.
4. When the spin ends, the batter drags the pen around the hidden screen and releases, or taps the slide button. The aim is blind.
5. The server scores the ball against the sealed rotation and marks the spin resolved.
6. The paper lifts, the board snaps to the real rotation, the outcome is highlighted, and commentary/sound play.
7. Both clients auto-advance after 4.3 seconds. The transition creates the next innings, super over, or final result.

If the batter never submits, the server converts the late aim to its own random direction. If the batter disconnects after the deadline, the bowler can rescue the stalled ball with the **force** path after 1.5 seconds.

### The board

Eleven equal segments, clockwise from 12 o'clock:

```text
1 · 2 · 3 · 4 · 6 · N · W · CO · LBW · RO · BO
```

- `1`, `2`, `3`, `4`, `6` — batter runs.
- `N` — no-ball: 1 extra, does not count as a legal ball, next ball is a free hit.
- `W` — wide: 1 extra, does not count as a legal ball, no free hit.
- `CO`, `LBW`, `RO`, `BO` — wickets.
- A wicket outcome on a **free hit** is saved: no wicket, but the legal ball counts.

House rules in this game:

- There is **no strike rotation**. The next batter arrives only when a wicket falls.
- An over is complete after six legal balls; wides and no-balls are re-bowled.
- The chase ends immediately when the target is reached.
- If the main match is tied and the super over is enabled, a one-over super over follows. The side that batted second in the main match bats first in the super over. A tied super over is a tie.
- If a player leaves a live room, the room is abandoned and the remaining player wins. If both leave, the room is deleted.

### Disconnects and leaving

- Every client sends a heartbeat every 20 seconds.
- Presence is shown live. If the opponent's heartbeat is more than 60 seconds old, the remaining player can claim the win.
- A reconnect restores the anonymous session and fetches a fresh sanitized snapshot.
- Leaving the lobby frees the seat; the other player is promoted to host if needed.
- Leaving a live match abandons it and awards the remaining player.
- Finished results stay available until both players leave.
- The last player to leave deletes the room and all child rows immediately.
- A 30-minute inactivity cleanup is a final safety net.

---

## Security model

The client is never trusted with outcomes.

- All game mutations go through **`SECURITY DEFINER` RPCs** in `supabase/migrations/0001_init.sql`.
- Direct table writes are revoked from `anon` and `authenticated`. Only `SELECT` is granted, guarded by RLS.
- `spins` has RLS enabled, no policies, and no table privileges for client roles. The final rotation cannot be read through the API.
- The public room state exposes only disposable timing metadata and an animation seed. The board animation is cosmetic; it snaps to the server rotation only on reveal.
- Every RPC checks auth, membership, room status, phase, and turn. Double submits, stale balls, out-of-turn spins, and third-player joins are rejected server-side.
- The 6-character room code is an invitation, not an authorization token. Only an active room member can fetch the full snapshot.
- Scores are computed from the sealed rotation inside the database. A modified client cannot change the result.

The app uses only the Supabase anon key. Supabase anonymous users are real `authenticated` JWTs with a stable id, but no email or profile.

---

## Result export and sharing

On the result screen:

- **Download PNG** renders the scorebook card with `html-to-image`.
- **Download PDF** renders the same card and wraps it in a `jsPDF` page.
- **Share** uses the Web Share API, then falls back to a share dialog with WhatsApp, Telegram, Messenger, and copy-link actions.
- **Share image** uses the Web Share API with the PNG file where supported, otherwise downloads it.

The download buttons remain available in the leave confirmation so a player can save the scorecard before erasing the room.

Browser notes:

- Clipboard, Web Share, and file sharing require HTTPS (or `localhost`).
- iOS Safari may offer fewer share targets for files; the download fallback is intentional.
- PDF output is a rendered image, not selectable text.
- Webfonts must load before capture; the export waits for `document.fonts.ready` and a short settle delay.

---

## Tests

```bash
npm test
npm run typecheck
npm run build
```

Current suite: **25 tests**.

- `src/lib/gameEngine.test.ts` — scoring, extras, free hits, wickets, overs, target/chase completion, fall of wickets, angle-to-segment mapping, timeline and stats.
- `src/config/gameConfig.test.ts` — board order, segment geometry, room-code alphabet, and SQL/TypeScript board parity.
- `src/i18n/i18n.test.ts` — Bengali/English key parity, empty values, every statically referenced translation key, and commentary pools for every board outcome.

The SQL migration has also been exercised against PostgreSQL 17 with Supabase-compatible auth stubs: RLS, third-player rejection, sealed-spin reads, a full match with a no-ball, free-hit save, wide, wicket, tie, super over, target chase, result persistence, forfeit, timeout rescue, and cleanup.

### Manual smoke test

Use two browsers or one normal + one private window:

1. Create a room with a squad, set 1 over / 2 wickets, invite the second player.
2. Confirm the third player gets **Room full**.
3. Start the match, hold the pen, spin, wait for the paper to lift, and drag the pen.
4. Confirm the result highlight matches the stamped outcome, sound, commentary, and score.
5. Force a no-ball and check the free-hit state; take a wicket on the free hit and confirm it is saved.
6. Let the aim timer expire and confirm a ball is still scored.
7. Reload one tab mid-innings and confirm the match is restored.
8. Close one tab for 60 seconds and claim the win from the other.
9. Finish a match, download PNG and PDF, try native share, then leave and confirm the room disappears for both.
10. Repeat with Bengali and English, sound on/off, and reduced motion.

---

## Deploying

### Vercel

1. Push the repository to GitHub/GitLab/Bitbucket.
2. Import it in Vercel. Vercel detects Vite.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in **Project → Settings → Environment Variables** for Production, Preview, and Development.
6. Deploy. `vercel.json` provides the SPA rewrite so `/room/ABC123` reaches React Router.
7. Add the production origin to Supabase's **Site URL** and Auth settings.

### Netlify

1. Import the repository.
2. Netlify reads `netlify.toml`: build `npm run build`, publish `dist`.
3. Add the two `VITE_*` environment variables in **Site configuration → Environment variables**.
4. Deploy. The `/* → /index.html` redirect keeps room links working.
5. Add the production origin to Supabase's **Site URL**.

### Any static host

Serve `dist/` and configure a rewrite/fallback from all paths to `/index.html`. Keep the app on HTTPS so clipboard and share APIs work. `public/_redirects` is included for Netlify-style hosts.

### Environment changes need a rebuild

Vite replaces `import.meta.env.VITE_*` at build time. Changing the Supabase project requires a new deployment, not just a runtime config change.

---

## Troubleshooting

| Symptom | Check |
| --- | --- |
| “The online scorebook is not connected” | `.env` has both values, the dev server was restarted, the deployment was rebuilt, and the URL starts with `https://`. |
| Anonymous sign-in fails | Enable **Authentication → Providers → Anonymous**; disable CAPTCHA for the project. |
| Room link says not found | Run `0001_init.sql` on the same project whose URL/key the app uses; confirm the code has six valid characters. |
| Room says full but only one person is visible | A stale player row can remain after a crash; the room opens only while both seats are active. The 30-minute cleanup removes abandoned rooms. |
| Scores do not update instantly | Confirm Realtime is enabled and the four tables are in the `supabase_realtime` publication. The 9-second polling fallback should still move the match. |
| Forfeit button never appears | The opponent's `last_seen_at` must be more than 60 seconds old. Backgrounded mobile tabs can throttle heartbeats; keep both tabs foregrounded while playing. |
| PNG/PDF is blank | Wait for fonts to settle, then retry in a Chromium-based browser. Fonts are self-hosted, so a custom CSP only needs to allow same-origin font files and `data:` images. |
| Share sheet does not open | Use HTTPS and a browser with Web Share support; the fallback dialog copies the link. |
| Leave/back navigation is blocked | This is intentional during a room. Use the in-app leave button; it handles the server cleanup and the router blocker. |

---

## Project structure

```text
.
├─ public/
│  ├─ favicon.svg
│  ├─ manifest.webmanifest
│  └─ _redirects
├─ src/
│  ├─ components/          shared UI, board SVG, dialogs, toggles
│  ├─ config/              board, room-code, timers, env config
│  ├─ features/
│  │  ├─ landing/          landing page and create/join dialogs
│  │  ├─ lobby/            join gate, squad editor, lobby, invites
│  │  ├─ match/            match orchestration, pen, opaque screen, live score
│  │  ├─ result/           scorebook, charts, exports, share
│  │  ├─ room/             route guard, leave flow, lifecycle
│  │  └─ howto/            illustrated rules
│  ├─ hooks/               room session, server clock, spin animation
│  ├─ i18n/                full Bengali + English resources and parity test
│  ├─ lib/                 pure engine, Supabase API, sound, share
│  ├─ store/               preferences and toasts
│  └─ types/               shared DTOs
├─ supabase/migrations/0001_init.sql
├─ netlify.toml
├─ vercel.json
└─ vite.config.ts
```

---

## Design notes and limits

- **No accounts, no history.** Identity lives in the browser's anonymous Supabase session. Clearing site data loses the seat; the other player can claim after the grace period.
- **Exactly two players.** There are no spectators, matchmaking, or public room lists.
- **Ephemeral rooms.** Finished results persist only until the players leave.
- **No strike rotation.** This is a deliberate house rule from the original pen-and-paper game.
- **Blind aim is the point.** The board is hidden while the batter aims; the final rotation is not a client-side animation.
- **PWA metadata, not offline play.** The app has a manifest and favicon, but no service worker. Rooms need the network.
- **Web Share is progressive.** Clipboard, haptics, and file sharing degrade gracefully where the browser does not support them.

---

## Fonts and visual credit

The interface uses self-hosted [Fontsource](https://fontsource.org/) builds of **Caveat** for handwritten headings, **Hind Siliguri** for Bengali and body text, and **Courier Prime** for scorebook numerals. Self-hosting keeps the fonts same-origin so `html-to-image` can embed them in PNG/PDF exports. The board is drawn in SVG with ballpoint blue, ruled paper, and hand-drawn wobble; no bitmap board assets are required.

The game is a nostalgic tribute to the paper cricket played in school notebooks — two names, a pen, a spinner, and an argument about whether that was out.
"# Paper-Cricket" 
