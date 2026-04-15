import { prisma } from "./prisma";

export async function logActivity(params: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        summary: params.summary,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (err) {
    console.error("Failed to log activity", err);
  }
}

export async function notifyUser(userId: string, title: string, body?: string) {
  await prisma.notification.create({
    data: { userId, title, body: body ?? null },
  });
}
