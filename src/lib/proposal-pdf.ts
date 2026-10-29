import { getDb } from "@/db";
import { isUuid } from "@/lib/ids";
import { getActor } from "@/lib/session";
import { getProposalFile } from "@/server/proposals";

/** Streams a proposal's attached PDF to staff, or to the client it was sent to. */
export async function proposalPdfResponse(id: string): Promise<Response> {
  if (!isUuid(id)) return new Response("Not found", { status: 404 });
  const file = await getProposalFile(await getDb(), await getActor(), id);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.content), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${file.name.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
