// The laptop runner's own parts, without starting Claude: the flags it passes
// (never --bare, always restricted and strict), how it reads tool calls and
// usage limits from the stream, the copy rules, and the citation check that
// removes any email or phone its source page doesn't show.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import * as z from "zod";
import { copyProblems, TASK_RESULTS, type ResearchBatchResult } from "@/knowledge/team";
import { checkCitations, pageHas } from "../scripts/team/citations";
import { buildArgs, describeToolUse, parseRateLimit } from "../scripts/team/claude-cli";

describe("the CLI adapter", () => {
  test("runs restricted, strict and non-interactive, with the run key in a file and never --bare", () => {
    const a = buildArgs({ systemPrompt: "SOP", model: "sonnet", tools: ["WebFetch", "WebSearch"], allowedTools: ["WebFetch", "mcp__amfire-hq__get_task_packet"], mcpConfigPath: "C:/runs/x/mcp.json", jsonSchema: { type: "object" } });
    for (const flag of ["-p", "--verbose", "--restricted", "--strict-mcp-config", "--no-session-persistence", "--json-schema"]) assert.ok(a.includes(flag), flag);
    assert.equal(a[a.indexOf("--output-format") + 1], "stream-json");
    assert.equal(a[a.indexOf("--permission-mode") + 1], "dontAsk");
    assert.equal(a[a.indexOf("--permission-prompts") + 1], "none");
    assert.equal(a[a.indexOf("--tools") + 1], "WebFetch,WebSearch");
    assert.equal(a[a.indexOf("--mcp-config") + 1], "C:/runs/x/mcp.json");
    assert.ok(!a.includes("--bare"));
    assert.ok(!a.some((x) => x.startsWith("amf_")));
  });

  test("tool calls become short progress lines, never page text", () => {
    assert.equal(describeToolUse("WebFetch", { url: "https://www.tofler.in/takshi/company/U34300" }), "Reading tofler.in/takshi/company/U34300");
    assert.equal(describeToolUse("mcp__amfire-hq__get_task_packet", {}), "HQ: get_task_packet");
    assert.match(describeToolUse("WebSearch", { query: "forging Chakan" }), /^Searching/);
  });

  test("usage windows are read from the stream as shares, whether given as 0–1 or percent", () => {
    const r = parseRateLimit({ status: "allowed_warning", resetsAt: 1794162600, unifiedWindows: { five_hour: { utilization: 87 }, seven_day: { utilization: 0.4 } } });
    assert.equal(r.status, "allowed_warning");
    assert.equal(r.fiveHour, 0.87);
    assert.equal(r.sevenDay, 0.4);
    assert.equal(r.resetsAt?.toISOString(), "2026-11-08T18:30:00.000Z"); // epoch seconds
  });

  test("each task type's result becomes a JSON schema the CLI can enforce", () => {
    for (const schema of Object.values(TASK_RESULTS)) {
      const json = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as { type: string; properties: object };
      assert.equal(json.type, "object");
      assert.ok(Object.keys(json.properties).length >= 2);
    }
  });
});

describe("copy rules", () => {
  test("first touches never say AI, automation, software, prices or rupees, and write amfire in lower case", () => {
    assert.deepEqual(copyProblems("I run amfire, a Pune company that studies how work moves through growing plants."), []);
    assert.ok(copyProblems("Our AI tool").length);
    assert.ok(copyProblems("We automate dispatch").length);
    assert.ok(copyProblems("at a special price").length);
    assert.ok(copyProblems("only ₹15,000").length);
    assert.ok(copyProblems("worth 2 lakh a month").length);
    assert.ok(copyProblems("AMFIRE, Pune").length);
    assert.deepEqual(copyProblems("Said they'd automatically renew"), []); // not the word "automate"
  });
});

describe("the citation check", () => {
  const page = "contact us: sales@forgings.example.in, +91 20 2712 2313. md: r.sharma@gmail.com".toLowerCase();
  const result: ResearchBatchResult = {
    targets: [
      {
        prospect: { name: "Example Forgings", area: "Chakan", website: "https://forgings.example.in", sourceUrl: "https://tofler.in/x", email: "sales@forgings.example.in", phone: "020-27122313" },
        facts: {},
        contacts: [
          { name: "R Sharma", role: "decision_maker", email: "r.sharma@gmail.com", sourceUrl: "https://forgings.example.in/contact" },
          { name: "Invented Person", role: "champion", email: "made.up@yahoo.com", phone: "+91 98765 43210", sourceUrl: "https://forgings.example.in/contact" },
        ],
        signals: [],
      },
    ],
    rejected: [],
    summary: "One found.",
  };

  test("phone numbers match by digits, whatever the spacing", () => {
    assert.ok(pageHas(page, "phone", "020-27122313"));
    assert.ok(!pageHas(page, "phone", "+91 98765 43210"));
  });

  test("keeps what the source shows, removes what it doesn't, and says so in the summary", async () => {
    const fetched: string[] = [];
    const { result: clean, report } = await checkCitations(result, async (url) => {
      fetched.push(url);
      return url.startsWith("https://forgings.example.in") ? page : null;
    });
    const [t] = clean.targets;
    assert.equal(t.prospect.email, "sales@forgings.example.in");
    assert.equal(t.prospect.phone, "020-27122313");
    assert.equal(t.contacts[0].email, "r.sharma@gmail.com");
    assert.equal(t.contacts[1].email, undefined);
    assert.equal(t.contacts[1].phone, undefined);
    assert.equal(report.removed.length, 2);
    assert.match(clean.summary, /removed 2/);
    assert.equal(new Set(fetched).size, fetched.length); // each page fetched once
  });
});
