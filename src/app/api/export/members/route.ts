import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { accessibleDepartmentIds, requireUser } from "@/lib/rbac";

export const dynamic = "force-dynamic";

// Prefix cells starting with =,+,-,@,\t,\r so spreadsheet apps don't execute formulas.
// See https://owasp.org/www-community/attacks/CSV_Injection
function safeCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const scope = await accessibleDepartmentIds(user);
  const url = req.nextUrl;
  const q = (url.searchParams.get("q") || "").trim();
  const departmentId = url.searchParams.get("departmentId") || "";
  const teamId = url.searchParams.get("teamId") || "";
  const roleTypeId = url.searchParams.get("roleTypeId") || "";

  const where: any = { AND: [] as any[] };
  if (scope !== "ALL") where.AND.push({ team: { departmentId: { in: scope } } });
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
    include: { team: { include: { department: true } }, roleType: true },
    orderBy: { name: "asc" },
  });

  const rows = members.map((m) => ({
    name: safeCell(m.name),
    email: safeCell(m.email),
    phone: safeCell(m.phone ?? ""),
    department: safeCell(m.team.department.name),
    team: safeCell(m.team.name),
    role: safeCell(m.roleType?.name ?? ""),
  }));

  const csv = Papa.unparse(rows, { columns: ["name", "email", "phone", "department", "team", "role"] });
  const filename = `paradox-members-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
