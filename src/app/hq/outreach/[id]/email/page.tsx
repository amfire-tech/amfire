import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice, PageHeader } from "@/components/ui";
import { getDb } from "@/db";
import { formatIst } from "@/knowledge/outreach";
import { requireStaffActor } from "@/lib/session";
import { getEmailComposer } from "@/server/outreach-emails";
import { EmailComposer } from "./composer";

export const metadata = { title: "Email" };

export default async function EmailPage({ params }: PageProps<"/hq/outreach/[id]/email">) {
  const actor = await requireStaffActor();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const composer = await getEmailComposer(await getDb(), actor, id);
  if (!composer) notFound();
  const { prospect: p, draft, recipients, lastSent, lastTestTo, emailReady, frame } = composer;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href={`/hq/outreach/${p.id}`} className="hover:underline">
            ← {p.name}
          </Link>
        }
        title="Email"
        description="Edit it, send yourself a test, then send it to the client. The client button unlocks once a test of the latest version has gone out."
      />
      {p.doNotContact && <Notice tone="error">This prospect asked not to be contacted.</Notice>}
      {!emailReady && <Notice tone="error">Email sending isn&apos;t set up on this server, so tests and sends will fail. It works on amfire.in.</Notice>}
      {lastSent && (
        <Notice tone="success">
          Last email sent {formatIst(lastSent.sentAt)} to {lastSent.toEmail}: “{lastSent.subject}”. This is a new draft.
        </Notice>
      )}
      <EmailComposer
        prospectId={p.id}
        recipients={recipients}
        frame={frame}
        initial={{
          emailId: draft.id,
          toEmail: draft.toEmail ?? "",
          cc: draft.cc ?? "",
          subject: draft.subject,
          content: draft.content,
        }}
        initialState={
          draft.id
            ? { id: draft.id, version: draft.version, testedVersion: draft.testedVersion, testSentTo: draft.testSentTo, testSentAt: draft.testSentAt?.toISOString() ?? null }
            : null
        }
        lastTestTo={lastTestTo}
      />
    </div>
  );
}
