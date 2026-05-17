import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { createCategory, deleteCategory } from "@/actions/schedule";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Tag, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  await requireAdmin();
  const categories = await prisma.eventCategory.findMany({
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
          <h1 className="page-title">Categories</h1>
          <p className="muted">Manage event categories for Paradox '26.</p>
        </div>
      </div>

      {/* Add category form */}
      <div className="card p-5">
        <h2 className="section-title mb-4">Add Category</h2>
        <form action={createCategory} className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="label">Name</label>
            <input name="name" className="input" placeholder="e.g. Cultural, Technical" required />
          </div>
          <div>
            <label className="label">Color</label>
            <input name="color" type="color" className="h-10 w-16 rounded-lg border border-gray-200 cursor-pointer" defaultValue="#6366f1" />
          </div>
          <button type="submit" className="btn-primary">Add Category</button>
        </form>
      </div>

      {/* Category list */}
      <div className="card overflow-hidden">
        {categories.length === 0 ? (
          <div className="p-8 text-center">
            <Tag className="w-6 h-6 text-gray-300 mx-auto mb-2" />
            <p className="muted">No categories yet.</p>
          </div>
        ) : (
          <table className="table w-full">
            <thead>
              <tr>
                <th>Category</th>
                <th>Events</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td>{c._count.events}</td>
                  <td className="text-right">
                    {c._count.events === 0 && (
                      <form action={deleteCategory}>
                        <input type="hidden" name="id" value={c.id} />
                        <ConfirmButton
                          confirmText={`Delete category "${c.name}"?`}
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
