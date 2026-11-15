"use client";

import { useState } from "react";
import { HIRING, OFFICES, PAYROLL_STEPS, PEOPLE, REGULARISE, REJECTED, SKILLS, SKILL_GRID, STATUTORY, monthFor, officeById, type Dept, type OfficeId, type Today, type Tone } from "./data";
import { TileMap, type Pin } from "./map";
import { EmployeeScreens } from "./phone";
import { inr, money, useOps } from "./store";
import { Badge, Bar, Btn, Dot, Heat, Illustrative, Impact, MetricStrip, Panel, Seg, Table, Td, Th, ViewHead, cx } from "./ui";
import { PersonChip } from "./views-home";

export const TODAY_TONE: Record<Today, Tone> = { "In office": "good", "At site": "good", Travelling: "info", Late: "warn", "On leave": "muted", "Not marked": "bad" };

// ---------------------------------------------------------------- GPS attendance

export function Attendance() {
  const { s, d, m } = useOps();
  const [office, setOffice] = useState<OfficeId>(s.scope === "all" ? "hyd" : s.scope);
  const [dist, setDist] = useState(80);
  const [reg, setReg] = useState<Record<string, string>>({});
  const o = officeById(office);
  const r = s.radius[office];
  const ppl = m.people;
  const count = (t: Today[]) => ppl.filter((p) => t.includes(p.today)).length;
  const rejected = REJECTED.filter((x) => m.inScope(x.office)).length + s.attempts.filter((a) => !a.ok).length;

  // People who marked in at this office, placed inside its boundary; one rejected attempt outside.
  const here = PEOPLE.filter((p) => p.office === office && ["In office", "Late"].includes(p.today));
  const metresToDeg = 1 / 111320;
  const pins: Pin[] = [
    { id: "office", lat: o.lat, lon: o.lon, kind: "office", label: o.name, sub: `boundary ${r} m`, ring: r },
    ...here.slice(0, 8).map((p, i) => {
      const ang = (i / 8) * Math.PI * 2, rr = Math.min(r * 0.7, 90) * ((i % 3) + 1) / 3;
      return { id: p.id, lat: o.lat + Math.sin(ang) * rr * metresToDeg, lon: o.lon + (Math.cos(ang) * rr * metresToDeg) / Math.cos((o.lat * Math.PI) / 180), kind: "engineer" as const, label: p.name, sub: `in at ${p.checkIn}`, color: p.today === "Late" ? "#eab308" : "#16a34a" };
    }),
    ...s.attempts.slice(0, 1).filter((a) => a.office === office).map((a) => ({ id: `try${a.id}`, lat: o.lat + a.distance * metresToDeg * 0.7, lon: o.lon + (a.distance * metresToDeg * 0.7) / Math.cos((o.lat * Math.PI) / 180), kind: "engineer" as const, label: a.who, sub: a.ok ? "marked in" : "rejected", color: a.ok ? "#16a34a" : "#ea580c" })),
  ];

  const sample = ppl.slice(0, 14);
  const cell = { p: "#16a34a", s: "#1baf7a", l: "#eab308", v: "#b9b2f2", a: "#ea580c", w: "#e7e7e3" } as Record<string, string>;
  const word = { p: "in office", s: "at a client site", l: "late", v: "on leave", a: "absent", w: "weekly off" } as Record<string, string>;
  return (
    <div className="flex flex-col gap-4">
      <ViewHead
        title="GPS attendance"
        agent="Attendance agent · 54 phones"
        line="Everyone marks attendance in the app, and only inside a GPS boundary: their office, or the client site they're assigned to that day. A selfie with a liveness check stops proxies, fake-GPS apps are detected, and location is read only in working hours, with consent."
      />
      <MetricStrip
        cols={6}
        items={[
          { label: "Present today", value: `${m.present} / ${ppl.length}`, tone: "good" },
          { label: "At client sites", value: count(["At site"]), foot: "marked in at the site" },
          { label: "Late", value: count(["Late"]), tone: "warn", foot: "after 09:45" },
          { label: "On leave", value: count(["On leave"]) },
          { label: "Not marked", value: count(["Not marked"]), tone: "bad", foot: "reminded at 09:30" },
          { label: "Check-ins rejected", value: rejected, tone: rejected ? "bad" : "good", foot: "outside boundary or fake GPS" },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel flush className="overflow-hidden p-1.5">
          <TileMap key={office} center={[o.lat, o.lon]} zoom={r > 250 ? 16 : 17} height={430} pins={pins} />
        </Panel>
        <div className="flex flex-col gap-4">
          <Panel title="Boundary settings" sub="Set by HR or the founder. Changes apply to the app at once.">
            <select value={office} onChange={(e) => setOffice(e.target.value as OfficeId)} className="h-9 w-full rounded-lg border border-[#dfdfdb] bg-white px-2.5 text-[13px] font-medium">
              {OFFICES.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} · {x.address}
                </option>
              ))}
            </select>
            <label className="mt-4 block text-[12.5px]">
              <span className="flex justify-between">
                <span className="font-medium">Boundary radius</span>
                <b className="tabular-nums">{r} m</b>
              </span>
              <input type="range" min={50} max={500} step={10} value={r} onChange={(e) => d({ t: "radius", office, m: +e.target.value })} className="mt-2 w-full accent-[#5b47e0]" />
            </label>
            <div className="mt-4 flex flex-col gap-2.5">
              {(
                [
                  ["selfie", "Selfie with a liveness check", "Stops someone marking for a friend"],
                  ["mock", "Block fake-GPS apps", "Mock location, rooted phones and emulators"],
                  ["hours", "Track location only in working hours", "09:00–19:00, with each person's consent"],
                  ["offline", "Allow offline check-in at sites", "Saved on the phone, synced when signal returns"],
                ] as const
              ).map(([k, t, x]) => (
                <button key={k} type="button" onClick={() => d({ t: "rule", k })} className="flex items-center justify-between gap-3 text-left">
                  <span>
                    <span className="block text-[12.5px] font-medium">{t}</span>
                    <span className="text-[11.5px] text-[#8a8e95]">{x}</span>
                  </span>
                  <span className={cx("relative h-5 w-9 shrink-0 rounded-full transition", s.rules[k] ? "bg-[#5b47e0]" : "bg-[#d9d9d5]")}>
                    <span className={cx("absolute top-0.5 size-4 rounded-full bg-white shadow transition-all", s.rules[k] ? "left-[18px]" : "left-0.5")} />
                  </span>
                </button>
              ))}
            </div>
          </Panel>
          <Panel title="Try a check-in" sub={`As Aditya Kulkarni, at ${o.short}`}>
            <label className="block text-[12.5px]">
              <span className="flex justify-between">
                <span>Standing this far from the office</span>
                <b className="tabular-nums">{dist} m</b>
              </span>
              <input type="range" min={0} max={1000} step={10} value={dist} onChange={(e) => setDist(+e.target.value)} className="mt-2 w-full accent-[#5b47e0]" />
            </label>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className={cx("text-[12px] font-medium", dist <= r ? "text-[#15803d]" : "text-[#c2410c]")}>{dist <= r ? "Inside the boundary" : `${dist - r} m outside`}</span>
              <Btn size="sm" onClick={() => d({ t: "try-checkin", office, distance: dist })}>
                Mark attendance
              </Btn>
            </div>
          </Panel>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel flush title="Today by office" sub="From app check-ins">
          <Table min={620}>
            <thead>
              <tr>
                <Th>Office</Th>
                <Th>Present</Th>
                <Th className="text-right">At sites</Th>
                <Th className="text-right">Late</Th>
                <Th className="text-right">Leave</Th>
                <Th className="text-right">Not marked</Th>
              </tr>
            </thead>
            <tbody>
              {OFFICES.filter((x) => m.inScope(x.id)).map((x) => {
                const p = PEOPLE.filter((q) => q.office === x.id);
                const c = (t: Today[]) => p.filter((q) => t.includes(q.today)).length;
                const pres = c(["In office", "At site", "Late", "Travelling"]);
                return (
                  <tr key={x.id} className="cursor-pointer hover:bg-[#fbfbfa]" onClick={() => setOffice(x.id)}>
                    <Td className="font-medium">{x.short}</Td>
                    <Td>
                      <span className="inline-flex w-28 items-center gap-2">
                        <Bar value={(pres / p.length) * 100} tone={pres === p.length ? "good" : "warn"} h={5} />
                        {pres}/{p.length}
                      </span>
                    </Td>
                    <Td className="text-right">{c(["At site", "Travelling"])}</Td>
                    <Td className="text-right">{c(["Late"]) || "—"}</Td>
                    <Td className="text-right">{c(["On leave"]) || "—"}</Td>
                    <Td className={cx("text-right", c(["Not marked"]) > 0 && "text-[#c2410c]")}>{c(["Not marked"]) || "—"}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Panel>
        <Panel title="Rejected check-ins today" sub="Each person can ask for a correction with a reason">
          {[...s.attempts.filter((a) => !a.ok).map((a) => ({ who: a.who, office: a.office, when: a.time, reason: "Outside boundary" as const, distance: a.distance - s.radius[a.office] })), ...REJECTED.filter((x) => m.inScope(x.office))].map((x, i) => (
            <div key={x.who + i} className="flex items-start justify-between gap-2 border-b border-[#f2f2ef] py-2 text-[12.5px] last:border-0">
              <PersonChip name={x.who} sub={`${officeById(x.office).short} · ${x.when}`} />
              <span className="text-right">
                <Badge tone="bad">{x.reason}</Badge>
                {x.distance !== undefined && <span className="block text-[11px] text-[#8a8e95]">{inr(x.distance)} m away</span>}
              </span>
            </div>
          ))}
        </Panel>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="November, day by day" sub="Hover a square. A sample of the team.">
          <Heat label="Attendance heatmap" rows={sample.map((p) => p.name)} cols={Array.from({ length: 30 }, (_, i) => String(i + 1))} cell={(ri, ci) => { const v = monthFor(PEOPLE.indexOf(sample[ri]))[ci]; return { bg: cell[v], tip: `${sample[ri].name}, ${ci + 1} Nov: ${word[v]}` }; }} />
          <div className="mt-2 flex flex-wrap gap-3 text-[11.5px] text-[#6b6f76]">
            {Object.keys(cell).map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-[3px]" style={{ background: cell[k] }} />
                {word[k]}
              </span>
            ))}
          </div>
        </Panel>
        <Panel title="Correction requests" sub="Approved by the manager, logged for payroll">
          {REGULARISE.map((x) => {
            const st = reg[x.who] ?? x.state;
            return (
              <div key={x.who} className="border-b border-[#f2f2ef] py-2.5 text-[12.5px] last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <PersonChip name={x.who} sub={x.ask} />
                  {st === "Waiting" ? (
                    <Btn size="xs" kind="secondary" onClick={() => setReg((r0) => ({ ...r0, [x.who]: "Approved" }))}>
                      Approve
                    </Btn>
                  ) : (
                    <Badge tone="good">Approved</Badge>
                  )}
                </div>
                <p className="mt-1 pl-8 text-[11.5px] text-[#8a8e95]">“{x.why}”</p>
              </div>
            );
          })}
          <p className="mt-3 rounded-lg bg-[#f7f7f5] p-2.5 text-[11.5px] leading-snug text-[#6b6f76]">Location data stays in India, is read only in working hours, and each employee can see exactly what was recorded about them, as India&rsquo;s data-protection law expects.</p>
        </Panel>
      </div>
      <Impact items={[{ label: "Proxy attendance", before: "possible", now: "selfie + liveness" }, { label: "Who was on which site", before: "a guess", now: "GPS, by day" }, { label: "Attendance to payroll", before: "typed again", now: "flows straight in" }, { label: "Travel claims", before: "on trust", now: "checked against GPS km" }]} />
    </div>
  );
}

// ---------------------------------------------------------------- People and payroll

export function PeopleView() {
  const { s, d, m } = useOps();
  const [dept, setDept] = useState<"all" | Dept>("all");
  const rows = m.people.filter((p) => dept === "all" || p.dept === dept);
  const costBy = OFFICES.map((o) => ({ o, v: PEOPLE.filter((p) => p.office === o.id).reduce((t, p) => t + p.ctc / 12, 0) }));
  const maxC = Math.max(...costBy.map((c) => c.v));
  return (
    <div className="flex flex-col gap-4">
      <ViewHead title="People and payroll" agent="Payroll agent · prepares, never pays" line="Everyone in every city, one record each: role, office, attendance, leave, claims, kit and pay. Payroll is prepared from GPS attendance, leave and approved claims, checked for every statutory deduction, and paid only after your one approval." right={<Illustrative />} />
      <MetricStrip
        cols={6}
        items={[
          { label: "People", value: PEOPLE.length, foot: "2 joined, 1 left this month" },
          { label: "Payroll, November", value: "₹24.36 L", delta: { v: 2.1, good: false, suffix: "vs October" } },
          { label: "Revenue per employee", value: "₹26.4 L", delta: { v: 11, suffix: "a year" } },
          { label: "Field share of team", value: "44%", foot: "24 engineers" },
          { label: "Open roles", value: 3, foot: "1 offer out" },
          { label: "Left in 12 months", value: "14%", foot: "field 21%, others 6%" },
        ]}
      />
      <Panel title="Payroll · November 2026" sub="Each step is checked before the next one opens." right={<Badge tone={s.payroll >= 6 ? "good" : "warn"}>{s.payroll >= 6 ? "Locked · paid 30 Nov" : `Step ${s.payroll + 1} of 7`}</Badge>}>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {PAYROLL_STEPS.map((st, i) => (
            <li key={st} className={cx("rounded-lg p-2.5 text-[12px] ring-1 transition", i < s.payroll || s.payroll >= 6 ? "bg-[#ebf7ef] ring-[#cbe9d6]" : i === s.payroll ? "bg-[#f5f3fe] ring-[#cbc3f7]" : "bg-[#fbfbfa] ring-[#efefeb]")}>
              <span className={cx("grid size-5 place-items-center rounded-full text-[10px] font-bold", i < s.payroll || s.payroll >= 6 ? "bg-[#16a34a] text-white" : i === s.payroll ? "bg-[#5b47e0] text-white" : "bg-[#e7e7e3] text-[#6b6f76]")}>{i < s.payroll || s.payroll >= 6 ? "✓" : i + 1}</span>
              <p className="mt-1.5 leading-snug font-medium">{st}</p>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#f2f2ef] pt-3">
          <p className="text-[12.5px] text-[#4a4e55]">
            Gross <b className="font-semibold">₹24.36 L</b> · PF ₹1.62 L · ESI ₹0.21 L · PT ₹10,600 · TDS ₹1.94 L · claims ₹38,400 · 3 changes from October, all explained
          </p>
          {s.payroll < 6 && (
            <Btn size="sm" onClick={() => d({ t: "payroll-next" })}>
              {s.payroll === 4 ? "Approve payroll" : `Run: ${PAYROLL_STEPS[s.payroll]}`}
            </Btn>
          )}
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Pay cost by office" sub="₹ a month">
          {costBy.map((c) => (
            <div key={c.o.id} className="grid grid-cols-[6rem_minmax(0,1fr)_4.5rem] items-center gap-2 py-1 text-[12px]">
              <span>{c.o.short}</span>
              <Bar value={(c.v / maxC) * 100} h={6} />
              <span className="text-right tabular-nums">{money(c.v)}</span>
            </div>
          ))}
        </Panel>
        <Panel title="Statutory dates" sub="Filed from the same payroll run">
          {STATUTORY.map((x) => (
            <p key={x.what} className="flex items-center justify-between border-b border-[#f2f2ef] py-2 text-[12.5px] last:border-0">
              <span>
                {x.what} <span className="text-[#8a8e95]">· {x.due}</span>
              </span>
              <Badge tone={x.state === "Filed" ? "good" : x.state === "Ready" ? "info" : "muted"}>{x.state}</Badge>
            </p>
          ))}
        </Panel>
        <Panel title="Hiring" sub="Screened by the people agent, decided by people">
          {HIRING.map((h) => (
            <p key={h.role} className="flex items-center justify-between border-b border-[#f2f2ef] py-2 text-[12.5px] last:border-0">
              <span>{h.role}</span>
              <span className="flex items-center gap-2">
                <span className="text-[11.5px] text-[#8a8e95]">{h.n ? `${h.n} candidates` : ""}</span>
                <Badge tone={h.stage === "Offer sent" ? "good" : h.stage === "Paused" ? "muted" : "info"}>{h.stage}</Badge>
              </span>
            </p>
          ))}
          <p className="mt-2 text-[11.5px] text-[#8a8e95]">New engineers clear a skills checklist in the app before their first solo install.</p>
        </Panel>
      </div>
      <Panel title="Engineer skills" sub="Who can be sent where. Certified · trained · not yet.">
        <Heat
          label="Skills grid"
          rows={SKILL_GRID.map((x) => x.who)}
          cols={SKILLS.map((x) => x.split(" ")[0])}
          cell={(r, c) => {
            const v = SKILL_GRID[r].s[c];
            return { bg: ["#ecece8", "#b9b2f2", "#5b47e0"][v], text: v === 2 ? "✓" : "", tip: `${SKILL_GRID[r].who} · ${SKILLS[c]}: ${["not trained", "trained", "certified"][v]}` };
          }}
        />
      </Panel>
      <Panel flush title="Directory" right={<Seg size="xs" value={dept} onChange={setDept} options={[{ id: "all", label: "All" }, { id: "Field engineering", label: "Field" }, { id: "Support and NOC", label: "Support" }, { id: "Video and data", label: "Video" }, { id: "Sales", label: "Sales" }, { id: "Accounts", label: "Accounts" }]} />}>
        <Table min={860}>
          <thead>
            <tr>
              <Th>Person</Th>
              <Th>Team</Th>
              <Th>Office</Th>
              <Th>Today</Th>
              <Th>Marked in</Th>
              <Th>Phone</Th>
              <Th>Joined</Th>
              <Th className="text-right">Cost a month</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <Td>
                  <PersonChip name={p.name} sub={p.title} />
                </Td>
                <Td>{p.dept}</Td>
                <Td>{officeById(p.office).short}</Td>
                <Td>
                  <Badge tone={TODAY_TONE[p.today]}>{p.today}</Badge>
                </Td>
                <Td className="text-[#6b6f76]">{p.checkIn ?? "—"}</Td>
                <Td className="text-[#6b6f76]">{p.phone}</Td>
                <Td className="text-[#6b6f76]">{p.joined}</Td>
                <Td className="text-right">₹{inr(Math.round(p.ctc / 12))}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------- Employee app

export function EmployeeApp() {
  return (
    <div className="flex flex-col gap-4">
      <ViewHead title="Employee app" line="One app on every employee's phone, Android or iPhone, in every city. Each person manages their own work life: marking attendance inside the boundary, leave, claims, payslips, kit and jobs. HR stops being a queue of WhatsApp messages." />
      <EmployeeScreens />
      <div className="grid gap-4 lg:grid-cols-3">
        {[
          ["For every employee", ["Mark attendance inside the GPS boundary, with a selfie", "Apply for leave and see the balance", "Claims with a photo of the bill", "Payslips and Form 16 any time", "Company policies and holidays", "Raise a request to HR or IT"]],
          ["For field engineers", ["Today's jobs, in route order", "Scan a camera serial; take geo-tagged photos", "Installation complete, in one tap", "Log parts used against the job", "Report a faulty tool with a photo", "Works offline on sites with weak signal"]],
          ["For managers and you", ["Approve leave, claims and corrections", "See who is where, live", "Reminders and escalations", "Your whole company, in your pocket", "Approve payroll and purchases", "Ask a question in plain words"]],
        ].map(([t, list]) => (
          <Panel key={t as string} title={t as string}>
            <ul className="flex flex-col gap-1.5 text-[12.5px]">
              {(list as string[]).map((x) => (
                <li key={x} className="flex gap-2">
                  <span className="mt-1.5">
                    <Dot tone="brand" />
                  </span>
                  {x}
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
      <p className="text-[12px] text-[#6b6f76]">Distributed privately to OpticVyu staff (Apple Business Manager and managed Google Play), not listed beside your client app. Sign-in uses company accounts; access ends the day someone leaves.</p>
    </div>
  );
}
