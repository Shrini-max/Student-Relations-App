import { prisma } from "@/lib/prisma";
import { accessibleDepartmentIds, requireUser } from "@/lib/rbac";
import { Building2, Users, ListTree, Tags } from "lucide-react";
import Link from "next/link";
import { DeptHeadDashboard } from "./DeptHeadDashboard";

export default async function DashboardPage() {
  const user = await requireUser();

  if (user.role === "DEPT_HEAD") {
    return <DeptHeadView userId={user.id} userName={user.name} />;
  }

  // Admin / Viewer: broad overview
  const scope = await accessibleDepartmentIds(user);
  const deptFilter = scope === "ALL" ? {} : { id: { in: scope } };
  const teamFilter = scope === "ALL" ? {} : { departmentId: { in: scope } };
  const memberFilter =
    scope === "ALL" ? {} : { team: { departmentId: { in: scope } } };

  const [deptCount, teamCount, memberCount, roleCount, recentActivity, teamBreakdown] =
    await Promise.all([
      prisma.department.count({ where: deptFilter }),
      prisma.team.count({ where: teamFilter }),
      prisma.member.count({ where: memberFilter }),
      prisma.roleType.count(),
      prisma.activityLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { user: true },
      }),
      prisma.department.findMany({
        where: deptFilter,
        include: {
          _count: { select: { teams: true } },
          teams: { include: { _count: { select: { members: true } } } },
        },
        orderBy: { name: "asc" },
      }),
    ]);

  const stats = [
    { label: "Departments", value: deptCount, icon: Building2, href: "/departments" },
    { label: "Teams", value: teamCount, icon: ListTree, href: "/departments" },
    { label: "Members", value: memberCount, icon: Users, href: "/members" },
    { label: "Role Types", value: roleCount, icon: Tags, href: user.role === "ADMIN" ? "/roles" : "/members" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="muted">Overview of departments, teams, and members.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">{s.label}</div>
                  <div className="mt-1 text-3xl font-semibold">{s.value}</div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5 lg:col-span-2">
          <div className="section-title mb-3">Departments overview</div>
          {teamBreakdown.length === 0 ? (
            <div className="muted">No departments yet.</div>
          ) : (
            <div className="space-y-3">
              {teamBreakdown.map((d) => {
                const memberTotal = d.teams.reduce((s, t) => s + t._count.members, 0);
                return (
                  <Link
                    key={d.id}
                    href={`/departments/${d.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
                  >
                    <div>
                      <div className="font-medium">{d.name}</div>
                      <div className="text-xs text-gray-500">
                        {d._count.teams} team{d._count.teams === 1 ? "" : "s"} &middot; {memberTotal} member
                        {memberTotal === 1 ? "" : "s"}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">View</div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="section-title mb-3">Recent activity</div>
          {recentActivity.length === 0 ? (
            <div className="muted">No activity yet.</div>
          ) : (
            <ul className="space-y-3">
              {recentActivity.map((a) => (
                <li key={a.id} className="text-sm">
                  <div className="text-gray-800">{a.summary}</div>
                  <div className="text-xs text-gray-400">
                    {a.user?.name ?? "System"} &middot; {new Date(a.createdAt).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

async function DeptHeadView({ userId, userName }: { userId: string; userName: string }) {
  const departments = await prisma.department.findMany({
    where: { headId: userId },
    include: {
      teams: {
        orderBy: { name: "asc" },
        include: {
          _count: { select: { members: true } },
          members: {
            include: { roleType: true },
            orderBy: { name: "asc" },
            take: 5,
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const recentActivity = await prisma.activityLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <DeptHeadDashboard
      userName={userName}
      departments={departments.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        teams: d.teams.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          memberCount: t._count.members,
          previewMembers: t.members.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            role: m.roleType?.name ?? null,
          })),
        })),
      }))}
      recentActivity={recentActivity.map((a) => ({
        id: a.id,
        summary: a.summary,
        action: a.action,
        createdAt: a.createdAt.toISOString(),
      }))}
    />
  );
}
