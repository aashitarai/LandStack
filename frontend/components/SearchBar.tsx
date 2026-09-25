"use client";

import { useEffect, useRef, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type SearchResult = {
  type: "building" | "parcel" | "place" | "ulpin";
  label: string;
  lat: number;
  lng: number;
  parcel_id?: number;
  disclaimer?: string;
  source?: string;
};

export default function SearchBar({
  onSelectPlace,
  onSelectParcel,
}: {
  onSelectPlace: (lat: number, lng: number, zoom?: number) => void;
  onSelectParcel: (parcelId: number, lat: number, lng: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function runSearch(q: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const [placeRes, ulpinRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(q)}`),
          fetch(`${API_BASE_URL}/api/ulpin?q=${encodeURIComponent(q)}`).catch(() => null),
        ]);
        if (!placeRes.ok) throw new Error(`API returned ${placeRes.status}`);
        const placeData = await placeRes.json();
        const ulpinData = ulpinRes && ulpinRes.ok ? await ulpinRes.json() : { results: [] };
        const ulpinResults: SearchResult[] = (ulpinData.results ?? []).slice(0, 4).map((r: any) => ({
          type: "ulpin" as const,
          label: `${r.ulpin} — Survey ${r.survey_number}, ${r.village}`,
          lat: r.lat,
          lng: r.lng,
          parcel_id: r.parcel_id,
        }));
        setResults([...ulpinResults, ...(placeData.results ?? [])]);
        setOpen(true);
      } catch (err: any) {
        setError("Search unavailable — is the backend running?");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  }

  function handleSelect(r: SearchResult) {
    if ((r.type === "parcel" || r.type === "building" || r.type === "ulpin") && r.parcel_id != null) {
      onSelectParcel(r.parcel_id, r.lat, r.lng);
    } else {
      onSelectPlace(r.lat, r.lng, 17);
    }
    setOpen(false);
    setQuery(r.label);
  }

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          runSearch(e.target.value);
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search a building, address, or survey no. (try Jewel Square)…"
        className="w-80 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-sky-400/50 focus:outline-none"
      />
      {open && (query.trim().length > 0) && (
        <div className="absolute right-0 top-full mt-1 w-96 overflow-hidden rounded-lg border border-white/10 bg-[#0f151bf5] shadow-2xl backdrop-blur">
          {loading && <div className="px-3 py-2 text-xs text-white/40">Searching…</div>}
          {!loading && error && <div className="px-3 py-2 text-xs text-amber-300">{error}</div>}
          {!loading && !error && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-white/40">
              No matches. Try a survey number like "DEMO-1" or an address near Koregaon Park, Pune.
            </div>
          )}
          {!loading &&
            results.map((r, i) => (
              <button
                key={i}
                onClick={() => handleSelect(r)}
                className="flex w-full flex-col items-start gap-0.5 border-b border-white/5 px-3 py-2 text-left text-xs last:border-b-0 hover:bg-white/5"
              >
                <span className="flex items-center gap-1.5 text-white/90">
                  <span
                    className={`shrink-0 rounded px-1 py-px text-[9px] uppercase tracking-wide ${
                      r.type === "ulpin"
                        ? "bg-violet-400/20 text-violet-300"
                        : r.type === "building"
                        ? "bg-emerald-400/20 text-emerald-300"
                        : r.type === "parcel"
                        ? "bg-amber-400/20 text-amber-300"
                        : "bg-sky-400/20 text-sky-300"
                    }`}
                  >
                    {r.type === "ulpin" ? "ULPIN" : r.type === "building" ? "Building" : r.type === "parcel" ? "Demo parcel" : "Place"}
                  </span>
                  <span className="truncate">{r.label}</span>
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
