import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { accessibleDepartmentIds, requireUser } from "@/lib/rbac";
import { createDepartment, deleteDepartment } from "@/actions/departments";
import { ConfirmButton } from "@/components/ConfirmButton";
import { NewDepartmentButton } from "./NewDepartmentButton";

export default async function DepartmentsPage() {
  const user = await requireUser();
  const scope = await accessibleDepartmentIds(user);
  const where = scope === "ALL" ? {} : { id: { in: scope } };

  const [departments, candidates] = await Promise.all([
    prisma.department.findMany({
      where,
      include: {
        head: true,
        _count: { select: { teams: true } },
        teams: { select: { _count: { select: { members: true } } } },
      },
      orderBy: { name: "asc" },
    }),
    user.role === "ADMIN"
      ? prisma.user.findMany({
          where: { role: { in: ["ADMIN", "DEPT_HEAD"] } },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="muted">
            {user.role === "ADMIN"
              ? "Create departments and assign department heads."
              : user.role === "DEPT_HEAD"
                ? "Departments you manage."
                : "All departments."}
          </p>
        </div>
        {user.role === "ADMIN" && (
          <NewDepartmentButton
            candidates={candidates.map((c) => ({ id: c.id, name: c.name, email: c.email, role: c.role as any }))}
            action={createDepartment}
          />
        )}
      </div>

      {departments.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="muted">No departments yet.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((d) => {
            const memberTotal = d.teams.reduce((s, t) => s + t._count.members, 0);
            return (
              <div key={d.id} className="card p-5 flex flex-col">
                <div className="flex items-start justify-between">
                  <div>
                    <Link href={`/departments/${d.id}`} className="font-semibold text-gray-900 hover:text-brand-700">
                      {d.name}
                    </Link>
                    <div className="text-xs text-gray-500 mt-1">
                      Head: {d.head ? d.head.name : <span className="italic">unassigned</span>}
                    </div>
                  </div>
                  <div className="chip-brand">{d._count.teams} team{d._count.teams === 1 ? "" : "s"}</div>
                </div>
                {d.description && (
                  <p className="text-sm text-gray-600 mt-3 line-clamp-2">{d.description}</p>
                )}
                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <span>{memberTotal} member{memberTotal === 1 ? "" : "s"}</span>
                  <div className="flex items-center gap-2">
                    <Link href={`/departments/${d.id}`} className="btn-ghost !px-2 !py-1 text-xs">
                      Open
                    </Link>
                    {user.role === "ADMIN" && (
                      <form action={deleteDepartment}>
                        <input type="hidden" name="id" value={d.id} />
                        <ConfirmButton
                          confirmText={`Delete department "${d.name}"? This removes all its teams and members.`}
                          className="btn-ghost !px-2 !py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </ConfirmButton>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
