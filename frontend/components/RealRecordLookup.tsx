"use client";

import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type Item = { code: string; name: string };

type PlotRecord = {
  survey_no?: string;
  total_area?: string;
  pot_kharaba?: string;
  owner_name?: string;
  khata_no?: string;
  map_area_sq_m?: number;
  raw_info_text?: string;
  source: string;
  disclaimer: string;
};

async function fetchItems(path: string): Promise<Item[]> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || `API returned ${res.status}`);
  return data.items ?? [];
}

export default function RealRecordLookup({
  onClose,
  onLocate,
}: {
  onClose: () => void;
  onLocate: (lat: number, lng: number) => void;
}) {
  const [districts, setDistricts] = useState<Item[]>([]);
  const [talukas, setTalukas] = useState<Item[]>([]);
  const [villages, setVillages] = useState<Item[]>([]);
  const [district, setDistrict] = useState<Item | null>(null);
  const [taluka, setTaluka] = useState<Item | null>(null);
  const [village, setVillage] = useState<Item | null>(null);
  const [plotno, setPlotno] = useState("");

  const [loadingLevel, setLoadingLevel] = useState<"districts" | "talukas" | "villages" | "plot" | null>("districts");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlotRecord | null>(null);

  useEffect(() => {
    fetchItems("/api/real-lookup/districts")
      .then(setDistricts)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingLevel(null));
  }, []);

  function selectDistrict(code: string) {
    const d = districts.find((x) => x.code === code) || null;
    setDistrict(d);
    setTaluka(null);
    setVillage(null);
    setTalukas([]);
    setVillages([]);
    setResult(null);
    if (!d) return;
    setLoadingLevel("talukas");
    setError(null);
    fetchItems(`/api/real-lookup/talukas?district_code=${d.code}`)
      .then(setTalukas)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingLevel(null));
  }

  function selectTaluka(code: string) {
    const t = talukas.find((x) => x.code === code) || null;
    setTaluka(t);
    setVillage(null);
    setVillages([]);
    setResult(null);
    if (!t || !district) return;
    setLoadingLevel("villages");
    setError(null);
    fetchItems(`/api/real-lookup/villages?district_code=${district.code}&taluka_code=${t.code}`)
      .then(setVillages)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingLevel(null));
  }

  function selectVillage(code: string) {
    setVillage(villages.find((x) => x.code === code) || null);
    setResult(null);
  }

  async function flyToPlace(query: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      const place = (data.results ?? []).find((r: any) => r.type === "place" || r.type === "building");
      if (place) onLocate(place.lat, place.lng);
    } catch {
      // non-fatal
    }
  }

  async function lookup() {
    if (!district || !taluka || !village || !plotno.trim()) return;
    setLoadingLevel("plot");
    setError(null);
    setResult(null);
    try {
      const url = new URL(`${API_BASE_URL}/api/real-lookup/plot`);
      url.searchParams.set("district_code", district.code);
      url.searchParams.set("taluka_code", taluka.code);
      url.searchParams.set("village_code", village.code);
      url.searchParams.set("plotno", plotno.trim());
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `API returned ${res.status}`);
      setResult(data);
      flyToPlace(`${village.name}, ${taluka.name}, ${district.name}, Maharashtra`);
    } catch (err: any) {
      setError(err.message ?? "Lookup failed");
    } finally {
      setLoadingLevel(null);
    }
  }

  return (
    <div className="absolute right-4 top-16 z-20 w-96 max-h-[75vh] overflow-y-auto rounded-xl border border-emerald-400/20 bg-[#0f151bf5] p-4 text-xs shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-emerald-400">
            Real record lookup
            <span className="rounded bg-emerald-400/20 px-1 py-px text-[9px] normal-case text-emerald-300">
              live · statewide · Mahabhunaksha
            </span>
          </p>
          <p className="mt-1 text-white/50">
            Real district → taluka → village hierarchy, fetched live from Maharashtra's own portal — not a fixed
            preset list.
          </p>
          <p className="mt-1 text-amber-300/70">
            This is land-parcel ownership (who owns the plot), not individual flat/unit ownership inside a building —
            that data (Index-II registration) isn't publicly available anywhere.
          </p>
        </div>
        <button onClick={onClose} className="rounded-md px-2 py-1 text-white/50 hover:bg-white/10 hover:text-white">
          ✕
        </button>
      </div>

      <div className="mt-3 space-y-2">
        <label className="block text-white/40">
          District
          <select
            value={district?.code ?? ""}
            onChange={(e) => selectDistrict(e.target.value)}
            disabled={loadingLevel === "districts"}
            className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-white focus:outline-none disabled:opacity-50"
          >
            <option value="" className="bg-[#0f151b]">
              {loadingLevel === "districts" ? "Loading…" : "Select district…"}
            </option>
            {districts.map((d) => (
              <option key={d.code} value={d.code} className="bg-[#0f151b]">
                {d.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-white/40">
          Taluka
          <select
            value={taluka?.code ?? ""}
            onChange={(e) => selectTaluka(e.target.value)}
            disabled={!district || loadingLevel === "talukas"}
            className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-white focus:outline-none disabled:opacity-50"
          >
            <option value="" className="bg-[#0f151b]">
              {loadingLevel === "talukas" ? "Loading…" : "Select taluka…"}
            </option>
            {talukas.map((t) => (
              <option key={t.code} value={t.code} className="bg-[#0f151b]">
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-white/40">
          Village
          <select
            value={village?.code ?? ""}
            onChange={(e) => selectVillage(e.target.value)}
            disabled={!taluka || loadingLevel === "villages"}
            className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-white focus:outline-none disabled:opacity-50"
          >
            <option value="" className="bg-[#0f151b]">
              {loadingLevel === "villages" ? "Loading…" : "Select village…"}
            </option>
            {villages.map((v) => (
              <option key={v.code} value={v.code} className="bg-[#0f151b]">
                {v.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-white/40">
          Survey / Gat / plot no.
          <div className="mt-1 flex gap-2">
            <input
              value={plotno}
              onChange={(e) => setPlotno(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookup()}
              disabled={!village}
              className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-white focus:outline-none disabled:opacity-50"
              placeholder={village ? "e.g. 100, 317, 1" : "pick a village first"}
            />
            <button
              onClick={lookup}
              disabled={!village || !plotno.trim() || loadingLevel === "plot"}
              className="shrink-0 rounded-md bg-emerald-500/20 px-3 py-1.5 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
            >
              {loadingLevel === "plot" ? "…" : "Fetch"}
            </button>
          </div>
        </label>
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-amber-400/30 bg-amber-950/40 px-2 py-1.5 text-amber-200">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-3 border-t border-white/10 pt-3">
          <dl className="space-y-1 text-white/70">
            <div className="flex justify-between gap-4">
              <dt className="text-white/40">Survey no.</dt>
              <dd className="font-mono">{result.survey_no ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/40">Total area</dt>
              <dd>{result.total_area ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/40">Pot kharaba</dt>
              <dd>{result.pot_kharaba ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/40">Owner name</dt>
              <dd className="text-right">{result.owner_name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/40">Khata no.</dt>
              <dd>{result.khata_no ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/40">GIS area</dt>
              <dd>{result.map_area_sq_m ? `${result.map_area_sq_m.toFixed(1)} m²` : "—"}</dd>
            </div>
          </dl>
          {result.raw_info_text && result.raw_info_text.split("Survey No.").length > 2 && (
            <details className="mt-2 text-white/50">
              <summary className="cursor-pointer text-white/40">
                This plot number has multiple sub-divisions — show all
              </summary>
              <pre className="mt-1 whitespace-pre-wrap text-[10px] text-white/60">{result.raw_info_text}</pre>
            </details>
          )}
          <p className="mt-2 text-[10px] leading-snug text-emerald-300/70">{result.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
