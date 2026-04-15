import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";

export default async function LogsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  await requireAdmin();
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const pageSize = 50;

  const [total, logs] = await Promise.all([
    prisma.activityLog.count(),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Activity Logs</h1>
        <p className="muted">System-wide audit trail.</p>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>Action</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-10 text-center muted">No activity yet.</td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id}>
                  <td className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="text-gray-700">{l.user?.name ?? "System"}</td>
                  <td><span className="chip-gray">{l.action}</span></td>
                  <td>{l.summary}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          Page {page} of {totalPages} &middot; {total} entries
        </div>
        <div className="flex gap-2">
          {page > 1 && (
            <a className="btn-secondary" href={`/logs?page=${page - 1}`}>Previous</a>
          )}
          {page < totalPages && (
            <a className="btn-secondary" href={`/logs?page=${page + 1}`}>Next</a>
          )}
        </div>
      </div>
    </div>
  );
}
