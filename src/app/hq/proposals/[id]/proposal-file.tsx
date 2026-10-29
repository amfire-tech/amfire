"use client";

import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/forms";
import { Card, CardTitle, Field, inputClass } from "@/components/ui";
import { attachProposalFileAction, deleteProposalAction, removeProposalFileAction } from "../../actions";

/** The owner's own proposal PDF: sent to the client with the proposal. */
export function ProposalFileCard({ proposalId, file }: { proposalId: string; file: { name: string; size: number } | null }) {
  return (
    <Card>
      <CardTitle>Your proposal PDF</CardTitle>
      <p className="text-sm text-muted">
        Made the proposal yourself? Attach it here. The client reads it in their Client Hub next to the price and accepts both together.
      </p>
      {file && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl p-3 ring-1 ring-line">
          <a href={`/hq/proposals/${proposalId}/pdf`} target="_blank" rel="noopener" className="text-sm font-medium hover:underline">
            {file.name} <span className="font-normal text-muted">· {(file.size / 1024 / 1024).toFixed(1)} MB ↗</span>
          </a>
          <form action={removeProposalFileAction.bind(null, proposalId)}>
            <SubmitButton variant="ghost" size="sm" pendingLabel="Removing…">
              Remove
            </SubmitButton>
          </form>
        </div>
      )}
      <ActionForm
        action={attachProposalFileAction.bind(null, proposalId)}
        submitLabel={file ? "Replace PDF" : "Attach PDF"}
        pendingLabel="Uploading…"
        size="sm"
        className="mt-4"
      >
        <Field label="PDF file" htmlFor="file" hint="Up to 4 MB.">
          <input id="file" name="file" type="file" accept="application/pdf,.pdf" required className={inputClass} />
        </Field>
      </ActionForm>
    </Card>
  );
}

/** Drafts can be thrown away; the lead keeps its recommendation, so a new draft is one click. */
export function DeleteDraftButton({ proposalId, leadId }: { proposalId: string; leadId: string }) {
  return (
    <form
      action={deleteProposalAction.bind(null, proposalId, leadId)}
      onSubmit={(e) => {
        if (!window.confirm("Delete this draft proposal? This can't be undone.")) e.preventDefault();
      }}
    >
      <SubmitButton variant="ghost" size="sm" className="w-full" pendingLabel="Deleting…">
        Delete this draft
      </SubmitButton>
    </form>
  );
}
