"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authHeaders, getAuth, AuthUser } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type Adapter = {
  state: string;
  status: string;
  source_fields: string[];
  field_mapping: Record<string, string>;
  integration_note: string;
};

type AdaptersResponse = { adapters: Adapter[]; common_schema: string[]; architecture_note: string };

export default function StateAdaptersPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [data, setData] = useState<AdaptersResponse | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const u = getAuth();
    setUser(u);
    if (!u) return;
    fetch(`${API_BASE_URL}/api/governance/state-adapters`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        if (d.adapters?.length) setSelected(d.adapters[0].state);
      });
  }, []);

  if (!user) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-[#0b0f14] text-white/60">
        <p>Sign in to view the State Adapter Framework.</p>
        <Link href="/dashboard" className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-sky-300 hover:border-white/25">
          ← Back to map
        </Link>
      </div>
    );
  }

  const activeAdapter = data?.adapters.find((a) => a.state === selected);

  return (
    <main className="h-screen w-screen overflow-y-auto bg-[#0b0f14] text-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-5">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold">State Adapter Framework</h1>
          <span className="rounded bg-violet-400/20 px-1.5 py-px text-[10px] uppercase text-violet-300">Scalability USP</span>
        </div>
        <Link href="/dashboard" className="text-xs text-white/50 hover:text-white">← Back to map</Link>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <p className="text-sm text-white/60">
          Different states use different field names, terminology, and record formats for the same underlying land
          facts. Each state gets a configuration-driven adapter that maps its own schema into the common LandStack
          model — adding a new state means writing a new mapping, not touching the LandStack core.
        </p>

        {data && (
          <>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/60">
              <span className="text-white/40">Architecture: </span>
              {data.architecture_note}
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="space-y-2">
                {data.adapters.map((a) => (
                  <button
                    key={a.state}
                    onClick={() => setSelected(a.state)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                      selected === a.state
                        ? "border-sky-400/40 bg-sky-500/10 text-sky-300"
                        : "border-white/10 text-white/70 hover:border-white/25"
                    }`}
                  >
                    <span>{a.state}</span>
                    <span
                      className={`rounded px-1.5 py-px text-[9px] uppercase ${
                        a.status === "active" ? "bg-emerald-400/20 text-emerald-300" : "bg-white/10 text-white/40"
                      }`}
                    >
                      {a.status}
                    </span>
                  </button>
                ))}
              </div>

              {activeAdapter && (
                <div className="md:col-span-2 space-y-4">
                  <section>
                    <h2 className="mb-2 text-xs uppercase tracking-wide text-white/40">Source schema — {activeAdapter.state}</h2>
                    <div className="flex flex-wrap gap-1.5">
                      {activeAdapter.source_fields.map((f) => (
                        <span key={f} className="rounded bg-white/5 px-2 py-1 font-mono text-[11px] text-white/60">
                          {f}
                        </span>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h2 className="mb-2 text-xs uppercase tracking-wide text-white/40">Field mapping → common schema</h2>
                    <div className="overflow-hidden rounded-lg border border-white/10">
                      <table className="w-full text-xs">
                        <thead className="bg-white/5">
                          <tr className="text-left text-white/40">
                            <th className="px-3 py-2 font-normal">{activeAdapter.state} field</th>
                            <th className="px-3 py-2 font-normal">LandStack common field</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(activeAdapter.field_mapping).map(([src, dst]) => (
                            <tr key={src} className="border-t border-white/5">
                              <td className="px-3 py-2 font-mono text-white/70">{src}</td>
                              <td className="px-3 py-2 font-mono text-sky-300">{dst}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/50">
                    {activeAdapter.integration_note}
                  </p>
                </div>
              )}
            </div>

            <section>
              <h2 className="mb-2 text-xs uppercase tracking-wide text-white/40">Common LandStack schema</h2>
              <div className="flex flex-wrap gap-1.5">
                {data.common_schema.map((f) => (
                  <span key={f} className="rounded bg-sky-400/10 px-2 py-1 font-mono text-[11px] text-sky-300">
                    {f}
                  </span>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
