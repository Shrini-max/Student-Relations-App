"use server";

import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const EventSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  day: z.coerce.number().int().min(1).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  venueId: z.string().min(1),
  categoryId: z.string().min(1),
});

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

async function checkConflict(day: number, startTime: string, endTime: string, venueId: string, excludeId?: string) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const events = await prisma.event.findMany({
    where: { day, venueId, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true, title: true, startTime: true, endTime: true },
  });
  for (const e of events) {
    const eStart = timeToMinutes(e.startTime);
    const eEnd = timeToMinutes(e.endTime);
    if (start < eEnd && end > eStart) {
      return `Venue conflict with "${e.title}" (${e.startTime}–${e.endTime})`;
    }
  }
  return null;
}

export async function createEvent(formData: FormData): Promise<{ error?: string }> {
  const user = await requireUser();
  if (user.role === "VIEWER") return { error: "Viewers cannot create events." };

  const parsed = EventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || null,
    day: formData.get("day"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    venueId: formData.get("venueId"),
    categoryId: formData.get("categoryId"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { day, startTime, endTime, venueId } = parsed.data;
  if (timeToMinutes(startTime) >= timeToMinutes(endTime))
    return { error: "Start time must be before end time." };

  const conflict = await checkConflict(day, startTime, endTime, venueId);
  if (conflict) return { error: conflict };

  const event = await prisma.event.create({ data: parsed.data });
  await logActivity({
    userId: user.id,
    action: "CREATE_EVENT",
    entityType: "Event",
    entityId: event.id,
    summary: `Created event "${event.title}" on Day ${event.day}`,
  });
  revalidatePath("/schedule");
  return {};
}

export async function updateEvent(formData: FormData): Promise<{ error?: string }> {
  const user = await requireUser();
  if (user.role === "VIEWER") return { error: "Viewers cannot edit events." };

  const id = String(formData.get("id"));
  const parsed = EventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || null,
    day: formData.get("day"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    venueId: formData.get("venueId"),
    categoryId: formData.get("categoryId"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { day, startTime, endTime, venueId } = parsed.data;
  if (timeToMinutes(startTime) >= timeToMinutes(endTime))
    return { error: "Start time must be before end time." };

  const conflict = await checkConflict(day, startTime, endTime, venueId, id);
  if (conflict) return { error: conflict };

  const event = await prisma.event.update({ where: { id }, data: parsed.data });
  await logActivity({
    userId: user.id,
    action: "UPDATE_EVENT",
    entityType: "Event",
    entityId: event.id,
    summary: `Updated event "${event.title}"`,
  });
  revalidatePath("/schedule");
  return {};
}

export async function deleteEvent(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (user.role === "VIEWER") return;
  const id = String(formData.get("id"));
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return;
  await prisma.event.delete({ where: { id } });
  await logActivity({
    userId: user.id,
    action: "DELETE_EVENT",
    entityType: "Event",
    entityId: id,
    summary: `Deleted event "${event.title}"`,
  });
  revalidatePath("/schedule");
}

// --- Venues ---
export async function createVenue(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const name = String(formData.get("name")).trim();
  const capacity = formData.get("capacity") ? Number(formData.get("capacity")) : null;
  if (!name) return { error: "Name is required." };
  try {
    await prisma.venue.create({ data: { name, capacity } });
  } catch {
    return { error: "A venue with that name already exists." };
  }
  revalidatePath("/schedule");
  revalidatePath("/schedule/venues");
  return {};
}

export async function deleteVenue(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const count = await prisma.event.count({ where: { venueId: id } });
  if (count > 0) return { error: "Cannot delete a venue that has events." };
  await prisma.venue.delete({ where: { id } });
  revalidatePath("/schedule/venues");
  return {};
}

// --- Categories ---
export async function createCategory(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const name = String(formData.get("name")).trim();
  const color = String(formData.get("color") || "#6366f1");
  if (!name) return { error: "Name is required." };
  try {
    await prisma.eventCategory.create({ data: { name, color } });
  } catch {
    return { error: "A category with that name already exists." };
  }
  revalidatePath("/schedule");
  revalidatePath("/schedule/categories");
  return {};
}

export async function deleteCategory(formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const count = await prisma.event.count({ where: { categoryId: id } });
  if (count > 0) return { error: "Cannot delete a category that has events." };
  await prisma.eventCategory.delete({ where: { id } });
  revalidatePath("/schedule/categories");
  return {};
}
