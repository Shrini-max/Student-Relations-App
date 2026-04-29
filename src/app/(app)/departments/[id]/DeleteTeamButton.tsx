"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteTeam } from "@/actions/teams";
import { DeleteTeamModal } from "@/components/DeleteTeamModal";

export function DeleteTeamButton({
  teamId,
  teamName,
}: {
  teamId: string;
  teamName: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleConfirm() {
    setOpen(false);
    const fd = new FormData();
    fd.set("id", teamId);
    try {
      await deleteTeam(fd);
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Failed to delete team");
    }
  }

  return (
    <>
      <button
        className="btn-ghost !px-2 !py-1 text-xs text-red-600 hover:bg-red-50"
        onClick={() => setOpen(true)}
      >
        Delete
      </button>
      <DeleteTeamModal
        teamName={teamName}
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
