import { redirect } from "next/navigation";

// The OpticVyu proposal is a static page (public/for/opticvyu/proposal.html). This route keeps
// the link short, /for/opticvyu?p=<token>, and passes the personal token through so the visit
// is tied to the person it was sent to.
export default async function OpticVyuProposal({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const p = typeof q.p === "string" && /^[a-z0-9]{6,32}$/.test(q.p) ? `?p=${q.p}` : "";
  redirect(`/for/opticvyu/proposal.html${p}`);
}
