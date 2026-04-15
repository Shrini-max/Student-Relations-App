"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { createMember, deleteMember, updateMember } from "@/actions/members";

type RoleOpt = { id: string; name: string; scope: string; departmentId: string | null };
type ManageDept = { id: string; name: string; teams: { id: string; name: string }[] };
type Row = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  teamId: string;
  teamName: string;
  departmentId: string;
  departmentName: string;
  roleType: { id: string; name: string } | null;
  canManage: boolean;
};

export function MembersTable({
  members,
  manageableDepartments,
  roleTypes,
  canAdd,
}: {
  members: Row[];
  manageableDepartments: ManageDept[];
  roleTypes: RoleOpt[];
  canAdd: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [, startTransition] = useTransition();

  function rolesFor(departmentId: string) {
    return roleTypes.filter((r) => r.scope === "GLOBAL" || r.departmentId === departmentId);
  }

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await createMember(new FormData(e.currentTarget));
      setAdding(false);
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
      await updateMember(fd);
      setEditing(null);
    } catch (err: any) {
      alert(err?.message || "Failed");
    }
  }

  function onDelete(m: Row) {
    if (!window.confirm(`Remove "${m.name}" from ${m.teamName}?`)) return;
    const fd = new FormData();
    fd.set("id", m.id);
    startTransition(async () => {
      try {
        await deleteMember(fd);
      } catch (err: any) {
        alert(err?.message || "Failed");
      }
    });
  }

  const showActions = members.some((m) => m.canManage);

  return (
    <>
      <div className="card">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="section-title">Results</div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-500">{members.length} found</div>
            {canAdd && (
              <button className="btn-primary !py-1.5 text-xs" onClick={() => setAdding(true)}>
                <Plus className="w-3.5 h-3.5" />
                Add member
              </button>
            )}
          </div>
        </div>
        {members.length === 0 ? (
          <div className="p-10 text-center muted">No members match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Department</th>
                  <th>Team</th>
                  <th>Role</th>
                  {showActions && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td className="font-medium">{m.name}</td>
                    <td className="text-gray-700">{m.email}</td>
                    <td className="text-gray-700">
                      {m.phone || <span className="text-gray-400">&mdash;</span>}
                    </td>
                    <td>
                      <Link
                        href={`/departments/${m.departmentId}`}
                        className="text-gray-700 hover:text-brand-700"
                      >
                        {m.departmentName}
                      </Link>
                    </td>
                    <td>
                      <Link
                        href={`/teams/${m.teamId}`}
                        className="text-gray-700 hover:text-brand-700"
                      >
                        {m.teamName}
                      </Link>
                    </td>
                    <td>
                      {m.roleType ? (
                        <span className="chip-gray">{m.roleType.name}</span>
                      ) : (
                        <span className="text-gray-400">&mdash;</span>
                      )}
                    </td>
                    {showActions && (
                      <td className="text-right">
                        {m.canManage ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              className="btn-ghost !px-2 !py-1 text-xs"
                              onClick={() => setEditing(m)}
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              className="btn-ghost !px-2 !py-1 text-xs text-red-600 hover:bg-red-50"
                              onClick={() => onDelete(m)}
                              title="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">&mdash;</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddMemberModal
        open={adding}
        onClose={() => setAdding(false)}
        departments={manageableDepartments}
        roleTypes={roleTypes}
        onSubmit={onCreate}
      />

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit member">
        {editing && (
          <form onSubmit={onUpdate} className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input name="name" className="input" defaultValue={editing.name} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" className="input" defaultValue={editing.email} required />
            </div>
            <div>
              <label className="label">Phone</label>
              <input name="phone" className="input" defaultValue={editing.phone ?? ""} />
            </div>
            <div>
              <label className="label">Role</label>
              <select name="roleTypeId" className="input" defaultValue={editing.roleType?.id ?? ""}>
                <option value="">&mdash; No role &mdash;</option>
                {rolesFor(editing.departmentId).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.scope === "DEPARTMENT" ? "(dept)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-gray-500">
              Team: {editing.teamName} &middot; Department: {editing.departmentName}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">Save</button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

function AddMemberModal({
  open,
  onClose,
  departments,
  roleTypes,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  departments: ManageDept[];
  roleTypes: RoleOpt[];
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  const firstDept = departments[0];
  const [deptId, setDeptId] = useState(firstDept?.id ?? "");
  const teams = useMemo(
    () => departments.find((d) => d.id === deptId)?.teams ?? [],
    [deptId, departments]
  );
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const roles = useMemo(
    () => roleTypes.filter((r) => r.scope === "GLOBAL" || r.departmentId === deptId),
    [deptId, roleTypes]
  );

  // Reset team when dept changes
  function changeDept(id: string) {
    setDeptId(id);
    const newTeams = departments.find((d) => d.id === id)?.teams ?? [];
    setTeamId(newTeams[0]?.id ?? "");
  }

  return (
    <Modal open={open} onClose={onClose} title="Add member">
      <form onSubmit={onSubmit} className="space-y-4">
        {departments.length > 1 && (
          <div>
            <label className="label">Department</label>
            <select
              className="input"
              value={deptId}
              onChange={(e) => changeDept(e.target.value)}
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="label">Team</label>
          <select
            name="teamId"
            className="input"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            required
          >
            {teams.length === 0 ? (
              <option value="">No teams available in this department</option>
            ) : (
              teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))
            )}
          </select>
        </div>
        <div>
          <label className="label">Name</label>
          <input name="name" className="input" required autoFocus />
        </div>
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" className="input" required />
        </div>
        <div>
          <label className="label">Phone (optional)</label>
          <input name="phone" className="input" />
        </div>
        <div>
          <label className="label">Role</label>
          <select name="roleTypeId" className="input">
            <option value="">&mdash; No role &mdash;</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} {r.scope === "DEPARTMENT" ? "(dept)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={!teamId}>
            Add
          </button>
        </div>
      </form>
    </Modal>
  );
}
