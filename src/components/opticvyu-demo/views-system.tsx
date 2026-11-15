"use client";

import { APPROVALS, FDE_LOG, LEARNED, SOURCES } from "./data";
import { Icon } from "./flow";
import { money, useOps } from "./store";
import { Badge, Btn, Dot, Illustrative, MetricStrip, Panel, Table, Td, Th, TrendLine, ViewHead, cx } from "./ui";

// ---------------------------------------------------------------- Approvals

export function Approvals() {
  const { s, d } = useOps();
  return (
    <div className="flex flex-col gap-4">
      <ViewHead title="Approvals" line="Anything that touches money, people or clients waits here with the facts and the rule that sent it to you. Approve on the laptop or with one tap on the phone; the agent carries on the second you do." />
      <div className="grid gap-4 lg:grid-cols-2">
        {APPROVALS.map((a) => {
          const done = !s.pending.includes(a.id);
          return (
            <Panel
              key={a.id}
              className={cx(done && "opacity-75")}
              title={
                <span>
                  <span className="mb-0.5 block text-[11px] font-medium tracking-[0.05em] text-[#8a8e95] uppercase">{a.area}</span>
                  {a.title}
                </span>
              }
              right={done ? <Badge tone="good">approved</Badge> : a.amount ? <span className="text-[14px] font-semibold tabular-nums">{money(a.amount)}</span> : null}
            >
              <p className="text-[12.5px] leading-snug text-[#4a4e55]">{a.detail}</p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {a.facts.map((f) => (
                  <li key={f} className="flex gap-2 text-[12.5px]">
                    <span className="mt-1.5">
                      <Dot tone="good" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11.5px] text-[#8a8e95]">Why it came to you: {a.rule}</p>
              {done ? (
                <p className="mt-3 rounded-lg bg-[#ebf7ef] p-3 text-[12.5px] text-[#15803d]">{a.result}</p>
              ) : (
                <div className="mt-3 flex gap-2">
                  <Btn size="sm" onClick={() => d({ t: "approve", id: a.id })}>
                    Approve
                  </Btn>
                  <Btn size="sm" kind="secondary">
                    Ask a question
                  </Btn>
                </div>
              )}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Agents and audit

const ROSTER = [
  ["Billing", "Drafts advance, balance and monthly invoices; checks live vs billed nightly", "Anything that differs from the PO", 412],
  ["Payments", "Reads every channel, matches to invoices and sites", "Low-confidence matches", 158],
  ["Collections", "Sends links and reminders on each client's best channel", "Late fees, write-offs", 96],
  ["Care", "Answers status, report and access requests; opens work orders", "Anything about money or blame", 131],
  ["Work orders", "Opens, schedules, reminds and escalates", "Moving a date promised to a client", 88],
  ["Uptime", "Watches 1,184 cameras; tries remote fixes", "Replacing hardware", 204],
  ["Inventory", "Tracks every serial, kit and part; plans transfers", "Purchases and write-offs", 71],
  ["Attendance", "Checks every check-in against boundary, selfie and GPS", "Corrections beyond policy", 54],
  ["Payroll", "Prepares the run with every deduction", "Paying, always", 3],
  ["Sales", "Replies in minutes, drafts quotes, follows up", "Any price below the rate card", 47],
  ["Radar", "Watches clients for new projects and tenders", "Contacting a client's leadership", 22],
  ["Chief of staff", "Writes your Monday page; answers questions", "Nothing. It only reads.", 26],
] as const;

export function Agents() {
  const { s, d } = useOps();
  return (
    <div className="flex flex-col gap-4">
      <ViewHead title="Agents and audit" line="Twelve agents, each with one job, written limits and a full record. Every action shows what the agent noticed, what it checked, what it did and who allowed it, kept for 180 days in India and ready for your ISO 27001 audit." />
      <MetricStrip
        cols={4}
        items={[
          { label: "Tasks since midnight", value: "1,312", delta: { v: 8, suffix: "vs last Sunday" } },
          { label: "Done with no one", value: "91%", foot: "inside their limits" },
          { label: "Sent to a person", value: "118", foot: "approvals and checks" },
          { label: "Undone by a person", value: "0.4%", foot: "each one teaches the agent" },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel flush title="The team">
          <Table min={720}>
            <thead>
              <tr>
                <Th>Agent</Th>
                <Th>Does on its own</Th>
                <Th>Asks a person first</Th>
                <Th className="text-right">Today</Th>
              </tr>
            </thead>
            <tbody>
              {ROSTER.map(([a, b, c, n]) => (
                <tr key={a}>
                  <Td className="font-medium whitespace-nowrap">
                    <span className="inline-flex items-center gap-2">
                      <Dot tone="good" pulse={a === "Payments"} />
                      {a}
                    </span>
                  </Td>
                  <Td>{b}</Td>
                  <Td className="text-[#6b6f76]">{c}</Td>
                  <Td className="text-right">{n}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
        <Panel title="Audit trail" sub="Click any line with steps.">
          <div className="-mx-2 flex flex-col">
            {s.activity.slice(0, 11).map((a) => (
              <button key={a.id} type="button" onClick={() => (a.trace ? d({ t: "drawer", d: { kind: "activity", id: a.id } }) : d({ t: "view", view: a.view }))} className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-start gap-2 rounded-lg px-2 py-2 text-left hover:bg-[#fbfbfa]">
                <span className="pt-px text-[11px] text-[#8a8e95] tabular-nums">{a.time}</span>
                <span className="min-w-0">
                  <span className="block text-[12.5px] leading-snug">{a.text}</span>
                  <span className="text-[11px] text-[#8a8e95]">{a.agent}</span>
                </span>
                {a.trace && <span className="text-[11px] font-medium text-[#5b47e0]">steps</span>}
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function ActivityDrawer({ id }: { id: string }) {
  const { s } = useOps();
  const a = s.activity.find((x) => x.id === id);
  if (!a?.trace) return null;
  return (
    <ol className="flex flex-col gap-4">
      {a.trace.map((t, i) => (
        <li key={i} className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 text-[12.5px]">
          <Badge tone={t.k === "Result" ? "good" : t.k === "Asked" ? "warn" : "info"} className="justify-center">
            {t.k}
          </Badge>
          <span className="leading-snug">{t.text}</span>
        </li>
      ))}
      <li className="rounded-lg bg-[#f7f7f5] p-3 text-[11.5px] text-[#6b6f76]">Logged at {a.time} IST by the {a.agent.toLowerCase()}. Kept 180 days in India and exportable for your auditors.</li>
    </ol>
  );
}

// ---------------------------------------------------------------- Learning

export function Learning() {
  const { s, d } = useOps();
  const err = [18, 16.5, 15, 13.2, 11, 9.6, 8.1, 7, 6.1, 5.2, 4.6, 4.1];
  return (
    <div className="flex flex-col gap-4">
      <ViewHead title="Learning" line="What Ops One learned this week, the evidence behind it, and a switch to keep or undo each change. Nothing it learns touches money, people or clients until a person accepts it. Every learned rule has a version and an undo." />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="flex flex-col gap-4">
          <Panel title="How far the cash forecast was off" sub="30-day forecast vs what landed, week by week" right={<Illustrative />}>
            <TrendLine data={err} labels={err.map((_, i) => `W${i + 1}`)} unit="%" invert height={150} />
          </Panel>
          <Panel title="What it learns from" sub="Six loops, all visible">
            {[
              ["How each client really pays", "every invoice and payment"],
              ["Which reminder works, when", "replies to every reminder"],
              ["Which cameras are about to fail", "heartbeats, battery, season"],
              ["How long each job really takes", "GPS and job timestamps"],
              ["What you always approve", "your approvals and edits"],
              ["When stock runs out", "parts used per office"],
            ].map(([a, b]) => (
              <p key={a} className="flex items-center justify-between gap-2 border-b border-[#f2f2ef] py-2 text-[12.5px] last:border-0">
                <span className="inline-flex items-center gap-2">
                  <Dot tone="brand" />
                  {a}
                </span>
                <span className="text-[11.5px] text-[#8a8e95]">{b}</span>
              </p>
            ))}
          </Panel>
        </div>
        <Panel title="This week, Ops One learned" sub={`${LEARNED.length} changes waiting for a yes`}>
          <div className="flex flex-col gap-2">
            {LEARNED.map((l) => {
              const v = s.learned[l.id];
              return (
                <div key={l.id} className="rounded-lg p-3 ring-1 ring-[#ececE8]">
                  <p className="text-[12.5px] leading-snug">{l.text}</p>
                  <p className="mt-1 text-[11.5px] text-[#8a8e95]">Evidence: {l.evidence}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    {v ? (
                      <Badge tone={v === "undone" || v === "notyet" ? "muted" : "good"}>{v === "kept" ? "kept · now version 2" : v === "allowed" ? "allowed · agent does this alone" : v === "undone" ? "undone · back to version 1" : "not yet"}</Badge>
                    ) : l.kind === "allow" ? (
                      <>
                        <Btn size="xs" onClick={() => d({ t: "learn", id: l.id, v: "allowed" })}>Allow</Btn>
                        <Btn size="xs" kind="secondary" onClick={() => d({ t: "learn", id: l.id, v: "notyet" })}>Not yet</Btn>
                      </>
                    ) : (
                      <>
                        <Btn size="xs" onClick={() => d({ t: "learn", id: l.id, v: "kept" })}>Keep</Btn>
                        <Btn size="xs" kind="secondary" onClick={() => d({ t: "learn", id: l.id, v: "undone" })}>Undo</Btn>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Connected systems

export function Connected() {
  return (
    <div className="flex flex-col gap-4">
      <ViewHead
        title="Connected systems"
        line="Your inventory, invoice and accounts dashboards keep working. Ops One reads them all, joins every record to the same client, site, PO, camera and person, and gives the whole company one version of the truth. It reads your product's data only; it never writes to it."
      />
      <Panel flush title="Sources" sub="Read-only wherever possible. Every sync is logged." right={<Badge tone="good">9 of 9 healthy</Badge>}>
        <Table min={760}>
          <thead>
            <tr>
              <Th>Source</Th>
              <Th>What it gives</Th>
              <Th>Type</Th>
              <Th>Records</Th>
              <Th>Sync</Th>
            </tr>
          </thead>
          <tbody>
            {SOURCES.map((x, i) => (
              <tr key={x.name}>
                <Td className="font-medium whitespace-nowrap">
                  <span className="inline-flex items-center gap-2.5">
                    <span className="grid size-7 place-items-center rounded-md bg-[#f3f3f0] text-[#4a4e55]">
                      <Icon k={i} />
                    </span>
                    {x.name}
                  </span>
                </Td>
                <Td>{x.what}</Td>
                <Td className="text-[#6b6f76]">{x.kind}</Td>
                <Td>{x.records}</Td>
                <Td>
                  <span className="inline-flex items-center gap-1.5">
                    <Dot tone="good" />
                    every {x.synced}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Security, in one place" sub="What your IT team will check">
          {[
            ["Runs in your own cloud account, India region", "Data never sits on amfire's servers"],
            ["Single sign-on with two-step verification", "Access ends the day someone leaves"],
            ["Role-based access", "An engineer sees their jobs; accounts sees money; you see everything"],
            ["Encrypted in transit and at rest", "Keys in your cloud's own key vault"],
            ["Audit log kept 180 days in India", "Supports your 6-hour CERT-In incident reporting"],
            ["Your data never trains an AI model", "Models run through your cloud where available"],
          ].map(([a, b]) => (
            <p key={a} className="flex gap-2.5 border-b border-[#f2f2ef] py-2 text-[12.5px] last:border-0">
              <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-[#ebf7ef] text-[9px] font-bold text-[#15803d]">✓</span>
              <span>
                <span className="block font-medium">{a}</span>
                <span className="text-[11.5px] text-[#8a8e95]">{b}</span>
              </span>
            </p>
          ))}
        </Panel>
        <Panel title="Your forward-deployed engineers" sub="amfire engineers work inside OpticVyu's systems every week, shipping what your team asks for." right={<Btn size="xs" kind="secondary">Request a change</Btn>}>
          <div className="flex flex-col">
            {FDE_LOG.map((l) => (
              <div key={l.text} className="grid grid-cols-[40px_minmax(0,1fr)_auto] gap-3 border-b border-[#f2f2ef] py-2.5 text-[12.5px] last:border-0">
                <span className="text-[11.5px] text-[#8a8e95]">{l.when}</span>
                <span>{l.text}</span>
                <Badge tone="good">shipped</Badge>
              </div>
            ))}
          </div>
          <p className="mt-3 rounded-lg bg-[#f7f7f5] p-2.5 text-[11.5px] leading-snug text-[#6b6f76]">Code lives in your repository. Your IT team reviews every change and owns everything we build.</p>
        </Panel>
      </div>
    </div>
  );
}
