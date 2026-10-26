# The growth engine: outreach desk + Claude

**Status:** Day 0 built, October 2026.
**Goal:** five paying clients from Pune in the first weeks, with every call, message and
visit measured, so we learn what works in days instead of years.

The loop: **find → prove → contact → capture → learn**, every day.

| Step | Who | Where |
|---|---|---|
| Find businesses with a reason to talk now | Claude (`prospect-research` skill) | Claude Code → HQ connector |
| Prove it (demo, audit page) | Claude builds, owner sends | *Day 3–4* |
| Contact (call, WhatsApp, visit) | Owner | HQ → Outreach → Start calling |
| Capture every touch | Owner taps the outcome; Claude logs recorded calls | HQ, connector |
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

For local testing, put `HQ_CONNECTOR_TOKEN` in `.env.development.local` and set
`AMFIRE_HQ_URL=http://localhost:3001`.

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

## Next

| Day | What ships |
|---|---|
| 1–2 | Call recordings → Whisper on the laptop → Claude's analysis attached to each call; scheduled research and review runs |
| 3–4 | Proof engine: a personal demo page per prospect (`/demo/<name>`) with an AI chat trained on their catalogue, open alerts, audit pages |
| 5–7 | CA partner programme (referral links), the "Pune business response" report as content, first Sunday strategy review |
