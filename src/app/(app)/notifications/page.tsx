import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { markAllRead } from "@/actions/notifications";

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="muted">Updates relevant to you.</p>
        </div>
        <form action={markAllRead}>
          <button className="btn-secondary" type="submit">Mark all as read</button>
        </form>
      </div>

      <div className="card">
        {items.length === 0 ? (
          <div className="p-10 text-center muted">No notifications.</div>
        ) : (
          <ul>
            {items.map((n) => (
              <li
                key={n.id}
                className={`px-5 py-4 border-b border-gray-100 last:border-0 ${
                  n.read ? "" : "bg-brand-50/40"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-gray-900">{n.title}</div>
                    {n.body && <div className="text-sm text-gray-600 mt-0.5">{n.body}</div>}
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {!n.read && <span className="chip-brand">New</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
