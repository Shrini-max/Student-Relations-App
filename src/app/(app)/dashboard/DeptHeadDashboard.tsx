"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import {
  Building2,
  ChevronRight,
  ListTree,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { createTeam, deleteTeam, updateTeam } from "@/actions/teams";

type MemberPreview = { id: string; name: string; email: string; role: string | null };
type Team = {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  previewMembers: MemberPreview[];
};
type Dept = {
  id: string;
  name: string;
  description: string | null;
  teams: Team[];
};
type Log = { id: string; summary: string; action: string; createdAt: string };

export function DeptHeadDashboard({
  userName,
  departments,
  recentActivity,
}: {
  userName: string;
  departments: Dept[];
  recentActivity: Log[];
}) {
  const router = useRouter();
  const [newTeamFor, setNewTeamFor] = useState<string | null>(null);
  const [editTeam, setEditTeam] = useState<{ id: string; name: string; description: string | null } | null>(null);
  const [, startTransition] = useTransition();

  async function submitCreateTeam(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newTeamFor) return;
    const fd = new FormData(e.currentTarget);
    fd.set("departmentId", newTeamFor);
    try {
      await createTeam(fd);
      setNewTeamFor(null);
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Failed");
    }
  }

  async function submitEditTeam(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editTeam) return;
    const fd = new FormData(e.currentTarget);
    fd.set("id", editTeam.id);
    try {
      await updateTeam(fd);
      setEditTeam(null);
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Failed");
    }
  }

  function onDeleteTeam(t: Team) {
    if (!window.confirm(`Delete team "${t.name}" and all ${t.memberCount} member(s)?`)) return;
    const fd = new FormData();
    fd.set("id", t.id);
    startTransition(async () => {
      try {
        await deleteTeam(fd);
        router.refresh();
      } catch (err: any) {
        alert(err?.message || "Failed");
      }
    });
  }

  if (departments.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Welcome, {userName}</h1>
          <p className="muted">You are not assigned as head of any department yet.</p>
        </div>
        <div className="card p-10 text-center">
          <div className="muted">Contact an admin to be assigned to a department.</div>
        </div>
      </div>
    );
  }

  const totalTeams = departments.reduce((s, d) => s + d.teams.length, 0);
  const totalMembers = departments.reduce(
    (s, d) => s + d.teams.reduce((a, t) => a + t.memberCount, 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">
            {departments.length === 1 ? departments[0].name : "Your departments"}
          </h1>
          <p className="muted">
            {departments.length === 1
              ? departments[0].description || "Manage your teams and members."
              : `You head ${departments.length} departments.`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<Building2 className="w-5 h-5" />}
          label={departments.length === 1 ? "Department" : "Departments"}
          value={departments.length}
        />
        <StatCard icon={<ListTree className="w-5 h-5" />} label="Teams" value={totalTeams} />
        <StatCard icon={<Users className="w-5 h-5" />} label="Members" value={totalMembers} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {departments.map((d) => (
            <div key={d.id} className="card">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <div>
                  <div className="section-title">Teams in {d.name}</div>
                  <div className="text-xs text-gray-500">{d.teams.length} total</div>
                </div>
                <button className="btn-primary" onClick={() => setNewTeamFor(d.id)}>
                  <Plus className="w-4 h-4" />
                  New team
                </button>
              </div>
              {d.teams.length === 0 ? (
                <div className="p-10 text-center muted">
                  No teams yet. Click &ldquo;New team&rdquo; to get started.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {d.teams.map((t) => (
                    <li key={t.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/teams/${t.id}`}
                              className="font-medium text-gray-900 hover:text-brand-700"
                            >
                              {t.name}
                            </Link>
                            <span className="chip-gray">
                              {t.memberCount} member{t.memberCount === 1 ? "" : "s"}
                            </span>
                          </div>
                          {t.description && (
                            <div className="text-sm text-gray-600 mt-0.5 line-clamp-1">
                              {t.description}
                            </div>
                          )}
                          {t.previewMembers.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {t.previewMembers.map((m) => (
                                <span
                                  key={m.id}
                                  className="chip-gray"
                                  title={`${m.email}${m.role ? " · " + m.role : ""}`}
                                >
                                  {m.name}
                                </span>
                              ))}
                              {t.memberCount > t.previewMembers.length && (
                                <span className="chip-gray">
                                  +{t.memberCount - t.previewMembers.length} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Link
                            href={`/teams/${t.id}`}
                            className="btn-secondary !px-3 !py-1.5 text-xs"
                            title="Manage members"
                          >
                            <Users className="w-3.5 h-3.5" />
                            Members
                          </Link>
                          <button
                            className="btn-ghost !px-2 !py-1.5 text-xs"
                            onClick={() =>
                              setEditTeam({ id: t.id, name: t.name, description: t.description })
                            }
                            title="Edit team"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="btn-ghost !px-2 !py-1.5 text-xs text-red-600 hover:bg-red-50"
                            onClick={() => onDeleteTeam(t)}
                            title="Delete team"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <div className="section-title mb-3">Your recent activity</div>
            {recentActivity.length === 0 ? (
              <div className="muted">You haven&apos;t made any changes yet.</div>
            ) : (
              <ul className="space-y-3">
                {recentActivity.map((a) => (
                  <li key={a.id} className="text-sm">
                    <div className="text-gray-800">{a.summary}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(a.createdAt).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-5">
            <div className="section-title mb-3">Quick links</div>
            <ul className="space-y-1">
              {departments.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/departments/${d.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    <span>Open {d.name}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/members"
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 text-sm"
                >
                  <span>Search members</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <Modal open={!!newTeamFor} onClose={() => setNewTeamFor(null)} title="Create team">
        <form onSubmit={submitCreateTeam} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input name="name" className="input" required autoFocus />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea name="description" className="input min-h-[80px]" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setNewTeamFor(null)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">Create</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editTeam} onClose={() => setEditTeam(null)} title="Edit team">
        {editTeam && (
          <form onSubmit={submitEditTeam} className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input name="name" className="input" defaultValue={editTeam.name} required />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                name="description"
                className="input min-h-[80px]"
                defaultValue={editTeam.description ?? ""}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setEditTeam(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">Save</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
          <div className="mt-1 text-3xl font-semibold">{value}</div>
        </div>
        <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}
