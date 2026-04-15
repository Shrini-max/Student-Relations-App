import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canManageDepartment, canViewDepartment, requireUser } from "@/lib/rbac";
import { createMember } from "@/actions/members";
import { MemberTable } from "./MemberTable";
import { NewMemberButton } from "./NewMemberButton";
import { CsvTools } from "./CsvTools";

export default async function TeamPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const team = await prisma.team.findUnique({
    where: { id: params.id },
    include: { department: true },
  });
  if (!team) notFound();
  if (!(await canViewDepartment(user, team.departmentId))) notFound();
  const canManage = await canManageDepartment(user, team.departmentId);

  const [members, roleTypes] = await Promise.all([
    prisma.member.findMany({
      where: { teamId: team.id },
      include: { roleType: true },
      orderBy: { name: "asc" },
    }),
    prisma.roleType.findMany({
      where: {
        OR: [
          { scope: "GLOBAL" },
          { scope: "DEPARTMENT", departmentId: team.departmentId },
        ],
      },
      orderBy: [{ scope: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-6">
      <nav className="text-sm text-gray-500">
        <Link href="/departments" className="hover:text-gray-900">Departments</Link>
        <span className="mx-2">/</span>
        <Link href={`/departments/${team.departmentId}`} className="hover:text-gray-900">
          {team.department.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{team.name}</span>
      </nav>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{team.name}</h1>
          <p className="muted max-w-2xl">{team.description || "No description."}</p>
        </div>
        <div className="flex items-center gap-2">
          <CsvTools teamId={team.id} canImport={canManage} />
          {canManage && (
            <NewMemberButton
              teamId={team.id}
              roleTypes={roleTypes.map((r) => ({ id: r.id, name: r.name, scope: r.scope }))}
              action={createMember}
            />
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="section-title">Members</div>
          <div className="text-xs text-gray-500">{members.length} total</div>
        </div>
        {members.length === 0 ? (
          <div className="p-10 text-center muted">No members yet.</div>
        ) : (
          <MemberTable
            members={members.map((m) => ({
              id: m.id,
              name: m.name,
              email: m.email,
              phone: m.phone,
              roleType: m.roleType ? { id: m.roleType.id, name: m.roleType.name } : null,
            }))}
            roleTypes={roleTypes.map((r) => ({ id: r.id, name: r.name, scope: r.scope }))}
            canManage={canManage}
          />
        )}
      </div>
    </div>
  );
}
