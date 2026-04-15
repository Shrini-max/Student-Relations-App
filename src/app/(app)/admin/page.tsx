import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { assignDepartmentHead, createUser, deleteUser, updateUser } from "@/actions/users";
import { AdminPanel } from "./AdminPanel";

export default async function AdminPage() {
  await requireAdmin();
  const [users, departments] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: "asc" },
      include: { headsDepartments: { select: { id: true, name: true } } },
    }),
    prisma.department.findMany({
      orderBy: { name: "asc" },
      include: { head: true, _count: { select: { teams: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Admin Panel</h1>
        <p className="muted">Manage users, department heads, and overall structure.</p>
      </div>
      <AdminPanel
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role as any,
          heads: u.headsDepartments.map((d) => d.name),
        }))}
        departments={departments.map((d) => ({
          id: d.id,
          name: d.name,
          headId: d.headId,
          headName: d.head?.name ?? null,
          teamCount: d._count.teams,
        }))}
        createUserAction={createUser}
        updateUserAction={updateUser}
        deleteUserAction={deleteUser}
        assignHeadAction={assignDepartmentHead}
      />
    </div>
  );
}
