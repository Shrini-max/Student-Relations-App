"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Pencil, Plus, Trash2 } from "lucide-react";

type Role = {
  id: string;
  name: string;
  description: string | null;
  scope: "GLOBAL" | "DEPARTMENT";
  departmentId: string | null;
  departmentName: string | null;
  memberCount: number;
};
type Dept = { id: string; name: string };

export function RolesPanel({
  roles,
  departments,
  createAction,
  updateAction,
  deleteAction,
}: {
  roles: Role[];
  departments: Dept[];
  createAction: (fd: FormData) => Promise<any>;
  updateAction: (fd: FormData) => Promise<any>;
  deleteAction: (fd: FormData) => Promise<any>;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await createAction(new FormData(e.currentTarget));
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
      await updateAction(fd);
      setEditing(null);
    } catch (err: any) {
      alert(err?.message || "Failed");
    }
  }

  async function onDelete(r: Role) {
    if (!window.confirm(`Delete role "${r.name}"? Members with this role will lose the role.`)) return;
    const fd = new FormData();
    fd.set("id", r.id);
    try {
      await deleteAction(fd);
    } catch (err: any) {
      alert(err?.message || "Failed");
    }
  }

  const global = roles.filter((r) => r.scope === "GLOBAL");
  const byDept = new Map<string, Role[]>();
  for (const r of roles.filter((r) => r.scope === "DEPARTMENT")) {
    const k = r.departmentName || "Unknown";
    if (!byDept.has(k)) byDept.set(k, []);
    byDept.get(k)!.push(r);
  }

  return (
    <>
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4" />
          New role type
        </button>
      </div>

      <div className="card">
        <div className="px-5 py-3 border-b border-gray-100 section-title">Global roles</div>
        {global.length === 0 ? (
          <div className="p-6 muted">No global roles yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th className="text-right">Members</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {global.map((r) => (
                <RoleRow key={r.id} r={r} onEdit={setEditing} onDelete={onDelete} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {Array.from(byDept.entries()).map(([deptName, list]) => (
        <div key={deptName} className="card">
          <div className="px-5 py-3 border-b border-gray-100 section-title">
            {deptName} <span className="text-xs text-gray-500 font-normal">(department-specific)</span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th className="text-right">Members</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <RoleRow key={r.id} r={r} onEdit={setEditing} onDelete={onDelete} />
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <Modal open={creating} onClose={() => setCreating(false)} title="New role type">
        <RoleForm departments={departments} onSubmit={onCreate} submitLabel="Create" />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit role type">
        {editing && (
          <RoleForm
            departments={departments}
            defaults={{
              name: editing.name,
              description: editing.description ?? "",
              scope: editing.scope,
              departmentId: editing.departmentId ?? "",
            }}
            onSubmit={onUpdate}
            submitLabel="Save"
          />
        )}
      </Modal>
    </>
  );
}

function RoleRow({
  r,
  onEdit,
  onDelete,
}: {
  r: Role;
  onEdit: (r: Role) => void;
  onDelete: (r: Role) => void;
}) {
  return (
    <tr>
      <td className="font-medium">{r.name}</td>
      <td className="text-gray-600">{r.description || <span className="text-gray-400">&mdash;</span>}</td>
      <td className="text-right">{r.memberCount}</td>
      <td className="text-right">
        <div className="inline-flex items-center gap-1">
          <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => onEdit(r)}>
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            className="btn-ghost !px-2 !py-1 text-xs text-red-600 hover:bg-red-50"
            onClick={() => onDelete(r)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function RoleForm({
  departments,
  defaults,
  onSubmit,
  submitLabel,
}: {
  departments: Dept[];
  defaults?: { name: string; description: string; scope: "GLOBAL" | "DEPARTMENT"; departmentId: string };
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
}) {
  const [scope, setScope] = useState<"GLOBAL" | "DEPARTMENT">(defaults?.scope ?? "GLOBAL");
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label">Name</label>
        <input name="name" className="input" defaultValue={defaults?.name} required autoFocus />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea name="description" className="input min-h-[70px]" defaultValue={defaults?.description} />
      </div>
      <div>
        <label className="label">Scope</label>
        <select
          name="scope"
          className="input"
          value={scope}
          onChange={(e) => setScope(e.target.value as any)}
        >
          <option value="GLOBAL">Global (all departments)</option>
          <option value="DEPARTMENT">Department-specific</option>
        </select>
      </div>
      {scope === "DEPARTMENT" && (
        <div>
          <label className="label">Department</label>
          <select name="departmentId" className="input" defaultValue={defaults?.departmentId ?? ""} required>
            <option value="">&mdash; Select &mdash;</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button type="submit" className="btn-primary">{submitLabel}</button>
      </div>
    </form>
  );
}
