import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canManageDepartment, canViewDepartment, requireUser } from "@/lib/rbac";
import { createTeam, deleteTeam } from "@/actions/teams";
import { ConfirmButton } from "@/components/ConfirmButton";
import { NewTeamButton } from "./NewTeamButton";
import { EditDepartmentButton } from "./EditDepartmentButton";
import { updateDepartment } from "@/actions/departments";

export default async function DepartmentDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!(await canViewDepartment(user, params.id))) notFound();
  const canManage = await canManageDepartment(user, params.id);

  const dept = await prisma.department.findUnique({
    where: { id: params.id },
    include: {
      head: true,
      teams: {
        include: { _count: { select: { members: true } } },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!dept) notFound();

  const [candidates] = await Promise.all([
    user.role === "ADMIN"
      ? prisma.user.findMany({
          where: { role: { in: ["ADMIN", "DEPT_HEAD"] } },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <nav className="text-sm text-gray-500">
        <Link href="/departments" className="hover:text-gray-900">Departments</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{dept.name}</span>
      </nav>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{dept.name}</h1>
          <p className="muted max-w-2xl">{dept.description || "No description."}</p>
          <div className="mt-2 text-xs text-gray-500">
            Head: <span className="text-gray-800">{dept.head?.name ?? "Unassigned"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <EditDepartmentButton
              department={{ id: dept.id, name: dept.name, description: dept.description, headId: dept.headId }}
              candidates={candidates.map((c) => ({ id: c.id, name: c.name, email: c.email }))}
              isAdmin={user.role === "ADMIN"}
              action={updateDepartment}
            />
          )}
          {canManage && <NewTeamButton departmentId={dept.id} action={createTeam} />}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="section-title">Teams</div>
          <div className="text-xs text-gray-500">{dept.teams.length} total</div>
        </div>
        {dept.teams.length === 0 ? (
          <div className="p-10 text-center muted">No teams yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Description</th>
                <th className="text-right">Members</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dept.teams.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link href={`/teams/${t.id}`} className="font-medium text-gray-900 hover:text-brand-700">
                      {t.name}
                    </Link>
                  </td>
                  <td className="text-gray-600">{t.description || <span className="text-gray-400">&mdash;</span>}</td>
                  <td className="text-right">{t._count.members}</td>
                  <td className="text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link href={`/teams/${t.id}`} className="btn-ghost !px-2 !py-1 text-xs">
                        Open
                      </Link>
                      {canManage && (
                        <form action={deleteTeam}>
                          <input type="hidden" name="id" value={t.id} />
                          <ConfirmButton
                            confirmText={`Delete team "${t.name}" and all its members?`}
                            className="btn-ghost !px-2 !py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </ConfirmButton>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
