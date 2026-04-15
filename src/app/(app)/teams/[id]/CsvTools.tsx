"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

export function CsvTools({ teamId, canImport }: { teamId: string; canImport: boolean }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onImport(file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("teamId", teamId);
      const res = await fetch("/api/import/members", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      alert(`Imported ${data.created} member(s). ${data.skipped} skipped.`);
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Import failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2">
      <a className="btn-secondary" href={`/api/export/members?teamId=${teamId}`}>
        <Download className="w-4 h-4" />
        Export CSV
      </a>
      {canImport && (
        <>
          <button
            className="btn-secondary"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-4 h-4" />
            {busy ? "Importing..." : "Import CSV"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
            }}
          />
        </>
      )}
    </div>
  );
}
