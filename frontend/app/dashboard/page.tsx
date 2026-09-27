"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ParcelMap, { ParcelMapHandle } from "@/components/ParcelMap";
import SearchBar from "@/components/SearchBar";
import RealRecordLookup from "@/components/RealRecordLookup";
import LoginBox from "@/components/LoginBox";
import { AuthUser, getAuth, setAuth } from "@/lib/auth";

export default function AppPage() {
  const mapRef = useRef<ParcelMapHandle>(null);
  const [coverageOpen, setCoverageOpen] = useState(false);
  const [realLookupOpen, setRealLookupOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getAuth());
  }, []);

  return (
    <main className="flex h-screen w-screen flex-col">
      <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#0b0f14] px-5">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-sky-400" />
            <h1 className="text-sm font-semibold tracking-tight text-white">
              LandStack Intelligence
            </h1>
          </Link>
          <button
            onClick={() => setCoverageOpen((v) => !v)}
            className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/40 hover:border-white/25 hover:text-white/70"
          >
            Pune · Koregaon Park coverage
          </button>
        </div>
        <div className="flex items-center gap-2">
          {(user?.role === "officer" || user?.role === "admin") && (
            <Link
              href="/governance"
              className="rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] text-white/60 hover:border-white/25 hover:text-white"
            >
              Governance dashboard
            </Link>
          )}
          {user && (
            <Link
              href="/state-adapters"
              className="rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] text-white/60 hover:border-white/25 hover:text-white"
            >
              State adapters
            </Link>
          )}
          <button
            onClick={() => setRealLookupOpen((v) => !v)}
            className={`rounded-md border px-2.5 py-1.5 text-[11px] transition ${
              realLookupOpen
                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                : "border-white/10 text-white/60 hover:border-white/25 hover:text-white"
            }`}
          >
            Real record lookup
          </button>
          <SearchBar
            onSelectPlace={(lat, lng, zoom) => mapRef.current?.flyTo(lat, lng, zoom)}
            onSelectParcel={(parcelId, lat, lng) => mapRef.current?.selectParcel(parcelId, lat, lng)}
          />
          {user ? (
            <button
              onClick={() => {
                setAuth(null);
                setUser(null);
              }}
              className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] text-white/70 hover:border-white/25 hover:text-white"
            >
              <span className="rounded bg-white/10 px-1 py-px text-[9px] uppercase">{user.role}</span>
              {user.name.split(" ")[0]}
            </button>
          ) : (
            <button
              onClick={() => setLoginOpen((v) => !v)}
              className="rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] text-white/60 hover:border-white/25 hover:text-white"
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      {loginOpen && (
        <LoginBox
          onLoggedIn={(u) => {
            setUser(u);
            setLoginOpen(false);
          }}
          onClose={() => setLoginOpen(false)}
        />
      )}

      {realLookupOpen && (
        <RealRecordLookup
          onClose={() => setRealLookupOpen(false)}
          onLocate={(lat, lng) => mapRef.current?.flyTo(lat, lng, 15)}
        />
      )}

      {coverageOpen && (
        <div className="absolute left-5 top-16 z-20 w-80 rounded-lg border border-white/10 bg-[#0f151bee] p-3 text-xs text-white/70 shadow-2xl backdrop-blur">
          <p className="mb-1 font-medium text-white">Real coverage in this deployment</p>
          <ul className="space-y-1">
            <li>• Parcel geometry: OpenStreetMap footprints, ~1.3 km² of central Pune only</li>
            <li>• Registration / mutation / ULPIN: not available — shown as DEMO where present</li>
            <li>• Statewide Maharashtra coverage: not implemented in this phase</li>
          </ul>
          <p className="mt-2 text-[10px] text-white/40">See docs/DATA_SOURCES.md for the full policy.</p>
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <ParcelMap ref={mapRef} />
      </div>
    </main>
  );
}
