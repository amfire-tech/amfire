"use client";

import { useState } from "react";
import { STAGES, TEAM_LEAD, officeById, type Health, type Log, type Team, type Tone } from "./data";
import { money, useOps } from "./store";
import { Avatar, Badge, Bar, Btn, Dot, Impact, Illustrative, MetricStrip, Panel, Seg, Table, Td, Th, ViewHead, cx } from "./ui";

// Every project, every stage, every team. Each stage is owned by one team; that team ticks its
// checklist and writes its updates on the project; the founder sees where everything stands,
// what is late, and what waits for a yes.

const H_TONE: Record<Health, Tone> = { "On track": "good", "At risk": "warn", Blocked: "bad" };
const H_COLOR: Record<Health, string> = { "On track": "#5b47e0", "At risk": "#eab308", Blocked: "#ea580c" };
const KIND: Record<Log["kind"], { label: string; tone: Tone }> = { update: { label: "update", tone: "muted" }, note: { label: "note", tone: "info" }, blocker: { label: "blocker", tone: "bad" }, approval: { label: "approved", tone: "good" }, auto: { label: "agent", tone: "brand" } };
const TEAMS: Team[] = ["Sales", "Pre-sales", "Accounts", "Stores", "Field", "Support"];

export function StageStrip({ stage, health, size = "md" }: { stage: number; health: Health; size?: "sm" | "md" }) {
  return (
    <span className="flex items-center gap-[3px]" aria-label={`Stage ${stage + 1} of ${STAGES.length}: ${STAGES[stage].label}`}>
      {STAGES.map((st, i) => (
        <span
          key={st.key}
          title={`${i + 1}. ${st.label} · ${st.team}`}
          className={cx("rounded-[3px]", size === "sm" ? "h-1.5 w-2.5" : "h-2 w-4")}
          style={{ background: i < stage ? "#16a34a" : i === stage ? H_COLOR[health] : "#e7e7e3", boxShadow: i === stage ? `0 0 0 2px ${H_COLOR[health]}33` : undefined }}
        />
      ))}
    </span>
  );
}

