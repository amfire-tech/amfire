import Link from "next/link";
import { EmptyState, PageHeader, ProgressBar, StatusBadge, Table, formatDate } from "@/components/ui";
import { getDb } from "@/db";
import { requireStaffActor } from "@/lib/session";
import { listProjects } from "@/server/hq";

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const actor = await requireStaffActor();
  const rows = await listProjects(await getDb(), actor);
  return (
    <div className="space-y-6">
      <PageHeader title="Projects" description="Created automatically when a client accepts a proposal." />
      {rows.length === 0 ? (
        <EmptyState title="No projects yet.">They appear here as soon as a client accepts a proposal.</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Project</th>
              <th>Status</th>
              <th className="w-56">Progress</th>
              <th>Current milestone</th>
              <th>Started</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ project, org, progress }) => (
              <tr key={project.id}>
                <td>
                  <Link href={`/hq/projects/${project.id}`} className="font-medium underline-offset-4 hover:underline">
                    {project.name}
                  </Link>
                  <div className="text-xs text-muted">{org.name}</div>
                </td>
                <td>
                  <StatusBadge status={progress.blocked.length ? "blocked" : project.status} />
                </td>
                <td>
                  <ProgressBar value={progress.percent} label={`${project.name} progress`} />
                  <div className="mt-1 text-xs text-muted">
                    {progress.done} of {progress.total} milestones approved
                  </div>
                </td>
                <td>{progress.current?.title ?? "—"}</td>
                <td>{formatDate(project.startedAt)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
