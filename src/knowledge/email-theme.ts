// The "Toran" outreach email: ivory paper, a saffron dawn band with a
// lotus-and-vine ornament (like a carved temple door), serif headlines and a
// periwinkle sign-off band. Tables and inline styles only, so it holds up in
// Gmail, Outlook and phone mail apps. Pure functions: the composer's live
// preview and the server's send use the same renderer.

export type EmailContent = {
  /** Shown next to the subject in the inbox. */
  preheader: string;
  /** Small capitals above the headline, e.g. "MADE FOR B.M. CHATRATH & CO." */
  eyebrow: string;
  /** New lines break the headline; *text* is the saffron italic accent. */
  headline: string;
  greeting: string;
  /** Paragraphs separated by a blank line. **bold** and *italic* work. */
  opening: string;
  image: { url: string; alt: string } | null;
  button: { label: string; url: string; note: string } | null;
  findingsTitle: string;
  findings: { title: string; body: string }[];
  /** The four-card amfire FIRM Method block. */
  showMethod: boolean;
  closing: string;
  replyLabel: string;
  /** Typed into their WhatsApp message when they tap the reply button, e.g. "Yes, 15 minutes works. How about…" */
  replyBody?: string;
  /** Shown under the signature: the most-read line of a cold email. */
  ps?: string;
  signName: string;
  signRole: string;
  footer: string;
};

/** Who the email goes to, written into their WhatsApp message so the owner knows who's writing. */
export type EmailRecipient = { business: string; name: string | null; email: string | null };

export type EmailFrame = {
  subject: string;
  replyTo: string;
  phone: string;
  recipient: EmailRecipient;
};

export const EMAIL_ASSETS = {
  logo: "https://www.amfire.in/brand/amfire-logo.png",
  ornament: "https://www.amfire.in/email/ornament.png",
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Escapes, then **bold** and *italic*. */
function inline(s: string, accent = false) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<b style="color:#1c1917;">$1</b>')
    .replace(/\*(.+?)\*/g, accent ? '<span style="color:#e8590c; font-style:italic;">$1</span>' : "<i>$1</i>");
}

const paragraphs = (s: string) =>
  s
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

const safeUrl = (u: string) => (/^(https?:|mailto:|tel:)/i.test(u.trim()) ? u.trim() : "#");

const SANS = "Arial, Helvetica, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

const METHOD = [
  { letter: "F", title: "Find new clients.", body: "A site and a Google presence that bring mandates in, aiming for 3 new business clients a month." },
  { letter: "I", title: "Install your systems.", body: "Document collection, deadlines and follow-ups run for your team, so trainees do audit work, not chasing." },
  { letter: "R", title: "Reduce risk.", body: "Client data, access and backups secured, the way bank audit clients expect." },
  { letter: "M", title: "Modernise with AI.", body: "Your staff trained every quarter, and tools built for the work your firm repeats most." },
];

