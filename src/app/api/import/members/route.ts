import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { assertCanManageDepartment, requireUser } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_ROWS = 5000;

type Row = {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
};

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const form = await req.formData();
    const teamId = String(form.get("teamId") || "");
    const file = form.get("file") as File | null;
    if (!teamId || !file) {
      return NextResponse.json({ error: "teamId and file are required" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB)` },
        { status: 413 }
      );
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { department: true },
    });
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
    await assertCanManageDepartment(user, team.departmentId);

    const text = await file.text();
    const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });

    // Pre-fetch valid roles for this team
    const roles = await prisma.roleType.findMany({
      where: {
        OR: [
          { scope: "GLOBAL" },
          { scope: "DEPARTMENT", departmentId: team.departmentId },
        ],
      },
    });
    const roleByName = new Map(roles.map((r) => [r.name.toLowerCase(), r.id]));

    if (parsed.data.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `Too many rows (max ${MAX_ROWS})` },
        { status: 413 }
      );
    }

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of parsed.data) {
      const name = (row.name || "").trim();
      const email = (row.email || "").trim().toLowerCase();
      const phone = (row.phone || "").trim() || null;
      const roleName = (row.role || "").trim();

      if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        skipped++;
        errors.push(`Skipped invalid row: ${JSON.stringify(row)}`);
        continue;
      }

      let roleTypeId: string | null = null;
      if (roleName) {
        const match = roleByName.get(roleName.toLowerCase());
        if (match) roleTypeId = match;
      }

      const existing = await prisma.member.findFirst({
        where: { teamId, email },
      });
      if (existing) {
        skipped++;
        continue;
      }

      await prisma.member.create({
        data: { name, email, phone, teamId, roleTypeId },
      });
      created++;
    }

    await logActivity({
      userId: user.id,
      action: "IMPORT_MEMBERS",
      entityType: "Team",
      entityId: teamId,
      summary: `Imported ${created} member(s) into "${team.name}" (skipped ${skipped})`,
    });

    return NextResponse.json({ created, skipped, errors });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Import failed" }, { status: 400 });
  }
}
