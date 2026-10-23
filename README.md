# AMFIRE

One connected platform with three interfaces over the same business records:

| Interface | Path | Who |
|---|---|---|
| **Website** | `/`, `/services/{build,operate,automate}`, `/work`, `/industries`, `/about`, `/how-we-work`, `/start` | Visitors (India-first) |
| **AMFIRE HQ** | `/hq` | Owner and staff |
| **Client Hub** | `/hub` | Clients (scoped to their organisation) |

The first milestone path works end to end:

> Visitor → discovery → qualified lead → solution recommendation → human-reviewed proposal → project creation → client progress page

**Stack:** Next.js 16 · TypeScript · Tailwind CSS 4 · Drizzle ORM · PostgreSQL (Supabase) · Supabase Auth · Google Gemini · Vercel.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no configuration the app uses an embedded PostgreSQL (PGlite) in `.data/`, migrates it, and creates the owner `owner@amfire.local`. Sign in at `/login`. Without Supabase settings, the sign-in link is shown on screen (development only).

```bash
npm test          # milestone path + permission/isolation tests (real Postgres, in memory)
npm run typecheck
npm run lint
npm run build
npm run render:reel      # re-render the "How it works" video (needs `npm run dev` running)
```

The "How it works" video (`public/media/client-journey.mp4`) is a demo reel drawn in code (`src/components/reel/reel.tsx`), where every frame is a function of time. `scripts/render-reel.ts` steps your installed Chrome or Edge through it frame by frame at 1920×1080, 60 fps, and encodes the result with ffmpeg (which must be on your PATH). Preview it live at `/reel?play` or hold a single frame with `/reel?t=12`; that route exists only in development. If you change the scene timings in `SCENE`, update the chapter list in `src/knowledge/journey.json` to match.

## Deploy: Vercel + Supabase + Gemini

1. **Supabase project.** Create one in the **Mumbai (ap-south-1)** region so data stays in India.
2. **Database.** Copy the connection strings from *Connect*. In Vercel set `DATABASE_URL` to the **transaction pooler** URL (port 6543). Optionally set `MIGRATION_DATABASE_URL` to the session pooler (port 5432). Add `DATABASE_CA_CERT` from *Database → SSL* so TLS is verified.
3. **Auth.** In Supabase → Authentication:
   - **URL configuration:** Site URL `https://your-domain.in`. Add `https://your-domain.in/auth/verify**` (and your Vercel preview domain) to Redirect URLs.
   - **Email templates:** in both *Magic Link* and *Confirm signup*, set the link to
     `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email`
     Links then land on a confirm page that needs a button press, so email scanners can't use up the sign-in.
   - **SMTP:** set up custom SMTP (Resend, Zoho Mail, Amazon SES…). Supabase's built-in sender is heavily rate-limited.
4. **Vercel env vars.** Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `GEMINI_API_KEY`, `OWNER_EMAIL`, `NEXT_PUBLIC_CONTACT_EMAIL` and `NEXT_PUBLIC_SITE_URL`. All variables are documented in `.env.example`. Use **Node.js 22** (Project → Settings → General).
5. **Deploy.** `npm run vercel-build` applies migrations, then builds. Give *Preview* deployments their own Supabase database so previews never migrate production.

Only people who already exist in the `users` table can sign in. That means the owner, staff you add, and clients created when you send a proposal. Roles and organisation access always come from the database, never from Supabase metadata.

## How it is put together

```
src/
  db/schema.ts             Shared records: orgs, users, leads, agent runs, recommendations,
                           proposals, projects, milestones, tasks, updates, requests, audit, rate limits
  knowledge/
    catalog.ts             Services, customer types, discovery options, industries, tools
    examples.ts            9 illustrative India-first examples (3 per service)
    pricing.ts             INR pricing rules — prices are never set by AI
  server/                  Business logic, no Next.js imports (testable)
    access.ts              Roles + client-organisation isolation, enforced on the server
    leads.ts / proposals.ts / projects.ts / hq.ts
    agents/solution-architect.ts   Rules engine + optional Gemini engine; every run logged
  lib/session.ts           Supabase Auth (or local fallback) → actor from our database
  proxy.ts                 Refreshes the Supabase session cookie
  components/demos/        Interactive demos (Automate, Build, Operate) + cost calculator
  app/(site)               Website and discovery
  app/hq                   Internal workspace
  app/hub                  Client Hub
drizzle/                   SQL migrations (0002 enables row-level security for Supabase)
```

### Rules the code enforces
- **Database records, not AI output, decide status.** Agents only create *proposed* recommendations. Prices come from `knowledge/pricing.ts`.
- **Commercial commitments need the owner.** Staff can draft. Only the owner can approve and send. Below-guideline pricing requires a recorded reason.
- **Progress is real.** A milestone completes only when the client approves it. A blocked milestone must carry a plain-language explanation.
- **Client isolation.** Every Hub query and action checks the actor's organisation memberships.
- **Supabase Data API is locked.** Row-level security is on for every table, with no policies. The public anon key can't read or write anything, and the app's server connection is unaffected.
- **Agent runs are structured, validated, logged and recoverable.** A failed Gemini run is recorded and falls back to the rules engine.
- **Rate limits** on discovery and sign-in are stored in Postgres, so they hold across serverless instances.

## Before going live
- Replace the **guideline prices** in `src/knowledge/pricing.ts` (INR) with your real rates. They also appear on the website.
- Contact details default to info@amfire.in and +91 93730 10143 (`NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_CONTACT_PHONE`).
- The examples in `src/knowledge/examples.ts` are **illustrative scenarios**, and the site labels them as such. Add verified case studies as clients approve them.
- Fill in the About page specifics (founder, location) once you're ready to share them.
