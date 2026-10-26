# The growth engine: outreach desk + Claude

**Status:** Days 0–7 built, 26 October 2026.
**Goal:** five paying clients from Pune in the first weeks, with every call, message and
visit measured, so we learn what works in days instead of years.

The loop: **find → prove → contact → capture → learn**, every day.

| Step | Who | Where |
|---|---|---|
| Find businesses with a reason to talk now | Claude (`prospect-research` skill) | Claude Code → HQ connector |
| Prove it: a personal demo page per prospect | Claude builds (`create_demo`), owner sends | `/demo/{slug}`; opening it alerts the owner |
| Contact (call, WhatsApp, visit) | Owner | HQ → Outreach → Start calling |
| Capture every touch | Owner taps the outcome; Claude transcribes and reviews recorded calls (`call-review` skill) | HQ, connector, `scripts/calls/transcribe.py` |
| Learn and adjust | Claude (`outreach-review` skill), every night | HQ → Outreach, "Claude's latest review" |

The main hook is the **WhatsApp AI salesperson**: Meta's free AI agent in WhatsApp
Business (live in India since July 2026), set up properly by AMFIRE on the Operate plan.
The call only asks permission to send a demo. Scripts and objection replies live in
`src/knowledge/outreach.ts`.

## How it fits together

```
Claude Code on the laptop (owner's Claude plan)
   │  skills: prospect-research, outreach-review
   │  MCP over HTTPS, bearer token
   ▼
www.amfire.in/api/mcp  ──►  src/server/connector.ts  ──►  src/server/outreach.ts
                                                            prospects · touches · outreach_notes
HQ (browser / phone)  ──►  /hq/outreach, /hq/outreach/call, /hq/outreach/[id]
```

- The connector acts as the owner and can reach **only** the outreach desk: prospects,
  touches and notes. It can't see clients, money or proposals.
- Claude's subscription can't run inside the website itself (only in Claude's own apps),
  which is why the brain runs in Claude Code on the laptop and talks to HQ over the
  connector. Gemini keeps running HQ's daily operations (brief, invoices, client updates).
- A prospect becomes a **lead** with one click ("Make it a lead"); its research and every
  touch go with it, so the Sales agent knows the history.

## Setup

1. **Vercel:** add `HQ_CONNECTOR_TOKEN` (Production) with 32+ random characters, then redeploy.
2. **Laptop:** set the same value as a user environment variable `AMFIRE_HQ_TOKEN`
   (Windows: *Edit environment variables for your account*), then restart Claude.
3. **Claude Code:** open this project; approve the `amfire-hq` server from `.mcp.json`
   when asked. Check with `/mcp`.
4. Try it: ask Claude "research 40 Pune showrooms for tomorrow" (uses `prospect-research`),
   or "review today" (uses `outreach-review`).

For local testing, put `HQ_CONNECTOR_TOKEN` in `.env.development.local` and pass Claude a
config pointing at `http://localhost:3001/api/mcp` with `--mcp-config`.

## Daily rhythm

| Time (IST) | What |
|---|---|
| Night before | Claude researches tomorrow's list (scheduled) |
| 9:00 | Read Claude's review and plan on HQ → Outreach |
| 10:00–13:00 | Calling block 1 (Start calling) |
| 14:00–17:00 | Visits, CA firms, meetings |
| 17:00–18:30 | Calling block 2, follow-ups |
| 21:00 | Claude's nightly review (scheduled) |

Targets (`DAILY_TARGETS`): 100 touches, 20 conversations, 2 meetings. The streak counts
days with 20+ touches.

## Rules we keep

- Call with permission in mind: the call's job is to get a yes to the demo, not to pitch.
  Never redial someone who said no; "Asked not to be contacted" stops them for good.
  Spam complaints can get a number disconnected under TRAI's rules, so use a separate SIM.
- No WhatsApp or LinkedIn automation or bulk sending: every message is sent by the owner.
- Only publicly listed business contact details, with the source recorded.
- Call recording: say "this call may be recorded for my notes", and keep recordings private.

## Proof engine: demo pages

`/demo/{slug}` is a prospect's own "AI salesperson": a WhatsApp-style chat that answers
from their catalogue, prices and timings (Claude writes the knowledge from public
sources with `create_demo`), plus 2–4 audit findings and AMFIRE's offer. Not indexed.

- **Answers** come from Gemini at runtime (`role: demo`, logged in `agent_runs`, daily
  budget like every agent), because the website can't run on the owner's Claude plan;
  without AI it answers from the closest knowledge lines.
- **Open alerts:** the browser reports the view (WhatsApp's link preview doesn't count;
  staff views don't count). The first view, and any view after an hour's gap, adds a note
  to the prospect, puts them at the top of the call queue and emails the owner
  (`BRIEF_EMAIL`, when email is set up).
- The dialer's WhatsApp message fills in the demo link after the first conversation.

## Call recordings

1. **Phone:** turn on call recording (Settings → Recording in most dialers). Tell people
   "this call may be recorded for my notes".
2. **Sync to the laptop**, into `D:AMFIREcalls` (or set `AMFIRE_CALLS_DIR`): Google Drive
   (a phone sync app + Drive for desktop), or copy by USB at the end of the day.
3. **Transcribe** (free, offline): `py -3.12 scripts/calls/transcribe.py`. Needs
   `py -3.12 -m pip install faster-whisper "av==14.2.0"`; the first run downloads the
   model. `--model large-v3-turbo` is more accurate for Hinglish but slower on CPU.
4. **Review:** the `call-review` skill (scheduled at 20:30) matches each transcript to the
   logged call (`find_call_touch`), logs calls you forgot, and attaches the transcript
   and coaching. The nightly review then coaches from them.

File names from most Android recorders work (number and time are read from the name);
if a recorder saves only a contact name, Claude matches by name.

## CA partner programme

- Public page: `/partners` (send it after the call; the CA WhatsApp messages link it).
- When a firm agrees, **Create referral link** on its prospect page: its own `/go/{slug}`
  link (channel `referral`), and it's marked a partner. Leads who book through it are
  credited to the firm (source *Referral*).
- HQ → Outreach → **CA partners** shows clicks, leads, wins, money collected in each
  referred client's first year and the 10% share owed.

## Response-time tests: the Pune report

On a prospect's page, **I just sent an enquiry** starts a timer; **They replied** stops it.
The Outreach page shows the median reply time, the share with no reply in 24 h and the
share replying within an hour. Use it in the pitch ("I enquired on Tuesday at 11 and heard
back 26 hours later"), always telling them about the test. After 30+ tests, the Sunday
review drafts the "Pune business response report" as a LinkedIn post.

## Scheduled runs

See `docs/scheduled-tasks.md`: evening research (18:30), call review (20:30), nightly
review (~21:13) and the Sunday strategy review with a market watch and a post draft.
