"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";

export function DeleteTeamModal({
  teamName,
  open,
  onClose,
  onConfirm,
}: {
  teamName: string;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [value, setValue] = useState("");

  function handleClose() {
    setValue("");
    onClose();
  }

  function handleConfirm() {
    setValue("");
    onConfirm();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Delete team" maxWidth="max-w-md">
      <p className="text-sm text-gray-600 mb-4">
        This will permanently delete <strong>{teamName}</strong> and all its members. Type{" "}
        <strong>delete</strong> to confirm.
      </p>
      <input
        className="input w-full mb-4"
        placeholder='Type "delete" to confirm'
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <button className="btn-secondary" onClick={handleClose}>
          Cancel
        </button>
        <button
          className="btn-danger"
          disabled={value !== "delete"}
          onClick={handleConfirm}
        >
          Delete team
        </button>
      </div>
    </Modal>
  );
}
