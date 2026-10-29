import { proposalPdfResponse } from "@/lib/proposal-pdf";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  return proposalPdfResponse((await ctx.params).id, "hub");
}
