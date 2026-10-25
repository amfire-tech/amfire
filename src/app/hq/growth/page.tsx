import { ActionForm } from "@/components/action-form";
import { Money, StatTile } from "@/components/hq";
import { Card, CardTitle, EmptyState, Field, PageHeader, Table, formatDate, inputClass } from "@/components/ui";
import { getDb } from "@/db";
import { sourceLabel } from "@/lib/attribution";
import { requireStaffActor } from "@/lib/session";
import { getGrowth, trackedLink } from "@/server/growth";
import { createPostAction, draftInvestorUpdateAction } from "../actions";

export const metadata = { title: "Growth" };

export default async function GrowthPage() {
  const actor = await requireStaffActor();
  const g = await getGrowth(await getDb(), actor);
  const linkedin = g.channels.find((c) => c.source === "linkedin");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Growth"
        description="Where leads and money come from, and which posts work. The Growth agent drafts a LinkedIn post when you finish work for a client."
        actions={<ActionForm action={draftInvestorUpdateAction} submitLabel="Draft investor update" size="sm" />}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Leads, last 30 days">{g.totalLeads30}</StatTile>
        <StatTile label="From LinkedIn, 90 days" hint={linkedin ? `${linkedin.won} won` : undefined}>
          {linkedin?.leads90 ?? 0}
        </StatTile>
        <StatTile label="Tracked posts" hint="Clicks on your tracked links">
          {g.posts.reduce((s, p) => s + p.post.clicks, 0)}
        </StatTile>
      </div>

      <Card>
        <CardTitle>Channels, last 90 days</CardTitle>
        {g.channels.length === 0 ? (
          <EmptyState title="No leads in the last 90 days." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Leads (30 days)</th>
                <th>Leads (90 days)</th>
                <th>Won</th>
                <th>Collected from them</th>
              </tr>
            </thead>
            <tbody>
              {g.channels.map((c) => (
                <tr key={c.source}>
                  <td className="font-medium">{sourceLabel(c.source)}</td>
                  <td>{c.leads30}</td>
                  <td>{c.leads90}</td>
                  <td>{c.won}</td>
                  <td>
                    <Money amounts={c.revenue} empty="—" />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <CardTitle>Posts and tracked links</CardTitle>
        <p className="-mt-2 mb-4 text-sm text-muted">
          Before you post on LinkedIn, create a tracked link here and use it in the post. Every click and booking is then credited to that post.
        </p>
        <ActionForm action={createPostAction} submitLabel="Create tracked link" inline>
          <Field label="Post name" htmlFor="post-title">
            <input id="post-title" name="title" required className={`${inputClass} sm:!w-64`} placeholder="Dealer order app case study" />
          </Field>
          <Field label="Post link" htmlFor="post-url" optional>
            <input id="post-url" name="postUrl" type="url" className={`${inputClass} sm:!w-64`} placeholder="https://www.linkedin.com/posts/…" />
          </Field>
          <Field label="Send visitors to" htmlFor="post-target">
            <input id="post-target" name="targetPath" defaultValue="/start" className={`${inputClass} sm:!w-36`} />
          </Field>
        </ActionForm>
        {g.posts.length > 0 && (
          <div className="mt-5">
            <Table>
              <thead>
                <tr>
                  <th>Post</th>
                  <th>Tracked link</th>
                  <th>Clicks</th>
                  <th>Leads</th>
                  <th>Won</th>
                </tr>
              </thead>
              <tbody>
                {g.posts.map(({ post, leads, won }) => (
                  <tr key={post.id}>
                    <td>
                      {post.postUrl ? (
                        <a href={post.postUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline-offset-4 hover:underline">
                          {post.title}
                        </a>
                      ) : (
                        <span className="font-medium">{post.title}</span>
                      )}
                      <div className="text-xs text-muted">{formatDate(post.createdAt)}</div>
                    </td>
                    <td>
                      <code className="rounded bg-subtle px-1.5 py-0.5 text-xs select-all">{trackedLink(post)}</code>
                    </td>
                    <td>{post.clicks}</td>
                    <td>{leads}</td>
                    <td>{won}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
