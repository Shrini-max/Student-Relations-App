import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Bell } from "lucide-react";
import { SessionUser } from "@/lib/rbac";

export async function Header({ user }: { user: SessionUser }) {
  const unread = await prisma.notification.count({
    where: { userId: user.id, read: false },
  });
  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-5">
      <div className="text-sm text-gray-500">
        Welcome back, <span className="text-gray-900 font-medium">{user.name}</span>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/notifications" className="relative p-2 rounded-lg hover:bg-gray-100">
          <Bell className="w-5 h-5 text-gray-700" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
