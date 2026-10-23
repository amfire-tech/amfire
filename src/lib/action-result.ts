import * as z from "zod";
import { AccessDenied } from "@/server/access";
import { ProjectError } from "@/server/projects";
import { ProposalError } from "@/server/proposals";

export type ActionState = { error?: string; ok?: string; code?: string } | undefined;

/** Converts expected domain errors into a message the user can act on. */
export function toActionError(err: unknown): ActionState {
  if (err instanceof ProposalError) return { error: err.message, code: err.code };
  if (err instanceof AccessDenied || err instanceof ProjectError) return { error: err.message };
  if (err instanceof z.ZodError) return { error: err.issues[0]?.message ?? "Please check the form." };
  console.error(err);
  return { error: "Something went wrong — please try again, or refresh to see the latest state." };
}