function methodBlock() {
  const card = (m: (typeof METHOD)[number], pad: string) => `
                  <td class="stack stack-gap" width="50%" valign="top" style="padding:${pad};">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background-color:#ffffff; border-radius:12px;"><tr><td style="padding:16px; font-family:${SANS}; font-size:14px; line-height:21px; color:#57504a;">
                      <span style="font-family:${SERIF}; font-size:22px; color:#e8590c;">${m.letter}</span> <b style="color:#1c1917;">${m.title}</b><br>${m.body}
                    </td></tr></table>
                  </td>`;
  return `
    <tr>
      <td class="px" style="padding:26px 40px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fbf4ea" style="background-color:#fbf4ea; border-radius:16px; border:1px solid #f0e2cd;">
          <tr>
            <td style="padding:24px 24px 8px; font-family:${SANS};">
              <p style="margin:0 0 6px; font-size:12px; letter-spacing:2.5px; color:#c2410c; font-weight:bold;">THE WEBSITE IS ONLY THE FIRST PAGE</p>
              <p style="margin:0 0 18px; font-family:${SERIF}; font-size:21px; line-height:28px; color:#1c1917;">Behind every great firm are four departments the partners shouldn’t have to run. We run them for you. We call it the amfire FIRM Method.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>${card(METHOD[0], "0 6px 12px 8px")}${card(METHOD[1], "0 8px 12px 6px")}</tr>
                <tr>${card(METHOD[2], "0 6px 0 8px")}${card(METHOD[3], "0 8px 0 6px")}</tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function findingsBlock(c: EmailContent) {
  if (!c.findings.length) return "";
  const rows = c.findings
    .map(
      (f, i) => `
          <tr>
            <td width="44" valign="top" style="padding:0 0 16px;"><div style="width:30px; height:30px; line-height:30px; border-radius:50%; background-color:#fff0e6; color:#e8590c; font-family:${SERIF}; font-size:15px; text-align:center;">${i + 1}</div></td>
            <td valign="top" style="padding:3px 0 16px; font-size:15px; line-height:23px; color:#3f3a36;"><b style="color:#1c1917;">${inline(f.title)}</b> ${inline(f.body)}</td>
          </tr>`,
    )
    .join("");
  return `
    <tr><td align="center" style="padding:0 0 4px; font-family:${SERIF}; font-size:14px; color:#d9a066; letter-spacing:10px;">&#9670;&#9671;&#9670;</td></tr>
    <tr>
      <td class="px" style="padding:20px 48px 6px; font-family:${SANS};">
        ${c.findingsTitle ? `<h2 style="margin:0 0 18px; font-family:${SERIF}; font-weight:normal; font-size:24px; line-height:30px; color:#1c1917;">${inline(c.findingsTitle)}</h2>` : ""}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}
        </table>
      </td>
    </tr>`;
}

function pill(href: string, label: string, dark: boolean) {
  const [bg, fg, border, pad] = dark ? ["#1c1917", "#ffffff", "", "14px 26px"] : ["#ffffff", "#1c1917", " border:1px solid #1c1917;", "13px 26px"];
  return `<td align="center" bgcolor="${bg}" style="border-radius:999px; background-color:${bg};${border}"><a href="${esc(href)}" target="_blank" style="display:inline-block; padding:${pad}; font-family:${SANS}; font-size:15px; font-weight:bold; color:${fg}; border-radius:999px; text-decoration:none;">${esc(label)}</a></td>`;
}

/**
 * A wa.me link to amfire. The message opens with who is writing and which email
 * they're answering, so a reply never arrives from an unknown number with no context.
 */
function whatsappUrl(f: EmailFrame, body: string) {
  const r = f.recipient;
  const who = [r.name, r.business].filter(Boolean).join(", ") + (r.email ? ` (${r.email})` : "");
  const header = [who && `From: ${who}`, f.subject && `Re: your email “${f.subject}”`].filter(Boolean).join("\n");
  return `https://wa.me/${f.phone.replace(/\D/g, "")}?text=${encodeURIComponent([header, body].filter(Boolean).join("\n\n"))}`;
}

/** One tap opens WhatsApp to amfire with the yes already written; they only add a time. */
const whatsappReplyUrl = (c: EmailContent, f: EmailFrame) => whatsappUrl(f, c.replyBody?.trim() || "Hi, I got your email.");

/** The full HTML document that goes out. */
export function renderEmailHtml(c: EmailContent, f: EmailFrame) {
  const p = (s: string, last: boolean) => `<p style="margin:0${last ? "" : " 0 16px"};">${inline(s)}</p>`;
  const opening = paragraphs(c.opening);
  const closing = paragraphs(c.closing);
  const phoneDigits = f.phone.replace(/\D/g, "");
  const replyHref = whatsappReplyUrl(c, f);
  const headline = c.headline
    .split("\n")
    .map((l) => inline(l.trim(), true))
    .join("<br>");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(f.subject)}</title>
<style>
  @media (max-width: 620px) {
    .card { width: 100% !important; }
    .px { padding-left: 22px !important; padding-right: 22px !important; }
    .h1 { font-size: 30px !important; line-height: 36px !important; }
    .stack { display: block !important; width: 100% !important; }
    .stack-gap { padding: 0 0 12px 0 !important; }
  }
  a { text-decoration: none; }
