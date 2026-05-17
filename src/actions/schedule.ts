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

// --- CSV Import ---
export interface ScheduleImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export async function importScheduleFromCSV(formData: FormData): Promise<ScheduleImportResult> {
  const user = await requireAdmin();
  const file = formData.get("csvFile") as File | null;
  if (!file || file.size === 0) return { imported: 0, skipped: 0, errors: ["No file provided."] };

  const Papa = (await import("papaparse")).default;
  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors.length > 0) {
    return { imported: 0, skipped: 0, errors: parsed.errors.slice(0, 5).map((e) => `Row ${e.row}: ${e.message}`) };
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [i, row] of parsed.data.entries()) {
    const rowNum = i + 2;
    const title = row["Title"]?.trim();
    const dayRaw = parseInt(row["Day"] ?? "");
    const startTime = row["Start Time"]?.trim();
    const endTime = row["End Time"]?.trim();
    const venueName = row["Venue"]?.trim();
    const categoryName = row["Category"]?.trim();
    const description = row["Description"]?.trim() || null;

    if (!title) { skipped++; continue; }
    if (isNaN(dayRaw) || dayRaw < 1 || dayRaw > 6) { errors.push(`Row ${rowNum}: Invalid day "${row["Day"]}" (must be 1–6).`); continue; }
    if (!startTime || !/^\d{2}:\d{2}$/.test(startTime)) { errors.push(`Row ${rowNum}: Invalid start time "${startTime}" (use HH:MM).`); continue; }
    if (!endTime || !/^\d{2}:\d{2}$/.test(endTime)) { errors.push(`Row ${rowNum}: Invalid end time "${endTime}" (use HH:MM).`); continue; }
    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) { errors.push(`Row ${rowNum}: Start time must be before end time.`); continue; }
    if (!venueName) { errors.push(`Row ${rowNum}: Venue is required.`); continue; }
    if (!categoryName) { errors.push(`Row ${rowNum}: Category is required.`); continue; }

    try {
      // Auto-create venue and category if they don't exist
      const venue = await prisma.venue.upsert({
        where: { name: venueName },
        update: {},
        create: { name: venueName },
      });
      const category = await prisma.eventCategory.upsert({
        where: { name: categoryName },
        update: {},
        create: { name: categoryName, color: "#6366f1" },
      });

      const conflict = await checkConflict(dayRaw, startTime, endTime, venue.id);
      if (conflict) { errors.push(`Row ${rowNum} "${title}": ${conflict}`); continue; }

      await prisma.event.create({
        data: { title, description, day: dayRaw, startTime, endTime, venueId: venue.id, categoryId: category.id },
      });
      imported++;
    } catch (e) {
      errors.push(`Row ${rowNum}: ${(e as Error).message}`);
    }
  }

  await logActivity({
    userId: user.id,
    action: "IMPORT_SCHEDULE",
    entityType: "Event",
    summary: `Imported ${imported} events from CSV`,
  });

  revalidatePath("/schedule");
  return { imported, skipped, errors };
}
