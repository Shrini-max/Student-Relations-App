"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { Pencil, Plus, Trash2 } from "lucide-react";

type U = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "DEPT_HEAD" | "VIEWER";
  heads: string[];
};
type D = {
  id: string;
  name: string;
  headId: string | null;
  headName: string | null;
  teamCount: number;
};

export function AdminPanel({
  users,
  departments,
  createUserAction,
  updateUserAction,
  deleteUserAction,
  assignHeadAction,
}: {
  users: U[];
  departments: D[];
  createUserAction: (fd: FormData) => Promise<any>;
  updateUserAction: (fd: FormData) => Promise<any>;
  deleteUserAction: (fd: FormData) => Promise<any>;
  assignHeadAction: (fd: FormData) => Promise<any>;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<U | null>(null);
  const [, startTransition] = useTransition();

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await createUserAction(new FormData(e.currentTarget));
      setCreating(false);
    } catch (err: any) {
      alert(err?.message || "Failed");
    }
  }
  async function onUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    fd.set("id", editing.id);
    try {
      await updateUserAction(fd);
      setEditing(null);
    } catch (err: any) {
      alert(err?.message || "Failed");
    }
  }
  async function onDelete(u: U) {
    if (!window.confirm(`Delete user "${u.name}"?`)) return;
    const fd = new FormData();
    fd.set("id", u.id);
    try {
      await deleteUserAction(fd);
    } catch (err: any) {
      alert(err?.message || "Failed");
    }
  }

  function onHeadChange(departmentId: string, userId: string) {
    const fd = new FormData();
    fd.set("departmentId", departmentId);
    fd.set("userId", userId);
    startTransition(async () => {
      try {
        await assignHeadAction(fd);
      } catch (err: any) {
        alert(err?.message || "Failed");
      }
    });
  }

  const headCandidates = users.filter((u) => u.role === "ADMIN" || u.role === "DEPT_HEAD");

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="section-title">Department heads</div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Teams</th>
              <th>Head</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d.id}>
                <td className="font-medium">{d.name}</td>
                <td>{d.teamCount}</td>
                <td>
                  <select
                    className="input !py-1 max-w-xs"
                    value={d.headId ?? ""}
                    onChange={(e) => onHeadChange(d.id, e.target.value)}
                  >
                    <option value="">&mdash; Unassigned &mdash;</option>
                    {headCandidates.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email}) &middot; {u.role === "ADMIN" ? "Admin" : "Dept Head"}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="section-title">Users</div>
          <button className="btn-primary" onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4" />
            New user
          </button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Heads</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium">{u.name}</td>
                <td className="text-gray-700">{u.email}</td>
                <td>
                  <span className={u.role === "ADMIN" ? "chip-brand" : u.role === "DEPT_HEAD" ? "chip-amber" : "chip-gray"}>
                    {u.role === "ADMIN" ? "Admin" : u.role === "DEPT_HEAD" ? "Dept Head" : "Viewer"}
                  </span>
                </td>
                <td className="text-xs text-gray-600">
                  {u.heads.length ? u.heads.join(", ") : <span className="text-gray-400">&mdash;</span>}
                </td>
                <td className="text-right">
                  <div className="inline-flex items-center gap-1">
                    <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setEditing(u)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="btn-ghost !px-2 !py-1 text-xs text-red-600 hover:bg-red-50"
                      onClick={() => onDelete(u)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="New user">
        <form onSubmit={onCreate} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input name="name" className="input" required autoFocus />
          </div>
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" className="input" required />
          </div>
          <div>
            <label className="label">Role</label>
            <select name="role" className="input" defaultValue="DEPT_HEAD">
              <option value="ADMIN">Admin</option>
              <option value="DEPT_HEAD">Department Head</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>
          <div>
            <label className="label">Password</label>
            <input name="password" type="password" minLength={6} className="input" required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="submit" className="btn-primary">Create</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit user">
        {editing && (
          <form onSubmit={onUpdate} className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input name="name" className="input" defaultValue={editing.name} required />
            </div>
            <div>
              <label className="label">Email (read-only)</label>
              <input className="input" value={editing.email} readOnly disabled />
            </div>
            <div>
              <label className="label">Role</label>
              <select name="role" className="input" defaultValue={editing.role}>
                <option value="ADMIN">Admin</option>
                <option value="DEPT_HEAD">Department Head</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>
            <div>
              <label className="label">New password (leave blank to keep)</label>
              <input name="password" type="password" className="input" minLength={6} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="submit" className="btn-primary">Save</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
