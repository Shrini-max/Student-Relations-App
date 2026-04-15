"use server";

import { prisma } from "@/lib/prisma";
import { requireUser, assertCanManageDepartment } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const TeamSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().nullable(),
  departmentId: z.string().min(1),
});

export async function createTeam(formData: FormData) {
  const user = await requireUser();
  const parsed = TeamSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    departmentId: formData.get("departmentId"),
  });
  await assertCanManageDepartment(user, parsed.departmentId);

  const team = await prisma.team.create({
    data: {
      name: parsed.name,
      description: parsed.description || null,
      departmentId: parsed.departmentId,
    },
  });
  await logActivity({
    userId: user.id,
    action: "CREATE_TEAM",
    entityType: "Team",
    entityId: team.id,
    summary: `Created team "${team.name}"`,
  });

  revalidatePath(`/departments/${parsed.departmentId}`);
  revalidatePath("/dashboard");
  return team;
}

export async function updateTeam(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const team = await prisma.team.findUnique({ where: { id } });
  if (!team) throw new Error("Team not found");
  await assertCanManageDepartment(user, team.departmentId);

  const name = String(formData.get("name") || "").trim();
  const description = (formData.get("description") as string) || null;
  if (!name) throw new Error("Name required");

  const updated = await prisma.team.update({
    where: { id },
    data: { name, description: description || null },
  });

  await logActivity({
    userId: user.id,
    action: "UPDATE_TEAM",
    entityType: "Team",
    entityId: id,
    summary: `Updated team "${updated.name}"`,
  });

  revalidatePath(`/departments/${team.departmentId}`);
  revalidatePath(`/teams/${id}`);
  return updated;
}

export async function deleteTeam(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const team = await prisma.team.findUnique({ where: { id } });
  if (!team) return;
  await assertCanManageDepartment(user, team.departmentId);

  await prisma.team.delete({ where: { id } });
  await logActivity({
    userId: user.id,
    action: "DELETE_TEAM",
    entityType: "Team",
    entityId: id,
    summary: `Deleted team "${team.name}"`,
  });

  revalidatePath(`/departments/${team.departmentId}`);
}
