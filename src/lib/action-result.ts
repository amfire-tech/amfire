import * as z from "zod";
import { AccessDenied } from "@/server/access";
import { CrmError } from "@/server/crm";
import { OutreachError } from "@/server/outreach";
import { MoneyError } from "@/server/money";
import { ProjectError } from "@/server/projects";
import { ProposalError } from "@/server/proposals";

/** `link` is an address to open next, e.g. WhatsApp with an approved message typed in. */
export type ActionState = { error?: string; ok?: string; code?: string; link?: string } | undefined;

/** Converts expected domain errors into a message the user can act on. */
export function toActionError(err: unknown): ActionState {
  if (err instanceof ProposalError) return { error: err.message, code: err.code };
  if (err instanceof AccessDenied || err instanceof ProjectError || err instanceof MoneyError || err instanceof CrmError || err instanceof OutreachError) {
    return { error: err.message };
  }
  if (err instanceof z.ZodError) return { error: err.issues[0]?.message ?? "Please check the form." };
  console.error(err);
  return { error: "Something went wrong — please try again, or refresh to see the latest state." };
}
