---
name: manufacturer-pack
description: Prepare manufacturers on the HQ desk for the plant study play, one account at a time - fill research gaps (plant map pin, ownership, plants, next-generation director, dated signals), then write the brief, the switchboard and MD call lines, the info@ email draft and the printed plant study outline. Use for "pack the manufacturers", "prepare tomorrow's Chakan visits", "manufacturer pack for <company>", or after new manufacturers are imported.
---

# Manufacturer pack (the plant study play)

The founder calls, visits and emails these plants themselves. Your job is to make each
touch specific and true, so that a 55-year-old managing director reads one line and thinks
"this person has looked at *my* plant". You prepare; you never send, call or message
anyone.

A pack is done when the account has: a plant map pin, its fit facts, the decision maker
(and the next-generation director if there is one) with a source, at least one dated
reason, a 30-second brief, an opener, the email draft, and the plant study outline.

## Before you start

1. `get_engine_playbook`: the `manufacturer` segment, its fit facts, the manufacturer
   signal types (each says **where** to find it and how to date it) and the `plant_study`
   play.
2. `list_notes` (kind `review`): the founder's latest direction.
3. Pick the accounts:
   - "Pack the Chakan visits" → `find_targets` with segment `manufacturer` and
     `near: { area: "chakan", km: 15 }` (or `bhosari`, `ranjangaon`, `talegaon`).
   - Otherwise `get_engine_queue` (segment `manufacturer`) and take the due ones first.
   - **10 accounts a run at most.** Depth beats breadth; Pro limits are small.

## Per account

### 1. Read what's known
`get_prospect` with its id: facts, contacts, signals, notes and the next play step. Don't
redo research that already has a source.

### 2. Fill the gaps (only from public pages, each with its URL)
- **Map pin, first.** Search Google Maps for the plant (not the registered office, which is
  often a home or a CA's office). Put the place link, with `@lat,lng` in it, in the
  prospect's `mapsUrl`. The visit route orders the day by these pins; without one the
  plant sits at the area's centre.
- **Ownership** (`facts.ownership`):
  - `indian_family` when the directors on the MCA list (the Tofler page in `sourceUrl`) share a family name or the site says family-run;
  - `indian_professional` for an Indian company run by hired managers;
  - `listed` for a listed group company;
  - `foreign_subsidiary` when a foreign parent holds it. Then add a note: decisions are made abroad, so the account is low priority.
- **Plants** (`facts.plants`) and **employees** (`facts.employees`) from the website,
  LinkedIn's company page or IndiaMART. Leave them out rather than guess.
- **People:**
  - The MD stays `decision_maker`.
  - A younger director who shares the founder's family name is the **champion** (`role: champion`). If MCA shows their appointment date, also add the signal `next_gen_director`, with observedAt = the appointment date.
  - A plant head named on the website or LinkedIn is an `influencer`.
  - Use an email or number only if the company's own site, IndiaMART or the MCA filing prints it.
- **Dated reasons** (see each type's `where`):
  - `hiring_ops_roles`: Naukri/LinkedIn ads for PPC, dispatch, stores, MIS or ERP roles.
  - `plant_expansion`: a new plant, plot or line.
  - `new_bank_charge`: the Charges section on Tofler/Zaubacorp.
  - `oem_or_certification`: a new OEM programme or IATF/ISO certificate, with its date.
  - The title carries the specifics and the date in words ("Hiring a PPC engineer, Naukri, posted 3 Nov 2026"). **No date, no signal.**

Send what you found with `upsert_targets` (`prospectId` plus `facts`, `contacts`,
`signals`) and `update_prospect` for `mapsUrl`. Check the new score and `missing` list.

### 3. Write the pack
Copy rules for everything below:
- The brand is always written "amfire".
- On a first touch, never say "AI", "automation", "software", a price or rupees.
- One idea and one ask per message.
- Calm, as if we don't need the sale. Plain words a 55-year-old MD understands.
- Every claim about them comes from a fact you have a source for.

- **Brief** (`update_prospect` → `brief`, at most 5 lines, read in 30 seconds before a
  call): what they make and for whom, size (band and year), who decides and who to ask for
  at the gate, the one dated reason, and the question to open with.
- **Opener** (`update_prospect` → `opener`): the first line the founder says to the MD,
  built on the dated reason. Example: "I saw Takshi is adding a fourth plant at Bhamboli.
  When a plant opens, what usually slows down first: the production plan or dispatch?"
- **Switchboard line**: the gate script with the MD's full name and who else to ask for
  (plant head, MD's assistant). Put it in the brief's last line.
- **Email** (`draft_email`):
  - To: the MD's own address if published, else the company inbox (`info@`, `enquiry@`), addressed to the MD by name.
  - Start from the `plant_study` play's day-0 email (variant `note` or `question`, whichever the learned weights favour) and add **one** personal sentence about the dated reason. Under 120 words.
  - `content.button`: null for now (the printed outline is the asset). `replyLabel` "Yes, a short call works", `replyBody` "Hello, this is <MD> from <company>. A short call about the plant study works for me."
  - It stays a draft. The founder reads it, sends a test to themself and sends it from HQ.
- **Plant study outline** (`add_note`, kind `content`, title "Plant study outline: <company>"): the one page the founder prints and leaves at the gate. Markdown with:
  - a title: "A short plant study for <company>";
  - one line on why them, from the dated fact;
  - what we look at, in their words: one order, from the enquiry and quote, through the production plan and the shop floor, to dispatch and payment. Where it waits, and what that costs in days;
  - what they get: a written study of their plant, theirs to keep;
  - what it takes: one hour with the plant head, at the plant;
  - the founder's name and number, and "amfire, Pune".

  No prices, no methods jargon, no "AI".

### 4. Report back
After the run, `add_note` (kind `research`): accounts packed, what was found and from
where, accounts that look wrong for us (foreign subsidiary, not really manufacturing,
shut) with the reason, and the gaps left. Never `start_play`, log a touch or send anything:
the founder does those.
