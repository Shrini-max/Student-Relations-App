import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "DEPT_HEAD" | "VIEWER";
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as SessionUser;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new Error("Forbidden: admin only");
  }
  return user;
}

/** Departments the user can access. Admin/Viewer: all. Dept head: only their dept IDs. */
export async function accessibleDepartmentIds(user: SessionUser): Promise<"ALL" | string[]> {
  if (user.role === "ADMIN" || user.role === "VIEWER") return "ALL";
  const depts = await prisma.department.findMany({
    where: { headId: user.id },
    select: { id: true },
  });
  return depts.map((d) => d.id);
}

export async function canManageDepartment(user: SessionUser, departmentId: string): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  if (user.role === "VIEWER") return false;
  const d = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { headId: true },
  });
  return d?.headId === user.id;
}

export async function assertCanManageDepartment(user: SessionUser, departmentId: string) {
  if (!(await canManageDepartment(user, departmentId))) {
    throw new Error("Forbidden: no access to this department");
  }
}

export async function canViewDepartment(user: SessionUser, departmentId: string): Promise<boolean> {
  if (user.role === "ADMIN" || user.role === "VIEWER") return true;
  return canManageDepartment(user, departmentId);
}

export async function assertCanViewDepartment(user: SessionUser, departmentId: string) {
  if (!(await canViewDepartment(user, departmentId))) {
    throw new Error("Forbidden: cannot view this department");
  }
}
