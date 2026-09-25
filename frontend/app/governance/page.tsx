"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authHeaders, getAuth, AuthUser } from "@/lib/auth";
import GovernanceHeatmap from "@/components/GovernanceHeatmap";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type Summary = {
  total_parcels: number;
  anomalies: number;
  landuse_changes: number;
  pending_verification: number;
  tax_issues: number;
  by_district: { district: string; anomalies: number; total_parcels: number; avg_risk_score: number }[];
  by_scenario: Record<string, number>;
};

type HeatmapPoint = { ulpin: string; lat: number; lng: number; risk_score: number; risk_label: string; scenario: string; anomaly_count: number };

type AuditEntry = { audit_id: number; ulpin: string; officer_name: string; department: string; action: string;
  field_name: string | null; previous_value: string | null; new_value: string | null; reason: string | null; timestamp: string };

type WorkflowStep = { step_id: number; step_name: string; status: string; updated_by: string | null; updated_at: string | null };
type Workflow = { workflow_id: number; ulpin: string; request_type: string; status: string; citizen_name: string;
  created_at: string; updated_at: string; steps: WorkflowStep[] };

export default function GovernancePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [error, setError] = useState<string | null>(null);

  function loadWorkflows() {
    fetch(`${API_BASE_URL}/api/workflows`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setWorkflows(d.workflows ?? []));
  }

  function loadAudit() {
    fetch(`${API_BASE_URL}/api/governance/audit`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setAudit(d.entries ?? []));
  }

  async function advanceStep(workflowId: number, stepId: number) {
    await fetch(`${API_BASE_URL}/api/workflows/${workflowId}/steps/${stepId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ status: "completed" }),
    });
    loadWorkflows();
    loadAudit();
  }

  useEffect(() => {
    const u = getAuth();
    setUser(u);
    if (!u || (u.role !== "officer" && u.role !== "admin")) return;

    fetch(`${API_BASE_URL}/api/governance/summary`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => (d.detail ? setError(d.detail) : setSummary(d)))
      .catch(() => setError("Could not load governance summary."));

    fetch(`${API_BASE_URL}/api/governance/heatmap`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setPoints(d.points ?? []));

    loadAudit();
    loadWorkflows();
  }, []);

  if (!user || (user.role !== "officer" && user.role !== "admin")) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-[#0b0f14] text-white/60">
        <p>Sign in as a Government Officer or Administrator to view this dashboard.</p>
        <Link href="/dashboard" className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-sky-300 hover:border-white/25">
          ← Back to map
        </Link>
      </div>
    );
  }

  return (
    <main className="h-screen w-screen overflow-y-auto bg-[#0b0f14] text-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-5">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold">Governance Intelligence Dashboard</h1>
          <span className="rounded bg-white/10 px-1.5 py-px text-[10px] uppercase text-white/50">{user.role}</span>
        </div>
        <Link href="/dashboard" className="text-xs text-white/50 hover:text-white">← Back to map</Link>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 p-6">
        {error && <p className="text-sm text-amber-300">{error}</p>}

        {summary && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatCard label="Total Parcels" value={summary.total_parcels.toLocaleString()} />
            <StatCard label="Potential Anomalies" value={summary.anomalies.toLocaleString()} tone="warning" />
            <StatCard label="Land-use Changes" value={summary.landuse_changes.toLocaleString()} tone="warning" />
            <StatCard label="Pending Verification" value={summary.pending_verification.toLocaleString()} />
            <StatCard label="Tax Issues" value={summary.tax_issues.toLocaleString()} tone="warning" />
          </div>
        )}

        <section>
          <h2 className="mb-2 text-xs uppercase tracking-wide text-white/40">GIS Risk Heatmap</h2>
          <div className="h-96 overflow-hidden rounded-lg border border-white/10">
            <GovernanceHeatmap points={points} />
          </div>
          <div className="mt-2 flex gap-4 text-[11px] text-white/50">
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />Low risk</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500" />Moderate risk</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500" />High risk</span>
          </div>
        </section>

        {summary && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section>
              <h2 className="mb-2 text-xs uppercase tracking-wide text-white/40">Anomalies by district</h2>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-white/40">
                    <th className="pb-1.5 font-normal">District</th>
                    <th className="pb-1.5 font-normal">Parcels</th>
                    <th className="pb-1.5 font-normal">Anomalies</th>
                    <th className="pb-1.5 font-normal">Avg. risk score</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.by_district.map((d) => (
                    <tr key={d.district} className="border-t border-white/5">
                      <td className="py-1.5">{d.district}</td>
                      <td className="py-1.5 text-white/60">{d.total_parcels.toLocaleString()}</td>
                      <td className="py-1.5 text-amber-300">{d.anomalies.toLocaleString()}</td>
                      <td className="py-1.5 text-white/60">{d.avg_risk_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section>
              <h2 className="mb-2 text-xs uppercase tracking-wide text-white/40">Parcels by scenario</h2>
              <div className="space-y-1.5">
                {Object.entries(summary.by_scenario).map(([scenario, count]) => {
                  const max = Math.max(...Object.values(summary.by_scenario));
                  return (
                    <div key={scenario} className="flex items-center gap-2 text-xs">
                      <span className="w-36 shrink-0 truncate text-white/60">{scenario.replace(/_/g, " ")}</span>
                      <div className="h-2 flex-1 rounded-full bg-white/5">
                        <div className="h-2 rounded-full bg-sky-500/60" style={{ width: `${(count / max) * 100}%` }} />
                      </div>
                      <span className="w-10 text-right text-white/40">{count}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        <section>
          <h2 className="mb-2 text-xs uppercase tracking-wide text-white/40">Verification workflows</h2>
          <div className="space-y-2">
            {workflows.length === 0 && (
              <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/40">
                No service requests submitted yet — citizens can submit one from a parcel's ULPIN profile.
              </p>
            )}
            {workflows.map((w) => (
              <div key={w.workflow_id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono text-sky-300">{w.ulpin}</span>
                    <span className="ml-2 text-white/50">{w.request_type} — {w.citizen_name}</span>
                  </div>
                  <span className={`rounded px-1.5 py-px text-[9px] uppercase ${
                    w.status === "resolved" ? "bg-emerald-400/20 text-emerald-300" : "bg-amber-400/20 text-amber-300"
                  }`}>
                    {w.status}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {w.steps.map((s, i) => (
                    <div key={s.step_id} className="flex items-center gap-2">
                      <div
                        className={`rounded-md border px-2 py-1 text-[11px] ${
                          s.status === "completed"
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                            : s.status === "in_progress"
                            ? "border-sky-400/30 bg-sky-400/10 text-sky-300"
                            : "border-white/10 text-white/30"
                        }`}
                      >
                        {s.status === "completed" ? "✓ " : s.status === "in_progress" ? "● " : "○ "}
                        {s.step_name}
                      </div>
                      {s.status === "in_progress" && (
                        <button
                          onClick={() => advanceStep(w.workflow_id, s.step_id)}
                          className="rounded-md border border-sky-400/30 bg-sky-500/10 px-2 py-1 text-[10px] text-sky-300 hover:bg-sky-500/20"
                        >
                          Mark complete
                        </button>
                      )}
                      {i < w.steps.length - 1 && <span className="text-white/20">→</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-xs uppercase tracking-wide text-white/40">Audit trail</h2>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-xs">
              <thead className="bg-white/5">
                <tr className="text-left text-white/40">
                  <th className="px-3 py-2 font-normal">Time</th>
                  <th className="px-3 py-2 font-normal">ULPIN</th>
                  <th className="px-3 py-2 font-normal">Officer</th>
                  <th className="px-3 py-2 font-normal">Action</th>
                  <th className="px-3 py-2 font-normal">Field</th>
                  <th className="px-3 py-2 font-normal">Change</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.audit_id} className="border-t border-white/5">
                    <td className="px-3 py-2 text-white/50">{new Date(a.timestamp).toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-white/60">{a.ulpin}</td>
                    <td className="px-3 py-2">{a.officer_name}</td>
                    <td className="px-3 py-2">{a.action}</td>
                    <td className="px-3 py-2 text-white/50">{a.field_name ?? "—"}</td>
                    <td className="px-3 py-2 text-white/50">
                      {a.previous_value && a.new_value ? `${a.previous_value} → ${a.new_value}` : a.reason ?? "—"}
                    </td>
                  </tr>
                ))}
                {audit.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-4 text-center text-white/30">No audit entries yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "warning" }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <p className="text-[10px] uppercase tracking-wide text-white/40">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${tone === "warning" ? "text-amber-300" : "text-white"}`}>{value}</p>
    </div>
  );
}