</style>
</head>
<body style="margin:0; padding:0; background-color:#f6efe6;">
<div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#f6efe6;">${esc(c.preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f6efe6" style="background-color:#f6efe6;">
<tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background-color:#fffdf9; border-radius:20px; overflow:hidden; border:1px solid #eadfcd;">
    <tr>
      <td align="center" bgcolor="#ffe6d2" style="background-color:#ffe6d2; background-image:linear-gradient(180deg,#ffb48a 0%,#ffe6d2 55%,#fffdf9 100%); padding:34px 24px 6px;">
        <img src="${EMAIL_ASSETS.logo}" width="110" alt="amfire" style="display:block; width:110px; height:auto; border:0; margin:0 auto 22px;">
        <img src="${EMAIL_ASSETS.ornament}" width="210" alt="" style="display:block; width:210px; height:auto; border:0; margin:0 auto;">
      </td>
    </tr>
    <tr>
      <td class="px" align="center" style="padding:14px 48px 6px; font-family:${SANS};">
        ${c.eyebrow ? `<p style="margin:0 0 12px; font-size:12px; letter-spacing:2.5px; color:#c2410c; font-weight:bold;">${esc(c.eyebrow.toUpperCase())}</p>` : ""}
        <h1 class="h1" style="margin:0; font-family:${SERIF}; font-weight:normal; font-size:36px; line-height:42px; color:#1c1917;">${headline}</h1>
      </td>
    </tr>
    <tr>
      <td class="px" style="padding:22px 48px 8px; font-family:${SANS}; font-size:16px; line-height:26px; color:#3f3a36;">
        ${c.greeting ? p(c.greeting, !opening.length) : ""}
        ${opening.map((s, i) => p(s, i === opening.length - 1)).join("\n        ")}
      </td>
    </tr>
    ${
      c.image
        ? `<tr>
      <td class="px" style="padding:22px 32px 8px;">
        ${c.button ? `<a href="${esc(safeUrl(c.button.url))}" target="_blank" style="display:block; border-radius:14px; overflow:hidden;">` : ""}<img src="${esc(safeUrl(c.image.url))}" width="536" alt="${esc(c.image.alt)}" style="display:block; width:100%; max-width:536px; height:auto; border:0; border-radius:14px;">${c.button ? "</a>" : ""}
      </td>
    </tr>`
        : ""
    }
    ${
      c.button
        ? `<tr>
      <td align="center" style="padding:18px 24px 30px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td align="center" bgcolor="#ff5a3c" style="border-radius:999px; background-color:#ff5a3c; background-image:linear-gradient(90deg,#ff453a 0%,#ff8747 100%);">
            <a href="${esc(safeUrl(c.button.url))}" target="_blank" style="display:inline-block; padding:15px 30px; font-family:${SANS}; font-size:16px; font-weight:bold; color:#ffffff; border-radius:999px; text-decoration:none;">${esc(c.button.label)} &rarr;</a>
          </td>
        </tr></table>
        ${c.button.note ? `<p style="margin:10px 0 0; font-family:${SANS}; font-size:13px; color:#8a7f74;">${inline(c.button.note)}</p>` : ""}
      </td>
    </tr>`
        : ""
    }
    ${findingsBlock(c)}
    ${c.showMethod ? methodBlock() : ""}
    <tr>
      <td class="px" style="padding:24px 48px 8px; font-family:${SANS}; font-size:16px; line-height:26px; color:#3f3a36;">
        ${closing.map((s) => `<p style="margin:0 0 16px;">${inline(s)}</p>`).join("\n        ")}
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:6px 24px 34px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${pill(replyHref, c.replyLabel || "Reply to this email", true)}</tr></table>
      </td>
    </tr>
    <tr>
      <td class="px" bgcolor="#eef0fb" style="background-color:#eef0fb; background-image:linear-gradient(180deg,#fffdf9 0%,#eef0fb 40%); padding:26px 48px 28px; font-family:${SANS}; font-size:15px; line-height:23px; color:#3f3a36;">
        <p style="margin:0 0 4px;">Warm regards,</p>
        <p style="margin:0; font-family:${SERIF}; font-size:20px; color:#1c1917;">${esc(c.signName)}</p>
        <p style="margin:2px 0 12px; color:#6b6259;">${esc(c.signRole)}</p>
        <p style="margin:0; font-size:14px;">
          <a href="tel:+${phoneDigits}" style="color:#1c1917; text-decoration:none;">${esc(f.phone)}</a>
          &nbsp;<span style="color:#c9bfd9;">|</span>&nbsp;
          <a href="${esc(whatsappUrl(f, "Hi, I got your email."))}" target="_blank" style="color:#1c1917; text-decoration:none;">WhatsApp</a>
          &nbsp;<span style="color:#c9bfd9;">|</span>&nbsp;
          <a href="https://www.amfire.in" target="_blank" style="color:#e8590c; text-decoration:none;">amfire.in</a>
        </p>
        ${c.ps ? `<p style="margin:18px 0 0; padding-top:14px; border-top:1px solid #dcdff3; font-size:15px; line-height:23px; color:#3f3a36;"><b style="color:#1c1917;">P.S.</b> ${inline(c.ps)}</p>` : ""}
      </td>
    </tr>
  </table>
  ${c.footer ? `<p style="margin:16px 0 0; font-family:${SANS}; font-size:12px; line-height:18px; color:#9a8f84; text-align:center;">${inline(c.footer)}</p>` : ""}
