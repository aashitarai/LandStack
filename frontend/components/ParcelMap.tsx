"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import L, { Map as LeafletMap, GeoJSON as LeafletGeoJSON } from "leaflet";
import "leaflet/dist/leaflet.css";
import ParcelProfileDrawer from "./ParcelProfileDrawer";
import { SAMPLE_PUNE_PARCELS, getMockDemoRecords } from "@/lib/sampleParcels";

// Central Pune — Koregaon Park / Camp area
const PUNE_CENTER: [number, number] = [18.5400, 73.8835]; // [lat, lng]
const INITIAL_ZOOM = 16;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

type ParcelProperties = {
  internal_parcel_id: number;
  area_sq_m: number;
  source: string;
  source_record_id: string;
  source_last_updated: string | null;
  land_use: string | null;
  ulpin: string | null;
  disclaimer: string;
};

type SelectedParcel = {
  properties: ParcelProperties;
  lngLat: { lng: number; lat: number };
};

type DemoOwner = { name: string; ownership_share: string; ownership_type: string };

type LandSystemInfo = { code: string; label: string; message: string };

type DemoRecords = {
  available: boolean;
  disclaimer: string;
  survey_no?: string;
  village?: string;
  taluka?: string;
  district?: string;
  land_system?: LandSystemInfo;
  ulpin_status?: string;
  owners?: DemoOwner[];
  records?: {
    seven_twelve: boolean;
    eight_a: boolean;
    property_card: boolean;
    mutation_count: number;
  };
};

export type ParcelMapHandle = {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  selectParcel: (parcelId: number, lat: number, lng: number) => void;
};

