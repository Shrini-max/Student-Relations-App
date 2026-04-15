import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { createRoleType, deleteRoleType, updateRoleType } from "@/actions/roles";
import { RolesPanel } from "./RolesPanel";

export default async function RolesPage() {
  await requireAdmin();
  const [roles, departments] = await Promise.all([
    prisma.roleType.findMany({
      include: { department: true, _count: { select: { members: true } } },
      orderBy: [{ scope: "asc" }, { name: "asc" }],
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Role Types</h1>
        <p className="muted">Configure roles that can be assigned to members. Global or department-scoped.</p>
      </div>
      <RolesPanel
        roles={roles.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          scope: r.scope as "GLOBAL" | "DEPARTMENT",
          departmentId: r.departmentId,
          departmentName: r.department?.name ?? null,
          memberCount: r._count.members,
        }))}
        departments={departments.map((d) => ({ id: d.id, name: d.name }))}
        createAction={createRoleType}
        updateAction={updateRoleType}
        deleteAction={deleteRoleType}
      />
    </div>
  );
}
