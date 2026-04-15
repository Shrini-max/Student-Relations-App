import { requireUser } from "@/lib/rbac";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const headerEl = await Header({ user });
  return (
    <div className="min-h-screen flex">
      <Sidebar role={user.role} userName={user.name} />
      <div className="flex-1 flex flex-col min-w-0">
        {headerEl}
        <main className="flex-1 p-6 max-w-[1400px] w-full">{children}</main>
      </div>
    </div>
  );
}
