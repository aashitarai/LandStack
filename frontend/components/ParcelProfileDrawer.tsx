"use client";

import { useEffect, useState } from "react";
import { authHeaders, getAuth } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type Profile = {
  ulpin: string;
  district: string;
  taluka: string;
  village: string;
  survey_number: string;
  area_sq_m: number;
  land_use: string;
  scenario_tag?: string;
  is_hero_parcel?: boolean;
  ownership: { owners: { name: string; ownership_type: string; ownership_share: string }[]; disclaimer: string };
  registration?: any;
  encumbrance?: any;
  building_permission?: any;
  tax?: any;
  restrictions?: any;
  utilities?: any;
  satellite_timeline?: { year: number; land_use: string; note: string | null }[];
  anomalies?: any[];
  risk?: { score: number; label: string; factors: { factor: string; status: string; note: string }[]; disclaimer: string };
  disclaimer: string;
};

const TABS = [
  "Overview",
  "Ownership",
  "Registration",
  "Encumbrance",
  "Building",
  "Tax",
  "Restrictions",
  "Utilities",
  "Satellite",
  "Anomalies",
  "Risk",
] as const;

export default function ParcelProfileDrawer({ ulpin, onClose }: { ulpin: string; onClose: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [requesting, setRequesting] = useState(false);
  const [requestMsg, setRequestMsg] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setTab("Overview");
    fetch(`${API_BASE_URL}/api/ulpin/${ulpin}`)
      .then((r) => r.json())
      .then(setProfile)
      .catch(() => setError("Could not load parcel profile."))
      .finally(() => setLoading(false));
  }, [ulpin]);

  async function submitVerificationRequest() {
    const auth = getAuth();
    if (!auth) {
      setRequestMsg("Sign in as a citizen to submit a service request.");
      return;
    }
    setRequesting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/workflows`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ ulpin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Request failed");
      setRequestMsg(`Verification workflow #${data.workflow_id} submitted.`);
    } catch (err: any) {
      setRequestMsg(err.message);
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="absolute inset-y-0 right-0 z-30 flex w-full max-w-md flex-col border-l border-white/10 bg-[#0b0f14f8] shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="font-mono text-sm text-sky-400">{ulpin}</p>
          {profile?.is_hero_parcel && (
            <span className="mt-0.5 inline-block rounded bg-amber-400/20 px-1.5 py-px text-[9px] uppercase tracking-wide text-amber-300">
              Demo hero parcel
            </span>
          )}
        </div>
        <button onClick={onClose} className="rounded-md px-2 py-1 text-white/50 hover:bg-white/10 hover:text-white">
          ✕
        </button>
      </div>

      {loading && <p className="p-4 text-xs text-white/40">Loading unified parcel profile…</p>}
      {error && <p className="p-4 text-xs text-amber-300">{error}</p>}

      {profile && (
        <>
          <div className="flex flex-wrap gap-1 border-b border-white/10 px-3 py-2">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md px-2 py-1 text-[11px] ${
                  tab === t ? "bg-sky-500/20 text-sky-300" : "text-white/50 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 text-xs text-white/70">
            {tab === "Overview" && (
              <div className="space-y-3">
                <Row label="State" value="Maharashtra" />
                <Row label="District" value={profile.district} />
                <Row label="Taluka" value={profile.taluka} />
                <Row label="Village" value={profile.village} />
                <Row label="Survey number" value={profile.survey_number} mono />
                <Row label="Area" value={`${profile.area_sq_m.toFixed(1)} sq.m`} />
                <Row label="Land use" value={profile.land_use} />
                {profile.risk && (
                  <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white/40">Property Risk Indicator</span>
                      <span className="text-lg font-semibold text-white">{profile.risk.score}/100</span>
                    </div>
                    <p className="mt-0.5 text-white/50">{profile.risk.label} risk</p>
                  </div>
                )}
                {(profile.anomalies?.length ?? 0) > 0 && (
                  <div className="rounded-lg border border-amber-400/30 bg-amber-950/30 p-3 text-amber-200">
                    ⚠ {profile.anomalies!.length} potential inconsistency(ies) detected — see Anomalies tab.
                  </div>
                )}
                <div className="border-t border-white/10 pt-3">
                  <button
                    onClick={submitVerificationRequest}
                    disabled={requesting}
                    className="w-full rounded-md bg-sky-500/20 px-3 py-2 text-sky-300 hover:bg-sky-500/30 disabled:opacity-50"
                  >
                    {requesting ? "Submitting…" : "Submit Property Verification Request"}
                  </button>
                  {requestMsg && <p className="mt-2 text-white/50">{requestMsg}</p>}
                </div>
              </div>
            )}

            {tab === "Ownership" && (
              <div className="space-y-2">
                {profile.ownership.owners.map((o, i) => (
                  <div key={i} className="flex justify-between rounded-md bg-white/5 px-2 py-1.5">
                    <span>{o.name}</span>
                    <span className="text-white/40">{o.ownership_share} · {o.ownership_type}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === "Registration" && profile.registration && (
              <div className="space-y-2">
                <Row label="Registration ID" value={profile.registration.registration_id} mono />
                <Row label="Transaction type" value={profile.registration.transaction_type} />
                <Row label="Date" value={profile.registration.date} />
                <Row label="Status" value={profile.registration.status} />
                <Row label="Registered area" value={`${profile.registration.registered_area_sq_m} sq.m`} />
                <Row label="Registered owner" value={profile.registration.registered_owner} />
              </div>
            )}

            {tab === "Encumbrance" && profile.encumbrance && (
              <div className="space-y-2">
                <Row label="Status" value={profile.encumbrance.status} />
                {profile.encumbrance.status === "Active" && (
                  <>
                    <Row label="Institution" value={profile.encumbrance.institution} />
                    <Row label="Amount" value={`₹${profile.encumbrance.amount.toLocaleString("en-IN")}`} />
                  </>
                )}
              </div>
            )}

            {tab === "Building" && profile.building_permission && (
              <div className="space-y-2">
                <Row label="Status" value={profile.building_permission.status} />
                {profile.building_permission.application_number && (
                  <>
                    <Row label="Application no." value={profile.building_permission.application_number} mono />
                    <Row label="Approved area" value={`${profile.building_permission.approved_area_sq_m} sq.m`} />
                    <Row label="Date" value={profile.building_permission.date} />
                  </>
                )}
              </div>
            )}

            {tab === "Tax" && profile.tax && (
              <div className="space-y-2">
                <Row label="Status" value={profile.tax.status} />
                <Row label="Outstanding" value={`₹${profile.tax.outstanding_amount.toLocaleString("en-IN")}`} />
                <Row label="Last payment" value={profile.tax.last_payment} />
              </div>
            )}

            {tab === "Restrictions" && profile.restrictions && (
              <div className="space-y-2">
                <Row label="Type" value={profile.restrictions.type} />
                <Row label="Environmental zone" value={profile.restrictions.environmental_zone ? "Yes" : "No"} />
                <Row label="Acquisition status" value={profile.restrictions.acquisition_status} />
              </div>
            )}

            {tab === "Utilities" && profile.utilities && (
              <div className="space-y-2">
                <Row label="Water" value={profile.utilities.water} />
                <Row label="Electricity" value={profile.utilities.electricity} />
                <Row label="Sewage" value={profile.utilities.sewage} />
              </div>
            )}

            {tab === "Satellite" && profile.satellite_timeline && (
              <div className="space-y-2">
                {profile.satellite_timeline.map((t) => (
                  <div key={t.year} className="rounded-md bg-white/5 px-3 py-2">
                    <div className="flex justify-between">
                      <span className="font-mono text-white/50">{t.year}</span>
                      <span className={t.note ? "text-amber-300" : ""}>{t.land_use}</span>
                    </div>
                    {t.note && <p className="mt-1 text-amber-200/80">⚠ {t.note}</p>}
                  </div>
                ))}
                <p className="mt-2 text-[10px] text-white/30">
                  Simulated imagery timeline for prototype demonstration — not connected to live satellite data.
                </p>
              </div>
            )}

            {tab === "Anomalies" && (
              <div className="space-y-3">
                {(profile.anomalies?.length ?? 0) === 0 && <p className="text-white/40">No inconsistencies detected across departments.</p>}
                {profile.anomalies?.map((a, i) => (
                  <div key={i} className="rounded-lg border border-amber-400/30 bg-amber-950/30 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-amber-200">{a.type}</span>
                      <span className="text-[10px] uppercase text-amber-300">{a.severity}</span>
                    </div>
                    <p className="mt-1 text-white/60">{a.explanation}</p>
                    <div className="mt-2 space-y-1">
                      {a.sources.map((s: any, j: number) => (
                        <div key={j} className="flex justify-between text-[11px] text-white/50">
                          <span>{s.department}</span>
                          <span>{s.value}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-white/40">Confidence: {(a.confidence * 100).toFixed(0)}% · {a.recommended_action}</p>
                  </div>
                ))}
              </div>
            )}

            {tab === "Risk" && profile.risk && (
              <div className="space-y-3">
                <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
                  <p className="text-3xl font-semibold text-white">{profile.risk.score}<span className="text-base text-white/40">/100</span></p>
                  <p className="mt-1 text-white/50">{profile.risk.label} Risk</p>
                </div>
                <div className="space-y-1.5">
                  {profile.risk.factors.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md bg-white/5 px-2 py-1.5">
                      <span className={f.status === "ok" ? "text-emerald-400" : "text-amber-400"}>
                        {f.status === "ok" ? "✓" : "⚠"}
                      </span>
                      <span className="flex-1">{f.factor}</span>
                      <span className="text-white/40">{f.note}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] leading-snug text-white/30">{profile.risk.disclaimer}</p>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 px-4 py-2 text-[10px] text-white/30">{profile.disclaimer}</div>
        </>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string | number | undefined; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-white/40">{label}</span>
      <span className={mono ? "font-mono" : ""}>{value ?? "—"}</span>
    </div>
  );
}
