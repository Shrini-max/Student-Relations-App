"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const RoleSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().nullable(),
  scope: z.enum(["GLOBAL", "DEPARTMENT"]),
  departmentId: z.string().optional().nullable(),
});

export async function createRoleType(formData: FormData) {
  const user = await requireAdmin();
  const parsed = RoleSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    scope: formData.get("scope"),
    departmentId: (formData.get("departmentId") as string) || null,
  });

  if (parsed.scope === "DEPARTMENT" && !parsed.departmentId) {
    throw new Error("Department is required when scope is DEPARTMENT");
  }
  if (parsed.scope === "GLOBAL") parsed.departmentId = null;

  const existing = await prisma.roleType.findFirst({
    where: { name: parsed.name, departmentId: parsed.departmentId },
  });
  if (existing) throw new Error("Role type with this name already exists in that scope");

  const role = await prisma.roleType.create({
    data: {
      name: parsed.name,
      description: parsed.description || null,
      scope: parsed.scope,
      departmentId: parsed.departmentId || null,
    },
  });

  await logActivity({
    userId: user.id,
    action: "CREATE_ROLETYPE",
    entityType: "RoleType",
    entityId: role.id,
    summary: `Created role type "${role.name}" (${role.scope.toLowerCase()})`,
  });

  revalidatePath("/roles");
  return role;
}

export async function updateRoleType(formData: FormData) {
  const user = await requireAdmin();
  const id = String(formData.get("id"));
  const parsed = RoleSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    scope: formData.get("scope"),
    departmentId: (formData.get("departmentId") as string) || null,
  });

  if (parsed.scope === "DEPARTMENT" && !parsed.departmentId) {
    throw new Error("Department is required when scope is DEPARTMENT");
  }
  if (parsed.scope === "GLOBAL") parsed.departmentId = null;

  const role = await prisma.roleType.update({
    where: { id },
    data: {
      name: parsed.name,
      description: parsed.description || null,
      scope: parsed.scope,
      departmentId: parsed.departmentId || null,
    },
  });
  await logActivity({
    userId: user.id,
    action: "UPDATE_ROLETYPE",
    entityType: "RoleType",
    entityId: id,
    summary: `Updated role type "${role.name}"`,
  });

  revalidatePath("/roles");
  return role;
}

export async function deleteRoleType(formData: FormData) {
  const user = await requireAdmin();
  const id = String(formData.get("id"));
  const role = await prisma.roleType.findUnique({ where: { id } });
  if (!role) return;
  await prisma.roleType.delete({ where: { id } });
  await logActivity({
    userId: user.id,
    action: "DELETE_ROLETYPE",
    entityType: "RoleType",
    entityId: id,
    summary: `Deleted role type "${role.name}"`,
  });
  revalidatePath("/roles");
}
