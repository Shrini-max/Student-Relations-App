import { prisma } from "@/lib/prisma";
import { accessibleDepartmentIds, requireUser } from "@/lib/rbac";
import { MembersFilters } from "./MembersFilters";
import { MembersTable } from "./MembersTable";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: { q?: string; departmentId?: string; teamId?: string; roleTypeId?: string };
}) {
  const user = await requireUser();
  const scope = await accessibleDepartmentIds(user);

  const q = (searchParams.q || "").trim();
  const departmentId = searchParams.departmentId || "";
  const teamId = searchParams.teamId || "";
  const roleTypeId = searchParams.roleTypeId || "";

  const baseDeptFilter: any = scope === "ALL" ? {} : { id: { in: scope } };

  // Manageable departments: admin can manage all; dept head can manage only their own
  const manageableDepts =
    user.role === "ADMIN"
      ? await prisma.department.findMany({
          orderBy: { name: "asc" },
          include: { teams: { orderBy: { name: "asc" } } },
        })
      : user.role === "DEPT_HEAD"
        ? await prisma.department.findMany({
            where: { headId: user.id },
            orderBy: { name: "asc" },
            include: { teams: { orderBy: { name: "asc" } } },
          })
        : [];
  const manageableDeptIds = new Set(manageableDepts.map((d) => d.id));

  const [departments, roleTypes] = await Promise.all([
    prisma.department.findMany({
      where: baseDeptFilter,
      orderBy: { name: "asc" },
      include: { teams: { orderBy: { name: "asc" } } },
    }),
    prisma.roleType.findMany({ orderBy: [{ scope: "asc" }, { name: "asc" }] }),
  ]);

  const where: any = { AND: [] as any[] };
  if (scope !== "ALL") {
    where.AND.push({ team: { departmentId: { in: scope } } });
  }
  if (departmentId) where.AND.push({ team: { departmentId } });
  if (teamId) where.AND.push({ teamId });
  if (roleTypeId) where.AND.push({ roleTypeId });
  if (q) {
    where.AND.push({
      OR: [
        { name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
      ],
    });
  }
  if (where.AND.length === 0) delete where.AND;

  const members = await prisma.member.findMany({
    where,
    include: {
      team: { include: { department: true } },
      roleType: true,
    },
    orderBy: { name: "asc" },
    take: 500,
  });

  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  if (departmentId) exportParams.set("departmentId", departmentId);
  if (teamId) exportParams.set("teamId", teamId);
  if (roleTypeId) exportParams.set("roleTypeId", roleTypeId);

  const canAdd = manageableDepts.length > 0 && manageableDepts.some((d) => d.teams.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="muted">
            {user.role === "VIEWER"
              ? "Search and filter members across all teams."
              : "Search, filter, and manage members across teams you can access."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a className="btn-secondary" href={`/api/export/members?${exportParams.toString()}`}>
            Export CSV
          </a>
        </div>
      </div>

      <MembersFilters
        departments={departments.map((d) => ({
          id: d.id,
          name: d.name,
          teams: d.teams.map((t) => ({ id: t.id, name: t.name })),
        }))}
        roleTypes={roleTypes.map((r) => ({ id: r.id, name: r.name, scope: r.scope, departmentId: r.departmentId }))}
        initial={{ q, departmentId, teamId, roleTypeId }}
      />

      <MembersTable
        members={members.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          phone: m.phone,
          teamId: m.teamId,
          teamName: m.team.name,
          departmentId: m.team.departmentId,
          departmentName: m.team.department.name,
          roleType: m.roleType ? { id: m.roleType.id, name: m.roleType.name } : null,
          canManage: manageableDeptIds.has(m.team.departmentId),
        }))}
        manageableDepartments={manageableDepts.map((d) => ({
          id: d.id,
          name: d.name,
          teams: d.teams.map((t) => ({ id: t.id, name: t.name })),
        }))}
        roleTypes={roleTypes.map((r) => ({
          id: r.id,
          name: r.name,
          scope: r.scope,
          departmentId: r.departmentId,
        }))}
        canAdd={canAdd}
      />
    </div>
  );
}
