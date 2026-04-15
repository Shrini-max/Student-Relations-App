"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

type DeptOpt = { id: string; name: string; teams: { id: string; name: string }[] };
type RoleOpt = { id: string; name: string; scope: string; departmentId: string | null };

export function MembersFilters({
  departments,
  roleTypes,
  initial,
}: {
  departments: DeptOpt[];
  roleTypes: RoleOpt[];
  initial: { q: string; departmentId: string; teamId: string; roleTypeId: string };
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(initial.q);
  const [departmentId, setDepartmentId] = useState(initial.departmentId);
  const [teamId, setTeamId] = useState(initial.teamId);
  const [roleTypeId, setRoleTypeId] = useState(initial.roleTypeId);

  const teams = useMemo(() => {
    if (!departmentId) return departments.flatMap((d) => d.teams);
    return departments.find((d) => d.id === departmentId)?.teams ?? [];
  }, [departmentId, departments]);

  const filteredRoles = useMemo(() => {
    if (!departmentId) return roleTypes;
    return roleTypes.filter((r) => r.scope === "GLOBAL" || r.departmentId === departmentId);
  }, [departmentId, roleTypes]);

  function apply() {
    const params = new URLSearchParams(sp.toString());
    const set = (k: string, v: string) => {
      if (v) params.set(k, v);
      else params.delete(k);
    };
    set("q", q);
    set("departmentId", departmentId);
    set("teamId", teamId);
    set("roleTypeId", roleTypeId);
    router.push(`/members?${params.toString()}`);
  }

  function reset() {
    setQ("");
    setDepartmentId("");
    setTeamId("");
    setRoleTypeId("");
    router.push("/members");
  }

  return (
    <div className="card p-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-2">
          <label className="label">Search</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Name, email, or phone..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
            />
          </div>
        </div>
        <div>
          <label className="label">Department</label>
          <select
            className="input"
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              setTeamId("");
            }}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Team</label>
          <select className="input" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">All teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Role</label>
          <select
            className="input"
            value={roleTypeId}
            onChange={(e) => setRoleTypeId(e.target.value)}
          >
            <option value="">All roles</option>
            {filteredRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} {r.scope === "DEPARTMENT" ? "(dept)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn-secondary" onClick={reset}>Reset</button>
        <button className="btn-primary" onClick={apply}>Apply filters</button>
      </div>
    </div>
  );
}
