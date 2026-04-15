"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Plus } from "lucide-react";

export function NewTeamButton({
  departmentId,
  action,
}: {
  departmentId: string;
  action: (fd: FormData) => Promise<any>;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("departmentId", departmentId);
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
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" />
        New team
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Create team">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input name="name" className="input" required autoFocus />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea name="description" className="input min-h-[80px]" />
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