const ParcelMap = forwardRef<ParcelMapHandle>(function ParcelMap(_props, ref) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<LeafletMap | null>(null);
  const leafletGeoJsonRef = useRef<LeafletGeoJSON | null>(null);

  const [selected, setSelected] = useState<SelectedParcel | null>(null);
  const [demoRecords, setDemoRecords] = useState<DemoRecords | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [parcelCount, setParcelCount] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profileUlpin, setProfileUlpin] = useState<string | null>(null);

  async function openParcelById(parcelId: number, lngLat: { lng: number; lat: number }) {
    try {
      const baseUrl = API_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "");
      const res = await fetch(`${baseUrl}/api/parcels/${parcelId}`);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const feature = await res.json();
      setSelected({
        properties: {
          internal_parcel_id: feature.internal_parcel_id ?? parcelId,
          area_sq_m: feature.area_sq_m ?? 1850,
          source: feature.source ?? "OpenStreetMap",
          source_record_id: feature.source_record_id ?? `way/${parcelId}`,
          source_last_updated: feature.source_last_updated ?? new Date().toISOString(),
          land_use: feature.land_use ?? "residential",
          ulpin: feature.ulpin ?? `MH-PUN-HAV-KP-0429${parcelId % 100}`,
          disclaimer: feature.disclaimer ?? "Demonstration parcel boundary.",
        },
        lngLat,
      });
    } catch {
      // Fallback to sample data
      const sample =
        SAMPLE_PUNE_PARCELS.find((p) => p.properties.internal_parcel_id === parcelId) ||
        SAMPLE_PUNE_PARCELS[0];
      setSelected({
        properties: { ...sample.properties, internal_parcel_id: parcelId },
        lngLat,
      });
    }
  }

  useImperativeHandle(ref, () => ({
    flyTo(lat, lng, zoom = 17) {
      if (leafletMapRef.current) {
        leafletMapRef.current.flyTo([lat, lng], zoom, { duration: 1.2 });
      }
    },
    selectParcel(parcelId, lat, lng) {
      if (leafletMapRef.current) {
        leafletMapRef.current.flyTo([lat, lng], 18, { duration: 1.2 });
      }
      openParcelById(parcelId, { lng, lat });
    },
  }));

  useEffect(() => {
    if (!selected) {
      setDemoRecords(null);
      return;
    }
    let cancelled = false;
    setDemoLoading(true);
    const baseUrl = API_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "");
    fetch(`${baseUrl}/api/parcels/${selected.properties.internal_parcel_id}/records`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setDemoRecords(data);
      })
      .catch(() => {
        if (!cancelled) {
          setDemoRecords(getMockDemoRecords(selected.properties.internal_parcel_id));
        }
      })
      .finally(() => {
        if (!cancelled) setDemoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  // Main Map Initialization Effect (Leaflet 2D Engine - Hardware Independent)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (leafletMapRef.current) return;

    const container = mapContainerRef.current;
    let map: LeafletMap | null = null;

    // Helper to format GeoJSON with IDs
    const processParcelData = (rawFeatures: any[]) => {
      return {
        type: "FeatureCollection" as const,
        features: rawFeatures.map((feat: any, i: number) => ({
          type: "Feature",
          id: feat.internal_parcel_id ?? feat.properties?.internal_parcel_id ?? i + 101,
          geometry: feat.geometry,
          properties: {
            internal_parcel_id: feat.internal_parcel_id ?? feat.properties?.internal_parcel_id ?? i + 101,
            area_sq_m: feat.area_sq_m ?? feat.properties?.area_sq_m ?? 1800,
            source: feat.source ?? feat.properties?.source ?? "OpenStreetMap",
            source_record_id: feat.source_record_id ?? feat.properties?.source_record_id ?? `way/${10482910 + i}`,
            source_last_updated: feat.source_last_updated ?? feat.properties?.source_last_updated ?? "2024-03-01",
            land_use: feat.land_use ?? feat.properties?.land_use ?? "residential",
            ulpin: feat.ulpin ?? feat.properties?.ulpin ?? `MH-PUN-HAV-KP-0429${i + 10}`,
            disclaimer: feat.disclaimer ?? feat.properties?.disclaimer ?? "Demonstration geometry.",
          },
        })),
      };
    };

    try {
      map = L.map(container, {
        center: PUNE_CENTER,
        zoom: INITIAL_ZOOM,
        zoomControl: true,
        attributionControl: true,
      });

      // Reliable, beautiful CARTO Voyager raster tiles (no WebGL / hardware acceleration required)
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          subdomains: ["a", "b", "c", "d"],
          maxZoom: 20,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/" target="_blank" rel="noreferrer">CARTO</a>',
        }
      ).addTo(map);

      leafletMapRef.current = map;

      const updateParcelsInLeaflet = async () => {
        if (!map) return;
        try {
          const bounds = map.getBounds();
          const baseUrl = API_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "");
          const url = new URL(`${baseUrl}/api/parcels/bbox`);
          url.searchParams.set("minLon", String(bounds.getWest()));
          url.searchParams.set("minLat", String(bounds.getSouth()));
          url.searchParams.set("maxLon", String(bounds.getEast()));
          url.searchParams.set("maxLat", String(bounds.getNorth()));

          let features = SAMPLE_PUNE_PARCELS;
          try {
            const res = await fetch(url.toString());
            if (res.ok) {
              const data = await res.json();
              if (data.features && data.features.length > 0) {
                features = data.features;
              }
            }
          } catch {
            // fallback to sample parcels
          }

          const geojsonData = processParcelData(features);

          if (leafletGeoJsonRef.current && map) {
            map.removeLayer(leafletGeoJsonRef.current);
          }

          const geojsonLayer = L.geoJSON(geojsonData as any, {
            style: () => ({
              fillColor: "#0284c7",
              weight: 1.5,
              opacity: 0.9,
              color: "#38bdf8",
              fillOpacity: 0.32,
            }),
            onEachFeature: (feature: any, layer: any) => {
              const p = feature.properties;
              layer.bindTooltip(
                `<div class="text-xs font-sans"><strong>Parcel #${p.internal_parcel_id}</strong><br/>${p.land_use || "land"} · ${Number(p.area_sq_m || 0).toFixed(0)} m²</div>`,
                { sticky: true, opacity: 0.95 }
              );

              layer.on({
                mouseover: (e: any) => {
                  const l = e.target;
                  l.setStyle({
                    fillColor: "#38bdf8",
                    fillOpacity: 0.65,
                    weight: 2.5,
                    color: "#ffffff",
                  });
                },
                mouseout: (e: any) => {
                  geojsonLayer.resetStyle(e.target);
                },
                click: (e: any) => {
                  setSelected({
                    properties: feature.properties,
                    lngLat: { lng: e.latlng.lng, lat: e.latlng.lat },
                  });
                },
              });
            },
          }).addTo(map);

          leafletGeoJsonRef.current = geojsonLayer;
          setParcelCount(geojsonData.features.length);
          setLoadError(null);
        } catch {
          setParcelCount(SAMPLE_PUNE_PARCELS.length);
        }
      };

      updateParcelsInLeaflet();
      map.on("moveend", updateParcelsInLeaflet);

      // Force size invalidation so tiles immediately cover full container
      setTimeout(() => map?.invalidateSize(), 150);
      setTimeout(() => map?.invalidateSize(), 500);

      const handleResize = () => {
        map?.invalidateSize();
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        if (map) {
          try {
            map.remove();
          } catch {
            // ignore cleanup errors
          }
          leafletMapRef.current = null;
        }
      };
    } catch (err: any) {
      console.error("Leaflet initialization error:", err);
      setLoadError("Failed to initialize map display.");
    }
  }, []);

  return (
    <div className="relative h-full w-full bg-[#0b0f14]">
      <div ref={mapContainerRef} className="h-full w-full" />

      {/* Top Floating Controls and Status */}
      <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2 z-[1000]">
        <div className="flex items-center gap-2">
          <div className="pointer-events-auto rounded-lg border border-white/10 bg-black/80 px-3 py-1.5 text-xs text-white/90 backdrop-blur shadow-lg font-medium">
            {parcelCount === null
              ? "Scanning Pune parcels…"
              : `${parcelCount} parcel${parcelCount === 1 ? "" : "s"} in view`}
          </div>

          <div className="pointer-events-auto rounded-lg border border-emerald-500/30 bg-emerald-950/80 px-2.5 py-1.5 text-[11px] font-medium text-emerald-300 backdrop-blur shadow-lg flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active · Live GIS
          </div>
        </div>

        {loadError && (
          <div className="pointer-events-auto max-w-sm rounded-lg border border-amber-400/30 bg-amber-950/80 px-3 py-2 text-xs text-amber-200 backdrop-blur">
            {loadError}
          </div>
        )}
      </div>

      {/* Selected Parcel Details Drawer */}
      {selected && (
        <div className="absolute bottom-6 left-1/2 max-h-[72vh] w-[92%] max-w-sm -translate-x-1/2 overflow-y-auto rounded-xl border border-white/15 bg-[#0f151bee] p-4 shadow-2xl backdrop-blur z-[1001]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-sky-400 font-semibold">
                Parcel #{selected.properties.internal_parcel_id}
              </p>
              <p className="mt-1 text-lg font-medium text-white">
                {selected.properties.area_sq_m
                  ? `${selected.properties.area_sq_m.toFixed(1)} m²`
                  : "Area unknown"}
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {selected.properties.ulpin && (
            <button
              onClick={() => setProfileUlpin(selected.properties.ulpin)}
              className="mt-3 flex w-full items-center justify-between rounded-md border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-300 hover:bg-sky-500/20 transition"
            >
              <span className="font-mono">{selected.properties.ulpin}</span>
              <span>Open full ULPIN profile →</span>
            </button>
          )}

          <p className="mb-1 mt-3 text-[10px] uppercase tracking-wide text-white/30 font-medium">Geometry (OSM Pune)</p>
          <dl className="space-y-1 text-xs text-white/70">
            <div className="flex justify-between gap-4">
              <dt className="text-white/40">Land use</dt>
              <dd className="capitalize text-white/90">{selected.properties.land_use ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/40">Source</dt>
              <dd>{selected.properties.source}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/40">OSM id</dt>
              <dd className="font-mono text-white/80">{selected.properties.source_record_id}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/40">Last updated</dt>
              <dd>
                {selected.properties.source_last_updated
                  ? new Date(selected.properties.source_last_updated).toLocaleDateString()
                  : "—"}
              </dd>
            </div>
          </dl>

          {demoRecords?.land_system && demoRecords.land_system.code !== "unknown" && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-orange-400 font-semibold">
                Land system: {demoRecords.land_system.label}
              </p>
              <p className="text-[11px] leading-snug text-white/60">{demoRecords.land_system.message}</p>
            </div>
          )}

          <div className="mt-3 border-t border-white/10 pt-3">
            <p className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-amber-400 font-semibold">
              Land record
              <span className="rounded bg-amber-400/20 px-1 py-px text-[9px] normal-case text-amber-300">demo</span>
            </p>
            {demoLoading && <p className="text-xs text-white/40">Loading records…</p>}
            {!demoLoading && demoRecords?.available && (
              <>
                <dl className="space-y-1 text-xs text-white/70">
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/40">Survey no.</dt>
                    <dd className="font-mono text-white/90">{demoRecords.survey_no}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/40">ULPIN</dt>
                    <dd className="text-white/80">{demoRecords.ulpin_status ?? "Generated"}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/40">Village</dt>
                    <dd>{demoRecords.village}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/40">Taluka / District</dt>
                    <dd>{demoRecords.taluka}, {demoRecords.district}</dd>
                  </div>
                </dl>

                <p className="mb-1 mt-2 text-[10px] uppercase tracking-wide text-white/30 font-medium">Owners</p>
                <ul className="space-y-0.5 text-xs text-white/70">
                  {demoRecords.owners?.map((o, i) => (
                    <li key={i} className="flex justify-between gap-4">
                      <span>{o.name}</span>
                      <span className="text-white/40">{o.ownership_share}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <RecordBadge label="7/12" ok={!!demoRecords.records?.seven_twelve} />
                  <RecordBadge label="8A" ok={!!demoRecords.records?.eight_a} />
                  <RecordBadge label="Property card" ok={!!demoRecords.records?.property_card} />
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/50">
                    {demoRecords.records?.mutation_count ?? 0} mutation record(s)
                  </span>
                </div>
              </>
            )}
            {!demoLoading && demoRecords && !demoRecords.available && (
              <p className="text-xs text-white/40">No demo record generated for this parcel.</p>
            )}
          </div>

          <p className="mt-3 border-t border-white/10 pt-2 text-[11px] leading-snug text-white/40">
            {selected.properties.disclaimer}
          </p>
          {demoRecords?.available && (
            <p className="mt-1 text-[11px] leading-snug text-amber-300/70">{demoRecords.disclaimer}</p>
          )}
        </div>
      )}

      {profileUlpin && <ParcelProfileDrawer ulpin={profileUlpin} onClose={() => setProfileUlpin(null)} />}
    </div>
  );
});

function RecordBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] ${
        ok ? "bg-emerald-400/15 text-emerald-300" : "bg-white/5 text-white/30"
      }`}
    >
      {ok ? "✓" : "—"} {label}
    </span>
  );
}

export default ParcelMap;
