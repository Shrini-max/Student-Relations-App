"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser, assertCanManageDepartment } from "@/lib/rbac";
import { logActivity, notifyUser } from "@/lib/activity";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const DeptSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().nullable(),
  headId: z.string().optional().nullable(),
});

export async function createDepartment(formData: FormData) {
  const user = await requireAdmin();
  const parsed = DeptSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    headId: (formData.get("headId") as string) || null,
  });

  const dept = await prisma.department.create({
    data: {
      name: parsed.name,
      description: parsed.description || null,
      headId: parsed.headId || null,
    },
  });

  await logActivity({
    userId: user.id,
    action: "CREATE_DEPARTMENT",
    entityType: "Department",
    entityId: dept.id,
    summary: `Created department "${dept.name}"`,
  });
  if (parsed.headId) {
    await notifyUser(parsed.headId, "You were assigned as a department head", `Department: ${dept.name}`);
  }

  revalidatePath("/departments");
  revalidatePath("/admin");
  return dept;
}

export async function updateDepartment(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  await assertCanManageDepartment(user, id);

  const parsed = DeptSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    headId: (formData.get("headId") as string) || null,
  });

  // Only admin can change headId
  const data: any = {
    name: parsed.name,
    description: parsed.description || null,
  };
  if (user.role === "ADMIN") {
    data.headId = parsed.headId || null;
  }

  const dept = await prisma.department.update({ where: { id }, data });

  await logActivity({
    userId: user.id,
    action: "UPDATE_DEPARTMENT",
    entityType: "Department",
    entityId: dept.id,
    summary: `Updated department "${dept.name}"`,
  });

  revalidatePath("/departments");
  revalidatePath(`/departments/${id}`);
  return dept;
}

export async function deleteDepartment(formData: FormData) {
  const user = await requireAdmin();
  const id = String(formData.get("id"));
  const dept = await prisma.department.findUnique({ where: { id } });
  if (!dept) return;
  await prisma.department.delete({ where: { id } });

  await logActivity({
    userId: user.id,
    action: "DELETE_DEPARTMENT",
    entityType: "Department",
    entityId: id,
    summary: `Deleted department "${dept.name}"`,
  });

  revalidatePath("/departments");
}
