import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { ScheduleClient } from "./ScheduleClient";

export const dynamic = "force-dynamic";

const FEST_DAYS = [
  { day: 1, label: "Day 1", date: "Jun 9" },
  { day: 2, label: "Day 2", date: "Jun 10" },
  { day: 3, label: "Day 3", date: "Jun 11" },
  { day: 4, label: "Day 4", date: "Jun 12" },
  { day: 5, label: "Day 5", date: "Jun 13" },
  { day: 6, label: "Day 6", date: "Jun 14" },
];

export default async function SchedulePage() {
  const user = await requireUser();

  const [events, venues, categories] = await Promise.all([
    prisma.event.findMany({
      include: { venue: true, category: true },
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
    }),
    prisma.venue.findMany({ orderBy: { name: "asc" } }),
    prisma.eventCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <ScheduleClient
      events={events.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        day: e.day,
        startTime: e.startTime,
        endTime: e.endTime,
        venueId: e.venueId,
        venueName: e.venue.name,
        categoryId: e.categoryId,
        categoryName: e.category.name,
        categoryColor: e.category.color,
      }))}
      venues={venues.map((v) => ({ id: v.id, name: v.name, capacity: v.capacity }))}
      categories={categories.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
      festDays={FEST_DAYS}
      canEdit={user.role !== "VIEWER"}
      isAdmin={user.role === "ADMIN"}
    />
  );
}
