"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Plus } from "lucide-react";

type RoleOpt = { id: string; name: string; scope: string };

export function NewMemberButton({
  teamId,
  roleTypes,
  action,
}: {
  teamId: string;
  roleTypes: RoleOpt[];
  action: (fd: FormData) => Promise<any>;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("teamId", teamId);
      await action(fd);
      setOpen(false);
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      alert(err?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" />
        Add member
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add member">
        <form onSubmit={onSubmit} className="space-y-4">
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
              {roleTypes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.scope === "DEPARTMENT" ? "(dept)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
