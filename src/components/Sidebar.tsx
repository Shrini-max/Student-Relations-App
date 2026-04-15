"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCog,
  ShieldCheck,
  Tags,
  FileClock,
  Bell,
} from "lucide-react";

type Role = "ADMIN" | "DEPT_HEAD" | "VIEWER";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "DEPT_HEAD", "VIEWER"] as Role[] },
  { href: "/departments", label: "Departments", icon: Building2, roles: ["ADMIN", "VIEWER"] as Role[] },
  { href: "/members", label: "Members", icon: Users, roles: ["ADMIN", "DEPT_HEAD", "VIEWER"] as Role[] },
  { href: "/roles", label: "Role Types", icon: Tags, roles: ["ADMIN"] as Role[] },
  { href: "/admin", label: "Admin Panel", icon: ShieldCheck, roles: ["ADMIN"] as Role[] },
  { href: "/logs", label: "Activity Logs", icon: FileClock, roles: ["ADMIN"] as Role[] },
  { href: "/notifications", label: "Notifications", icon: Bell, roles: ["ADMIN", "DEPT_HEAD", "VIEWER"] as Role[] },
];

export function Sidebar({ role, userName }: { role: Role; userName: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:flex-col w-64 border-r border-gray-200 bg-white">
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 text-white font-bold flex items-center justify-center">
            P
          </div>
          <div>
            <div className="font-semibold text-sm">Paradox</div>
            <div className="text-[11px] text-gray-500">Team Management</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-1">
        {nav
          .filter((item) => item.roles.includes(role))
          .map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-brand-50 text-brand-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
      </nav>
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-medium">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{userName}</div>
            <div className="text-[11px] text-gray-500">{prettyRole(role)}</div>
          </div>
          <Link href="/api/auth/signout" className="text-xs text-gray-500 hover:text-gray-900">
            Sign out
          </Link>
        </div>
      </div>
    </aside>
  );
}

function prettyRole(role: Role): string {
  if (role === "ADMIN") return "Admin";
  if (role === "DEPT_HEAD") return "Department Head";
  return "Viewer";
}
