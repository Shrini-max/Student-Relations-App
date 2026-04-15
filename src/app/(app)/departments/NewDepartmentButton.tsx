"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Plus } from "lucide-react";

type UserOpt = { id: string; name: string; email: string; role: "ADMIN" | "DEPT_HEAD" | "VIEWER" };

export function NewDepartmentButton({
  candidates,
  action,
}: {
  candidates: UserOpt[];
  action: (fd: FormData) => Promise<any>;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await action(new FormData(e.currentTarget));
      setOpen(false);
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
        New department
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Create department">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input name="name" className="input" required autoFocus />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea name="description" className="input min-h-[80px]" />
          </div>
          <div>
            <label className="label">Department Head</label>
            <select name="headId" className="input">
              <option value="">&mdash; Unassigned &mdash;</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Tip: promote a user to Department Head from the Admin Panel first.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
