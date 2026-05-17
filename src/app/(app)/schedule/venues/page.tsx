import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { createVenue, deleteVenue } from "@/actions/schedule";
import { ConfirmButton } from "@/components/ConfirmButton";
import { MapPin, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function VenuesPage() {
  await requireAdmin();
  const venues = await prisma.venue.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { events: true } } },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/schedule" className="btn-ghost !p-1.5">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="page-title">Venues</h1>
          <p className="muted">Manage event venues for Paradox '26.</p>
        </div>
      </div>

      {/* Add venue form */}
      <div className="card p-5">
        <h2 className="section-title mb-4">Add Venue</h2>
        <form action={createVenue} className="flex gap-3">
          <input name="name" className="input flex-1" placeholder="Venue name" required />
          <input name="capacity" type="number" className="input w-32" placeholder="Capacity" min={1} />
          <button type="submit" className="btn-primary whitespace-nowrap">Add Venue</button>
        </form>
      </div>

      {/* Venue list */}
      <div className="card overflow-hidden">
        {venues.length === 0 ? (
          <div className="p-8 text-center">
            <MapPin className="w-6 h-6 text-gray-300 mx-auto mb-2" />
            <p className="muted">No venues yet.</p>
          </div>
        ) : (
          <table className="table w-full">
            <thead>
              <tr>
                <th>Venue</th>
                <th>Capacity</th>
                <th>Events</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {venues.map((v) => (
                <tr key={v.id}>
                  <td className="font-medium">{v.name}</td>
                  <td>{v.capacity ?? "—"}</td>
                  <td>{v._count.events}</td>
                  <td className="text-right">
                    {v._count.events === 0 && (
                      <form action={deleteVenue}>
                        <input type="hidden" name="id" value={v.id} />
                        <ConfirmButton
                          confirmText={`Delete venue "${v.name}"?`}
                          className="btn-ghost !px-2 !py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </ConfirmButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
