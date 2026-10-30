"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { Button, Card, CardTitle, Field, Notice, cx, inputClass } from "@/components/ui";
import { renderEmailHtml, type EmailContent, type EmailFrame } from "@/knowledge/email-theme";
import { checkEmailDeliveryAction, saveEmailDraftAction, sendEmailTestAction, sendEmailToProspectAction, type DraftFields, type DraftState } from "./actions";

export function EmailComposer({
  prospectId,
  recipients,
  frame,
  initial,
  initialState,
  lastTestTo,
  fromAddress,
}: {
  /** The address the email comes from (hello@amfire.in). */
  fromAddress: string;
  prospectId: string;
  recipients: { email: string; name: string }[];
  frame: EmailFrame;
  initial: DraftFields;
  initialState: DraftState | null;
  /** The address the last test went to, from any email: usually the owner's second inbox. */
  lastTestTo: string | null;
}) {
  const router = useRouter();
  const [fields, setFields] = useState(initial);
  const [draft, setDraft] = useState(initialState);
  const [dirty, setDirty] = useState(!initialState);
  const [testTo, setTestTo] = useState(lastTestTo ?? "");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [width, setWidth] = useState<"desktop" | "phone">("desktop");

  const c = fields.content;
  const set = (patch: Partial<DraftFields>) => {
    setFields((f) => ({ ...f, ...patch }));
    setDirty(true);
  };
  const setContent = (patch: Partial<EmailContent>) => set({ content: { ...fields.content, ...patch } });

  const html = useMemo(() => renderEmailHtml(c, { ...frame, subject: fields.subject || "(no subject)" }), [c, frame, fields.subject]);

  const tested = !!draft && !dirty && draft.testedVersion === draft.version;
  const sendBlocker = !fields.toEmail ? "Add the address to send to." : dirty || !draft ? "Send a test of this version first." : !tested ? "Send a test of this version first." : null;

  function run(fn: () => Promise<{ error?: string; ok?: string; draft?: DraftState; sent?: boolean }>) {
    setMessage(null);
    start(async () => {
      // A dropped connection or a server that never answered rejects instead of returning an error.
      const res = await fn().catch(() => ({ error: "HQ didn't answer. Check your connection; if a test was on its way, look in your inbox before sending again." }) as Awaited<ReturnType<typeof fn>>);
      if (res.error) return setMessage({ tone: "error", text: res.error });
      if (res.draft) {
        setDraft(res.draft);
        setFields((f) => ({ ...f, emailId: res.draft!.id }));
        setDirty(false);
      }
      setMessage({ tone: "success", text: res.ok ?? "Done." });
      if (res.sent) router.push(`/hq/outreach/${prospectId}`);
    });
  }

  const sendTest = () => run(() => sendEmailTestAction(prospectId, fields, testTo));
  const sendToClient = () => {
    if (!draft) return;
    if (!confirm(`Send “${fields.subject}” to ${fields.toEmail}${fields.cc ? ` (cc ${fields.cc})` : ""}? This can't be undone.`)) return;
    run(() => sendEmailToProspectAction(prospectId, draft.id));
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card>
          <CardTitle>Who and what</CardTitle>
          <div className="space-y-3">
            <Field label="To" htmlFor="toEmail" hint={recipients.length ? `On the desk: ${recipients.map((r) => r.name).join(" · ")}` : "No email on the desk for this firm yet."}>
              <input id="toEmail" list="recipients" type="email" value={fields.toEmail} onChange={(e) => set({ toEmail: e.target.value })} className={inputClass} />
              <datalist id="recipients">
                {recipients.map((r) => (
                  <option key={r.email} value={r.email}>
                    {r.name}
                  </option>
                ))}
              </datalist>
            </Field>
            <Field label="Cc" htmlFor="cc" optional hint="Separate several with commas.">
              <input id="cc" value={fields.cc} onChange={(e) => set({ cc: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Subject" htmlFor="subject">
              <input id="subject" value={fields.subject} onChange={(e) => set({ subject: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Preview text" htmlFor="preheader" optional hint="Shown next to the subject in the inbox.">
              <input id="preheader" value={c.preheader} onChange={(e) => setContent({ preheader: e.target.value })} className={inputClass} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardTitle>The email</CardTitle>
          <p className="-mt-2 mb-4 text-sm text-muted">
            Blank line = new paragraph. **bold**, *italic*; in the headline, *word* is the saffron accent.
          </p>
          <div className="space-y-3">
            <Field label="Small line above the headline" htmlFor="eyebrow" optional>
              <input id="eyebrow" value={c.eyebrow} onChange={(e) => setContent({ eyebrow: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Headline" htmlFor="headline">
              <textarea id="headline" rows={2} value={c.headline} onChange={(e) => setContent({ headline: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Greeting" htmlFor="greeting" optional>
              <input id="greeting" value={c.greeting} onChange={(e) => setContent({ greeting: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Opening" htmlFor="opening">
              <textarea id="opening" rows={7} value={c.opening} onChange={(e) => setContent({ opening: e.target.value })} className={inputClass} />
            </Field>
            <Group title="Picture" optional>
              <input aria-label="Picture link" placeholder="https://www.amfire.in/email/…png" value={c.image?.url ?? ""} onChange={(e) => setContent({ image: e.target.value.trim() ? { url: e.target.value, alt: c.image?.alt ?? "" } : null })} className={inputClass} />
              {c.image && <input aria-label="Picture description" placeholder="What the picture shows" value={c.image.alt} onChange={(e) => setContent({ image: { ...c.image!, alt: e.target.value } })} className={inputClass} />}
            </Group>
            <Group title="Main button" optional>
              <input aria-label="Button text" placeholder="Button text" value={c.button?.label ?? ""} onChange={(e) => setContent({ button: { label: e.target.value, url: c.button?.url ?? "", note: c.button?.note ?? "" } })} className={inputClass} />
              <input aria-label="Button link" placeholder="https://…" value={c.button?.url ?? ""} onChange={(e) => setContent({ button: { label: c.button?.label ?? "", url: e.target.value, note: c.button?.note ?? "" } })} className={inputClass} />
              <input aria-label="Line under the button" placeholder="Line under the button (optional)" value={c.button?.note ?? ""} onChange={(e) => setContent({ button: { label: c.button?.label ?? "", url: c.button?.url ?? "", note: e.target.value } })} className={inputClass} />
              {c.button && (
                <button type="button" className="text-sm text-muted underline" onClick={() => setContent({ button: null })}>
                  Remove the button
                </button>
              )}
            </Group>
            <Group title="Findings">
              <input aria-label="Findings heading" placeholder="Heading" value={c.findingsTitle} onChange={(e) => setContent({ findingsTitle: e.target.value })} className={inputClass} />
              {c.findings.map((f, i) => (
                <div key={i} className="space-y-2 rounded-xl border border-line p-3">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{i + 1}</span>
                    <button type="button" className="underline" onClick={() => setContent({ findings: c.findings.filter((_, j) => j !== i) })}>
                      Remove
                    </button>
                  </div>
                  <input aria-label={`Finding ${i + 1} in bold`} placeholder="In bold" value={f.title} onChange={(e) => setContent({ findings: c.findings.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} className={inputClass} />
                  <textarea aria-label={`Finding ${i + 1} detail`} rows={2} placeholder="The detail" value={f.body} onChange={(e) => setContent({ findings: c.findings.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)) })} className={inputClass} />
                </div>
              ))}
              {c.findings.length < 8 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setContent({ findings: [...c.findings, { title: "", body: "" }] })}>
                  + Add a finding
                </Button>
              )}
            </Group>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={c.showMethod} onChange={(e) => setContent({ showMethod: e.target.checked })} />
              Show the amfire FIRM Method block
            </label>
            <Field label="Closing" htmlFor="closing">
              <textarea id="closing" rows={6} value={c.closing} onChange={(e) => setContent({ closing: e.target.value })} className={inputClass} />
            </Field>
            <Field label="WhatsApp button" htmlFor="replyLabel">
              <input id="replyLabel" value={c.replyLabel} onChange={(e) => setContent({ replyLabel: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Their WhatsApp message, already typed" htmlFor="replyBody" optional hint={`Tapping the button opens WhatsApp to ${frame.phone} with this written in, so they only add a time.`}>
              <input id="replyBody" value={c.replyBody ?? ""} onChange={(e) => setContent({ replyBody: e.target.value })} className={inputClass} />
            </Field>
            <Field label="P.S." htmlFor="ps" optional hint="Under your signature. The line most people read.">
              <textarea id="ps" rows={2} value={c.ps ?? ""} onChange={(e) => setContent({ ps: e.target.value })} className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Your name" htmlFor="signName">
                <input id="signName" value={c.signName} onChange={(e) => setContent({ signName: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Your role" htmlFor="signRole">
                <input id="signRole" value={c.signRole} onChange={(e) => setContent({ signRole: e.target.value })} className={inputClass} />
              </Field>
            </div>
            <Field label="Small print" htmlFor="footer" optional>
              <input id="footer" value={c.footer} onChange={(e) => setContent({ footer: e.target.value })} className={inputClass} />
            </Field>
          </div>
        </Card>
      </div>

      <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
        <Card className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <Button type="button" variant="secondary" onClick={() => run(() => saveEmailDraftAction(prospectId, fields))} disabled={pending || !dirty}>
              {dirty ? "Save draft" : "Saved"}
            </Button>
            <div className="ml-auto flex min-w-0 flex-1 flex-wrap items-end justify-end gap-2">
              <label className="grid min-w-[14rem] flex-1 gap-1 text-xs text-muted">
                Send the test to (your second email)
                <input type="email" value={testTo} placeholder="you@example.com" onChange={(e) => setTestTo(e.target.value)} className={cx(inputClass, "!py-2")} />
              </label>
              <Button type="button" onClick={sendTest} disabled={pending || !testTo.trim()}>
                1 · Send test
              </Button>
              <Button type="button" onClick={sendToClient} disabled={pending || !!sendBlocker}>
                2 · Send to client
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted">
            {pending
              ? "Working…"
              : tested && draft?.testSentTo
                ? `Test of this version went to ${draft.testSentTo}. If it looks right on your phone, send it to ${fields.toEmail || "the client"}.`
                : sendBlocker ?? ""}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>
              From <b className="font-medium text-fg">{c.signName && !/amfire/i.test(c.signName) ? `${c.signName.split(" ")[0]} from amfire` : "amfire"}</b> &lt;{fromAddress}&gt; · replies come to {frame.replyTo}
            </span>
            {draft?.testSentAt && (
              <button type="button" className="underline" disabled={pending} onClick={() => run(() => checkEmailDeliveryAction(draft.id))}>
                Check delivery
              </button>
            )}
          </div>
          {message && <Notice tone={message.tone}>{message.text}</Notice>}
        </Card>

        <Card className="!p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-2 text-sm">
            <span className="font-medium">Preview</span>
            <div className="flex gap-1">
              {(["desktop", "phone"] as const).map((w) => (
                <button key={w} type="button" onClick={() => setWidth(w)} className={cx("rounded-full px-3 py-1", width === w ? "bg-fg text-page" : "text-muted")}>
                  {w === "desktop" ? "Computer" : "Phone"}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-[#f6efe6] p-2">
            <Preview html={html} width={width === "phone" ? 380 : 680} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Group({ title, optional, children }: { title: string; optional?: boolean; children: ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-medium">
        {title} {optional && <span className="font-normal text-muted">(optional)</span>}
      </legend>
      {children}
    </fieldset>
  );
}

/** The email exactly as it will be sent, in a sandboxed frame that grows to fit. */
function Preview({ html, width }: { html: string; width: number }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(1600);
  const fit = () => {
    const doc = ref.current?.contentDocument;
    if (doc?.body) setHeight(doc.documentElement.scrollHeight + 8);
  };
  useEffect(fit, [html, width]);
  return (
    <iframe
      ref={ref}
      title="Email preview"
      srcDoc={html}
      onLoad={fit}
      // Links open as ordinary tabs: WhatsApp refuses to load in a tab that inherits the sandbox.
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      className="mx-auto block max-w-full rounded-lg bg-white"
      style={{ width, height, border: 0 }}
    />
  );
}
