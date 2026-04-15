"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { logActivity, notifyUser } from "@/lib/activity";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

const UserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  role: z.enum(["ADMIN", "DEPT_HEAD", "VIEWER"]),
  password: z.string().min(6).max(200).optional().nullable(),
});

export async function createUser(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = UserSchema.parse({
    email: String(formData.get("email") || "").toLowerCase(),
    name: formData.get("name"),
    role: formData.get("role"),
    password: formData.get("password") || null,
  });
  if (!parsed.password) throw new Error("Password is required");

  const existing = await prisma.user.findUnique({ where: { email: parsed.email } });
  if (existing) throw new Error("A user with that email already exists");

  const user = await prisma.user.create({
    data: {
      email: parsed.email,
      name: parsed.name,
      role: parsed.role,
      passwordHash: await bcrypt.hash(parsed.password, 10),
    },
  });
  await logActivity({
    userId: admin.id,
    action: "CREATE_USER",
    entityType: "User",
    entityId: user.id,
    summary: `Created user "${user.name}" (${user.role})`,
  });

  revalidatePath("/admin");
  return user;
}

export async function updateUser(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const role = String(formData.get("role") || "") as "ADMIN" | "DEPT_HEAD" | "VIEWER";
  const password = (formData.get("password") as string) || null;

  if (!name) throw new Error("Name required");
  if (!["ADMIN", "DEPT_HEAD", "VIEWER"].includes(role)) throw new Error("Invalid role");

  const data: any = { name, role };
  if (password) {
    if (password.length < 6) throw new Error("Password must be at least 6 characters");
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  const user = await prisma.user.update({ where: { id }, data });
  await logActivity({
    userId: admin.id,
    action: "UPDATE_USER",
    entityType: "User",
    entityId: id,
    summary: `Updated user "${user.name}"`,
  });

  revalidatePath("/admin");
  return user;
}

export async function deleteUser(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  if (id === admin.id) throw new Error("You cannot delete yourself");
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return;
  await prisma.user.delete({ where: { id } });
  await logActivity({
    userId: admin.id,
    action: "DELETE_USER",
    entityType: "User",
    entityId: id,
    summary: `Deleted user "${user.name}"`,
  });
  revalidatePath("/admin");
}

export async function assignDepartmentHead(formData: FormData) {
  const admin = await requireAdmin();
  const departmentId = String(formData.get("departmentId"));
  const userId = (formData.get("userId") as string) || null;

  const dept = await prisma.department.update({
    where: { id: departmentId },
    data: { headId: userId || null },
  });
  await logActivity({
    userId: admin.id,
    action: "ASSIGN_DEPT_HEAD",
    entityType: "Department",
    entityId: departmentId,
    summary: userId
      ? `Assigned department head for "${dept.name}"`
      : `Removed department head for "${dept.name}"`,
  });
  if (userId) {
    await notifyUser(userId, "You were assigned as a department head", `Department: ${dept.name}`);
  }

  revalidatePath("/admin");
  revalidatePath("/departments");
}
