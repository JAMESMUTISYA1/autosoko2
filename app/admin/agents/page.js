"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/admin/agents")
      .then((r) => r.json())
      .then((json) => setAgents(json.success ? json.data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl">Agents</h1>
        <Link href="/admin/agents/new" className="flex items-center gap-2 bg-accent text-white text-sm font-semibold px-4 py-2 rounded-sm hover:bg-accent/90 transition-colors">
          <Plus size={16} /> Create Agent
        </Link>
      </div>
      <p className="text-sm text-muted mb-8">Agents verify businesses and track order fulfillment.</p>

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : (
        <div className="bg-card border border-line rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-5 py-3 font-medium">Agent</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {agents.map((a) => (
                <tr key={a.id} className="hover:bg-bg transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium">{a.fullName}</p>
                    <p className="text-xs text-muted">{a.email}</p>
                  </td>
                  <td className="px-5 py-3.5">{a.role}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[11px] px-2 py-1 rounded-sm border ${a.status === "active" ? "border-fg" : "border-line text-muted"}`}>{a.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