</td></tr>
</table>
</body>
</html>`;
}

/** The plain-text part, for mail apps that don't show HTML and for spam filters. */
export function renderEmailText(c: EmailContent, f: EmailFrame) {
  const plain = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
  const out = [plain(c.headline.replace(/\n/g, " ")), "", c.greeting, "", ...paragraphs(c.opening).flatMap((s) => [plain(s), ""])];
  if (c.button) out.push(`${c.button.label}: ${c.button.url}`, "");
  if (c.findings.length) {
    if (c.findingsTitle) out.push(plain(c.findingsTitle), "");
    c.findings.forEach((x, i) => out.push(`${i + 1}. ${plain(x.title)} ${plain(x.body)}`));
    out.push("");
  }
  if (c.showMethod) {
    out.push("The amfire FIRM Method:");
    METHOD.forEach((m) => out.push(`${m.letter} · ${m.title} ${m.body}`));
    out.push("");
  }
  out.push(...paragraphs(c.closing).flatMap((s) => [plain(s), ""]));
  out.push(`${c.replyLabel || "Message us"} on WhatsApp: ${whatsappReplyUrl(c, f)}`, "");
  out.push("Warm regards,", c.signName, c.signRole, `${f.phone} · ${f.replyTo} · amfire.in`);
  if (c.ps) out.push("", `P.S. ${plain(c.ps)}`);
  if (c.footer) out.push("", plain(c.footer));
  return out.join("\n");
}

/** A first draft for a prospect, to edit before sending. */
export function defaultEmailContent(o: { business: string; contactName?: string | null; demoUrl?: string | null; ownerName: string }): EmailContent {
  const surname = o.contactName?.trim().split(/\s+/).pop();
  return {
    preheader: `Something I made for ${o.business}. Take a look.`,
    eyebrow: `Made for ${o.business}`,
    headline: `A line about them.\nAnd the *gap* you found.`,
    greeting: surname ? `Dear Mr./Ms. ${surname},` : "Hello,",
    opening: "What you noticed about their firm, in two or three sentences.\n\nSo instead of telling you, I built it:",
    image: null,
    button: o.demoUrl ? { label: "Open what I made for you", url: o.demoUrl, note: "" } : null,
    findingsTitle: "What a new client notices today",
    findings: [],
    showMethod: false,
    closing: "The website is only the first step. The rest is what we call the **FIRM Method**, and it’s easier to show than to write.\n\n**Worth 15 minutes next week?**",
    replyLabel: "Yes, book 15 minutes",
    replyBody: "Hi, yes, 15 minutes works. A good time for me is: ",
    ps: "",
    signName: o.ownerName,
    signRole: "Founder, amfire · Build · Operate · Automate",
    footer: "Not relevant? Reply “no” and I won’t write again.",
  };
}
