"use server";

import { prisma } from "@/lib/prisma";
import { requireUser, assertCanManageDepartment } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const MemberSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional().nullable(),
  teamId: z.string().min(1),
  roleTypeId: z.string().optional().nullable(),
});

async function assertValidRoleForTeam(roleTypeId: string | null, teamId: string) {
  if (!roleTypeId) return;
  const role = await prisma.roleType.findUnique({ where: { id: roleTypeId } });
  if (!role) throw new Error("Invalid role type");
  if (role.scope === "GLOBAL") return;
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new Error("Team not found");
  if (role.departmentId !== team.departmentId) {
    throw new Error("Role type is not valid for this department");
  }
}

export async function createMember(formData: FormData) {
  const user = await requireUser();
  const parsed = MemberSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || null,
    teamId: formData.get("teamId"),
    roleTypeId: (formData.get("roleTypeId") as string) || null,
  });

  const team = await prisma.team.findUnique({ where: { id: parsed.teamId } });
  if (!team) throw new Error("Team not found");
  await assertCanManageDepartment(user, team.departmentId);
  await assertValidRoleForTeam(parsed.roleTypeId || null, parsed.teamId);

  const member = await prisma.member.create({
    data: {
      name: parsed.name,
      email: parsed.email.toLowerCase(),
      phone: parsed.phone || null,
      teamId: parsed.teamId,
      roleTypeId: parsed.roleTypeId || null,
    },
  });
  await logActivity({
    userId: user.id,
    action: "CREATE_MEMBER",
    entityType: "Member",
    entityId: member.id,
    summary: `Added member "${member.name}" to team`,
  });

  revalidatePath(`/teams/${parsed.teamId}`);
  revalidatePath("/members");
  revalidatePath("/dashboard");
  return member;
}

export async function updateMember(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const existing = await prisma.member.findUnique({
    where: { id },
    include: { team: true },
  });
  if (!existing) throw new Error("Member not found");
  await assertCanManageDepartment(user, existing.team.departmentId);

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = (formData.get("phone") as string) || null;
  const roleTypeId = (formData.get("roleTypeId") as string) || null;
  if (!name || !email) throw new Error("Name and email required");
  await assertValidRoleForTeam(roleTypeId, existing.teamId);

  const updated = await prisma.member.update({
    where: { id },
    data: { name, email, phone: phone || null, roleTypeId: roleTypeId || null },
  });
  await logActivity({
    userId: user.id,
    action: "UPDATE_MEMBER",
    entityType: "Member",
    entityId: id,
    summary: `Updated member "${updated.name}"`,
  });

  revalidatePath(`/teams/${existing.teamId}`);
  revalidatePath("/members");
  return updated;
}

export async function deleteMember(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const existing = await prisma.member.findUnique({
    where: { id },
    include: { team: true },
  });
  if (!existing) return;
  await assertCanManageDepartment(user, existing.team.departmentId);

  await prisma.member.delete({ where: { id } });
  await logActivity({
    userId: user.id,
    action: "DELETE_MEMBER",
    entityType: "Member",
    entityId: id,
    summary: `Removed member "${existing.name}"`,
  });

  revalidatePath(`/teams/${existing.teamId}`);
  revalidatePath("/members");
}

export async function assignMemberRole(memberId: string, roleTypeId: string | null) {
  const user = await requireUser();
  const existing = await prisma.member.findUnique({
    where: { id: memberId },
    include: { team: true },
  });
  if (!existing) throw new Error("Member not found");
  await assertCanManageDepartment(user, existing.team.departmentId);
  await assertValidRoleForTeam(roleTypeId, existing.teamId);

  await prisma.member.update({
    where: { id: memberId },
    data: { roleTypeId: roleTypeId || null },
  });
  await logActivity({
    userId: user.id,
    action: "ASSIGN_ROLE",
    entityType: "Member",
    entityId: memberId,
    summary: `Updated role for "${existing.name}"`,
  });

  revalidatePath(`/teams/${existing.teamId}`);
  revalidatePath("/members");
}