export function ProjectTracker() {
  const { s, d, m } = useOps();
  const [stage, setStage] = useState<number | null>(null);
  const [team, setTeam] = useState<"all" | Team>("all");
  const [health, setHealth] = useState<"all" | Health>("all");
  const all = s.projects.filter((p) => m.inScope(p.office));
  const rows = all.filter((p) => (stage === null || p.stage === stage) && (team === "all" || STAGES[p.stage].team === team) && (health === "all" || p.health === health));
  const gates = all.filter((p) => p.gate);
  const late = all.filter((p) => STAGES[p.stage].sla > 0 && p.inStage > STAGES[p.stage].sla);
  const feed = all
    .flatMap((p) => p.logs.map((l, i) => ({ p, l, i })))
    .filter((x) => x.l.when.startsWith("Today") || x.l.when === "Yesterday")
    .sort((a, b) => (b.l.when.startsWith("Today") ? 1 : 0) - (a.l.when.startsWith("Today") ? 1 : 0) || b.l.when.localeCompare(a.l.when))
    .slice(0, 9);
  return (
    <div className="flex flex-col gap-4">
      <ViewHead
        title="Project tracker"
        agent="Every team updates its own stage"
        line="Every project moves through ten stages, from enquiry to redeploy. Each stage belongs to one team, with a checklist and a time target. The team writes its updates and blockers on the project as it works, the next team is handed the project with its full history, and anything that needs your yes stops here."
        right={<Illustrative />}
      />
      <MetricStrip
        cols={6}
        items={[
          { label: "Projects in motion", value: all.length + 32, foot: `${all.length} shown here` },
          { label: "Blocked", value: all.filter((p) => p.health === "Blocked").length, tone: "bad", foot: "waiting on someone" },
          { label: "At risk", value: all.filter((p) => p.health === "At risk").length, tone: "warn" },
          { label: "Past the stage's time target", value: late.length, tone: late.length ? "warn" : "good" },
          { label: "Waiting for you", value: gates.length, tone: gates.length ? "info" : "good", foot: "stage gates" },
          { label: "Enquiry to live", value: "31 days", delta: { v: -9, good: false, unit: " d", suffix: "vs last quarter" } },
        ]}
      />

      <Panel title="Where every project is" sub="Click a stage to see its projects. The team under each stage owns it." right={stage !== null ? <Btn size="xs" kind="secondary" onClick={() => setStage(null)}>Show all stages</Btn> : null}>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
          {STAGES.map((st, i) => {
            const here = all.filter((p) => p.stage === i);
            const over = here.filter((p) => st.sla > 0 && p.inStage > st.sla).length;
            const active = stage === i;
            return (
              <button key={st.key} type="button" onClick={() => setStage(active ? null : i)} className={cx("flex min-w-[84px] flex-1 flex-col gap-1.5 rounded-lg p-2 text-left ring-1 transition", active ? "bg-[#f5f3fe] ring-[#b9b2f2]" : "bg-[#fbfbfa] ring-[#efefeb] hover:ring-[#dcdcd7]")}>
                <span className="text-[10.5px] font-semibold text-[#9a9ea5] tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[12px] leading-tight font-semibold">{st.label}</span>
                <span className="text-[10.5px] text-[#6b6f76]">{st.team}</span>
                <span className="mt-1 flex items-end justify-between">
                  <span className="text-[20px] leading-none font-semibold tabular-nums">{here.length + [6, 4, 5, 3, 2, 1, 1, 0, 2, 3][i]}</span>
                  {over > 0 && <Badge tone="warn">{over} late</Badge>}
                </span>
                <span className="flex h-1.5 gap-[2px] overflow-hidden rounded">
                  {(["On track", "At risk", "Blocked"] as Health[]).map((h) => {
                    const n = here.filter((p) => p.health === h).length;
                    return n ? <span key={h} style={{ flex: n, background: H_COLOR[h] }} /> : null;
                  })}
                  {!here.length && <span className="flex-1 bg-[#e7e7e3]" />}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-[#6b6f76]">
          {(Object.keys(H_COLOR) as Health[]).map((h) => (
            <span key={h} className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-[2px]" style={{ background: H_COLOR[h] }} />
              {h}
            </span>
          ))}
          <span className="ml-auto">Counts include projects not listed below.</span>
        </p>
      </Panel>

      {gates.length > 0 && (
        <Panel title="Stopped at a stage gate, waiting for you" sub="The team can't move these on until you decide." right={<Badge tone="info">{gates.length}</Badge>}>
          <div className="grid gap-2 md:grid-cols-2">
            {gates.map((p) => (
              <div key={p.id} className="flex flex-col gap-2 rounded-lg p-3 ring-1 ring-[#e4e0fb]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-[#8a8e95]">
                      {p.id} · {p.name} · {STAGES[p.stage].label}
                    </p>
                    <p className="text-[13px] font-semibold">{p.gate!.title}</p>
                  </div>
                  {p.gate!.amount && <span className="shrink-0 text-[13px] font-semibold tabular-nums">{money(p.gate!.amount)}</span>}
                </div>
                <p className="text-[12px] leading-snug text-[#6b6f76]">{p.gate!.detail}</p>
                <div className="flex gap-1.5">
                  <Btn size="xs" onClick={() => d({ t: "gate", id: p.id })}>Approve</Btn>
                  <Btn size="xs" kind="secondary" onClick={() => d({ t: "drawer", d: { kind: "project", id: p.id } })}>Open project</Btn>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel
        flush
        title={`${rows.length} projects${stage !== null ? ` at ${STAGES[stage].label}` : ""}`}
        sub="Click a project for every stage, every team's updates, its checklist and notes."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Seg size="xs" value={team} onChange={setTeam} options={[{ id: "all", label: "All teams" }, ...TEAMS.map((t) => ({ id: t, label: t }))]} />
            <Seg size="xs" value={health} onChange={setHealth} options={[{ id: "all", label: "All" }, { id: "Blocked", label: "Blocked" }, { id: "At risk", label: "At risk" }, { id: "On track", label: "On track" }]} />
          </div>
        }
      >
        <Table min={1120}>
          <thead>
            <tr>
              <Th>Project</Th>
              <Th>Stage</Th>
              <Th>Owner team</Th>
              <Th className="text-right">In stage</Th>
              <Th>Checklist</Th>
              <Th>Health</Th>
              <Th>Latest from the team</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const st = STAGES[p.stage];
              const over = st.sla > 0 && p.inStage > st.sla;
              const last = p.logs[p.logs.length - 1];
              return (
                <tr key={p.id} className="cursor-pointer hover:bg-[#fbfbfa]" onClick={() => d({ t: "drawer", d: { kind: "project", id: p.id } })}>
                  <Td className="whitespace-nowrap">
                    <span className="font-medium text-[#111113]">{p.name}</span>
                    <span className="block text-[11px] text-[#8a8e95]">
                      {p.id} · {p.client} · {officeById(p.office).short}
                    </span>
                  </Td>
                  <Td>
                    <StageStrip stage={p.stage} health={p.health} />
                    <span className="mt-1 block text-[11.5px] font-medium">
                      {p.stage + 1}. {st.label}
                      {p.gate && <span className="ml-1.5 text-[#5b47e0]">· needs you</span>}
                    </span>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-2">
                      <Avatar name={TEAM_LEAD[st.team]} size={22} />
                      <span className="leading-tight">
                        <span className="block text-[12px] font-medium">{st.team}</span>
                        <span className="block text-[11px] text-[#8a8e95]">{TEAM_LEAD[st.team]}</span>
                      </span>
                    </span>
                  </Td>
                  <Td className={cx("text-right whitespace-nowrap", over && "font-medium text-[#c2410c]")}>
                    {p.inStage} d{st.sla > 0 && <span className="block text-[11px] font-normal text-[#8a8e95]">target {st.sla} d</span>}
                  </Td>
                  <Td>
                    <span className="inline-flex w-28 items-center gap-2">
                      <Bar value={(p.done / st.checks.length) * 100} tone={p.done === st.checks.length ? "good" : "brand"} h={5} />
                      <span className="text-[11.5px] tabular-nums">
                        {p.done}/{st.checks.length}
                      </span>
                    </span>
                  </Td>
                  <Td>
                    <Badge tone={H_TONE[p.health]}>{p.health}</Badge>
                  </Td>
                  <Td className="max-w-[300px]">
                    <span className="line-clamp-2 text-[12px] leading-snug">{last.text}</span>
                    <span className="text-[11px] text-[#8a8e95]">
                      {last.who} · {last.when}
                    </span>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel title="Latest from every team" sub="Updates, notes and blockers written on projects today and yesterday">
          <div className="-mx-2 flex flex-col">
            {feed.map(({ p, l, i }) => (
              <button key={p.id + i} type="button" onClick={() => d({ t: "drawer", d: { kind: "project", id: p.id } })} className="grid grid-cols-[26px_minmax(0,1fr)] gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-[#fbfbfa]">
                <Avatar name={l.who} size={24} />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-[#8a8e95]">
                    <b className="font-medium text-[#111113]">{l.who}</b> · {l.team} · {p.name} · {l.when}
                    <Badge tone={KIND[l.kind].tone}>{KIND[l.kind].label}</Badge>
                  </span>
                  <span className="block text-[12.5px] leading-snug">{l.text}</span>
                </span>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="Which team holds what" sub="Projects at each team's stages, and how many are late">
          {TEAMS.map((t) => {
            const mine = all.filter((p) => STAGES[p.stage].team === t);
            const lateN = mine.filter((p) => STAGES[p.stage].sla > 0 && p.inStage > STAGES[p.stage].sla).length;
            return (
              <button key={t} type="button" onClick={() => setTeam(t)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-[#f2f2ef] py-2.5 text-left last:border-0 hover:bg-[#fbfbfa]">
                <span className="flex items-center gap-2.5">
                  <Avatar name={TEAM_LEAD[t]} size={26} />
                  <span className="leading-tight">
                    <span className="block text-[12.5px] font-medium">{t}</span>
                    <span className="block text-[11px] text-[#8a8e95]">
                      {TEAM_LEAD[t]} · stages {STAGES.map((s0, i) => (s0.team === t ? i + 1 : null)).filter(Boolean).join(", ")}
                    </span>
                  </span>
                </span>
                <span className="flex items-center gap-2 text-[12px]">
                  <b className="font-semibold tabular-nums">{mine.length}</b>
                  {lateN > 0 ? <Badge tone="warn">{lateN} late</Badge> : <Badge tone="good">on time</Badge>}
                </span>
              </button>
            );
          })}
        </Panel>
      </div>
      <Impact items={[{ label: "Where is this project?", before: "ask three people", now: "one row" }, { label: "Handover between teams", before: "a WhatsApp message", now: "with full history" }, { label: "Blockers", before: "found at month-end", now: "flagged the same day" }, { label: "Your decisions", before: "in calls and chats", now: "one stage gate" }]} />
    </div>
  );
}

export function ProjectDrawer({ id }: { id: string }) {
  const { s, d } = useOps();
  const p = s.projects.find((x) => x.id === id)!;
  const st = STAGES[p.stage];
  const [text, setText] = useState("");
  const [team, setTeam] = useState<Team>(st.team);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={H_TONE[p.health]}>{p.health}</Badge>
        <span className="text-[12px] text-[#6b6f76]">
          {p.client} · {officeById(p.office).name} · {p.cams} cameras · {money(p.value)}
        </span>
      </div>
      <StageStrip stage={p.stage} health={p.health} />

      {p.gate && (
        <div className="rounded-xl p-3.5 ring-1 ring-[#d9d3fb]">
          <p className="flex items-center justify-between gap-2 text-[12px] font-semibold text-[#5b47e0]">
            <span className="inline-flex items-center gap-1.5">
              <Dot tone="brand" /> Stage gate: needs your yes
            </span>
            {p.gate.amount && <span className="text-[#111113] tabular-nums">{money(p.gate.amount)}</span>}
          </p>
          <p className="mt-1 text-[13px] font-semibold">{p.gate.title}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-[#6b6f76]">{p.gate.detail}</p>
          <div className="mt-2.5 flex gap-1.5">
            <Btn size="sm" onClick={() => d({ t: "gate", id: p.id })}>Approve</Btn>
            <Btn size="sm" kind="secondary">Ask the team</Btn>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-[#fbfbfa] p-3.5 ring-1 ring-[#efefeb]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.06em] text-[#8a8e95] uppercase">Now · stage {p.stage + 1} of {STAGES.length}</p>
            <p className="text-[15px] font-semibold">{st.label}</p>
            <p className="text-[12px] text-[#6b6f76]">
              Owned by {st.team} · {TEAM_LEAD[st.team]} · {p.inStage} d in stage{st.sla > 0 ? `, target ${st.sla} d` : ""}
            </p>
          </div>
          <Avatar name={TEAM_LEAD[st.team]} size={30} />
        </div>
        <ul className="mt-3 flex flex-col gap-1.5">
          {st.checks.map((c, i) => {
            const done = i < p.done;
            const nextUp = i === p.done;
            return (
              <li key={c}>
                <button type="button" disabled={!nextUp} onClick={() => d({ t: "tick", id: p.id })} className={cx("flex w-full items-center gap-2.5 rounded-md px-1.5 py-1 text-left text-[12.5px]", nextUp && "hover:bg-white")}>
                  <span className={cx("grid size-4 shrink-0 place-items-center rounded border text-[9px] font-bold", done ? "border-[#16a34a] bg-[#16a34a] text-white" : nextUp ? "border-[#5b47e0]" : "border-[#d4d4cf]")}>{done ? "✓" : ""}</span>
                  <span className={cx(done ? "text-[#8a8e95] line-through decoration-[#c9c9c4]" : "text-[#111113]")}>{c}</span>
                  {nextUp && <span className="ml-auto text-[11px] font-medium text-[#5b47e0]">tick</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[12px] text-[#4a4e55]">
          <b className="font-semibold">Next:</b> {p.next}
        </p>
        {p.stage < STAGES.length - 1 && (
          <Btn size="sm" className="mt-3" disabled={!!p.gate} onClick={() => d({ t: "next-stage", id: p.id })}>
            Move to {STAGES[p.stage + 1].label} → hand to {STAGES[p.stage + 1].team}
          </Btn>
        )}
      </div>

      <div className="rounded-xl p-3 ring-1 ring-[#ececE8]">
        <p className="mb-2 text-[11px] font-semibold tracking-[0.06em] text-[#8a8e95] uppercase">Write an update on this project</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="What happened, what's blocking, what's next…" className="w-full resize-none rounded-lg border border-[#e3e3de] bg-white px-2.5 py-2 text-[12.5px] outline-none focus:border-[#b9b2f2]" />
        <div className="mt-2 flex items-center justify-between gap-2">
          <select value={team} onChange={(e) => setTeam(e.target.value as Team)} className="h-8 rounded-lg border border-[#dfdfdb] bg-white px-2 text-[12px]">
            {[...TEAMS, "Founder" as Team].map((t) => (
              <option key={t} value={t}>
                As {t === "Founder" ? "Founder" : `${t} · ${TEAM_LEAD[t]}`}
              </option>
            ))}
          </select>
          <Btn size="sm" disabled={!text.trim()} onClick={() => { d({ t: "note", id: p.id, text, team }); setText(""); }}>
            Add update
          </Btn>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold tracking-[0.06em] text-[#8a8e95] uppercase">Every stage, every team</p>
        <ol className="relative flex flex-col">
          {STAGES.map((s0, i) => {
            const logs = p.logs.filter((l) => l.stage === i);
            const state = i < p.stage ? "done" : i === p.stage ? "now" : "next";
            return (
              <li key={s0.key} className="relative grid grid-cols-[22px_minmax(0,1fr)] gap-3 pb-3.5">
                {i < STAGES.length - 1 && <span className={cx("absolute top-5 left-[10px] h-full w-px", i < p.stage ? "bg-[#9fd8b4]" : "bg-[#e7e7e3]")} />}
                <span className={cx("relative z-[1] mt-0.5 grid size-[21px] place-items-center rounded-full text-[10px] font-bold", state === "done" ? "bg-[#16a34a] text-white" : state === "now" ? "text-white" : "border border-[#dcdcd7] bg-white text-[#9a9ea5]")} style={state === "now" ? { background: H_COLOR[p.health] } : undefined}>
                  {state === "done" ? "✓" : i + 1}
                </span>
                <div className="min-w-0">
                  <p className={cx("text-[12.5px] font-semibold", state === "next" && "text-[#9a9ea5]")}>
                    {s0.label} <span className="font-normal text-[#8a8e95]">· {s0.team}</span>
                  </p>
                  {logs.map((l, k) => (
                    <div key={k} className="mt-1.5 rounded-lg bg-[#fbfbfa] px-2.5 py-1.5 ring-1 ring-[#f0f0ec]">
                      <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#8a8e95]">
                        <b className="font-medium text-[#3f434a]">{l.who}</b> · {l.when}
                        <Badge tone={KIND[l.kind].tone}>{KIND[l.kind].label}</Badge>
                      </p>
                      <p className="text-[12px] leading-snug">{l.text}</p>
                    </div>
                  ))}
                  {state === "done" && !logs.length && <p className="text-[11.5px] text-[#9a9ea5]">Completed</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
