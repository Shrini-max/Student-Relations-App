"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Pencil } from "lucide-react";

type UserOpt = { id: string; name: string; email: string };

export function EditDepartmentButton({
  department,
  candidates,
  isAdmin,
  action,
}: {
  department: { id: string; name: string; description: string | null; headId: string | null };
  candidates: UserOpt[];
  isAdmin: boolean;
  action: (fd: FormData) => Promise<any>;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("id", department.id);
      await action(fd);
      setOpen(false);
    } catch (err: any) {
      alert(err?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button className="btn-secondary" onClick={() => setOpen(true)}>
        <Pencil className="w-4 h-4" />
        Edit
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit department">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input name="name" className="input" defaultValue={department.name} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea name="description" className="input min-h-[80px]" defaultValue={department.description ?? ""} />
          </div>
          {isAdmin && (
            <div>
              <label className="label">Department Head</label>
              <select name="headId" className="input" defaultValue={department.headId ?? ""}>
                <option value="">&mdash; Unassigned &mdash;</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
