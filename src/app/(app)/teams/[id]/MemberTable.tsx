"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { assignMemberRole, deleteMember, updateMember } from "@/actions/members";

type RoleOpt = { id: string; name: string; scope: string };
type M = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  roleType: { id: string; name: string } | null;
};

export function MemberTable({
  members,
  roleTypes,
  canManage,
}: {
  members: M[];
  roleTypes: RoleOpt[];
  canManage: boolean;
}) {
  const [editing, setEditing] = useState<M | null>(null);
  const [pending, startTransition] = useTransition();

  function onRoleChange(memberId: string, roleTypeId: string) {
    startTransition(async () => {
      try {
        await assignMemberRole(memberId, roleTypeId || null);
      } catch (err: any) {
        alert(err?.message || "Failed to update role");
      }
    });
  }

  function onDelete(m: M) {
    if (!window.confirm(`Remove "${m.name}" from this team?`)) return;
    const fd = new FormData();
    fd.set("id", m.id);
    startTransition(async () => {
      try {
        await deleteMember(fd);
      } catch (err: any) {
        alert(err?.message || "Failed to delete");
      }
    });
  }

  return (
    <>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Role</th>
            {canManage && <th className="text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
              <td className="font-medium">{m.name}</td>
              <td className="text-gray-700">{m.email}</td>
              <td className="text-gray-700">{m.phone || <span className="text-gray-400">&mdash;</span>}</td>
              <td>
                {canManage ? (
                  <select
                    className="input !py-1 max-w-[200px]"
                    value={m.roleType?.id || ""}
                    disabled={pending}
                    onChange={(e) => onRoleChange(m.id, e.target.value)}
                  >
                    <option value="">&mdash; No role &mdash;</option>
                    {roleTypes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.scope === "DEPARTMENT" ? "(dept)" : ""}
                      </option>
                    ))}
                  </select>
                ) : m.roleType ? (
                  <span className="chip-gray">{m.roleType.name}</span>
                ) : (
                  <span className="text-gray-400">&mdash;</span>
                )}
              </td>
              {canManage && (
                <td className="text-right">
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
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit member">
        {editing && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              fd.set("id", editing.id);
              try {
                await updateMember(fd);
                setEditing(null);
              } catch (err: any) {
                alert(err?.message || "Failed to save");
              }
            }}
            className="space-y-4"
          >
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
                {roleTypes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.scope === "DEPARTMENT" ? "(dept)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
