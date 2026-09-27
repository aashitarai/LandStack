"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import maplibregl, { Map as MLMap, MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import ParcelProfileDrawer from "./ParcelProfileDrawer";

// Central Pune — Koregaon Park / Camp area, same bounding box the ingestion
// script (backend/ingest/fetch_osm_pune.py) pulls OSM footprints for.
const PUNE_CENTER: [number, number] = [73.8835, 18.5400];
const INITIAL_ZOOM = 16.5;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

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
  const mapRef = useRef<MLMap | null>(null);
  const [selected, setSelected] = useState<SelectedParcel | null>(null);
  const [demoRecords, setDemoRecords] = useState<DemoRecords | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [parcelCount, setParcelCount] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profileUlpin, setProfileUlpin] = useState<string | null>(null);

  async function openParcelById(parcelId: number, lngLat: { lng: number; lat: number }) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/parcels/${parcelId}`);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const feature = await res.json();
      setSelected({
        properties: {
          internal_parcel_id: feature.internal_parcel_id,
          area_sq_m: feature.area_sq_m,
          source: feature.source,
          source_record_id: feature.source_record_id,
          source_last_updated: feature.source_last_updated,
          land_use: feature.land_use,
          ulpin: feature.ulpin,
          disclaimer: feature.disclaimer,
        },
        lngLat,
      });
    } catch {
      // silently ignore — the map view itself already flew to the location
    }
  }

  useImperativeHandle(ref, () => ({
    flyTo(lat, lng, zoom = 17) {
      mapRef.current?.flyTo({ center: [lng, lat], zoom, essential: true });
    },
    selectParcel(parcelId, lat, lng) {
      mapRef.current?.flyTo({ center: [lng, lat], zoom: 18, essential: true });
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
    fetch(`${API_BASE_URL}/api/parcels/${selected.properties.internal_parcel_id}/records`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setDemoRecords(data);
      })
      .catch(() => {
        if (!cancelled) setDemoRecords(null);
      })
      .finally(() => {
        if (!cancelled) setDemoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: PUNE_CENTER,
      zoom: INITIAL_ZOOM,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({}), "top-right");
    map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), "top-right");

    map.on("load", () => {
      map.addSource("parcels", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "parcels-fill",
        type: "fill",
        source: "parcels",
        paint: {
          "fill-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            "#7dd3fc",
            "#38bdf8",
          ],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.55,
            0.28,
          ],
        },
      });

      map.addLayer({
        id: "parcels-outline",
        type: "line",
        source: "parcels",
        paint: {
          "line-color": "#0ea5e9",
          "line-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            2.5,
            1.2,
          ],
        },
      });

      let hoveredId: number | string | null = null;

      map.on("mousemove", "parcels-fill", (e: MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = "pointer";
        if (!e.features || e.features.length === 0) return;
        const id = e.features[0].id;
        if (id === undefined) return;
        if (hoveredId !== null && hoveredId !== id) {
          map.setFeatureState({ source: "parcels", id: hoveredId }, { hover: false });
        }
        hoveredId = id;
        map.setFeatureState({ source: "parcels", id }, { hover: true });
      });

      map.on("mouseleave", "parcels-fill", () => {
        map.getCanvas().style.cursor = "";
        if (hoveredId !== null) {
          map.setFeatureState({ source: "parcels", id: hoveredId }, { hover: false });
        }
        hoveredId = null;
      });

      map.on("click", "parcels-fill", (e: MapLayerMouseEvent) => {
        if (!e.features || e.features.length === 0) return;
        const f = e.features[0];
        setSelected({
          properties: f.properties as ParcelProperties,
          lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat },
        });
      });

      const loadParcelsForViewport = async () => {
        const bounds = map.getBounds();
        const url = new URL(`${API_BASE_URL}/api/parcels/bbox`);
        url.searchParams.set("minLon", String(bounds.getWest()));
        url.searchParams.set("minLat", String(bounds.getSouth()));
        url.searchParams.set("maxLon", String(bounds.getEast()));
        url.searchParams.set("maxLat", String(bounds.getNorth()));
        try {
          const res = await fetch(url.toString());
          if (!res.ok) throw new Error(`API returned ${res.status}`);
          const data = await res.json();
          const withIds = {
            ...data,
            features: (data.features ?? []).map((feat: any, i: number) => ({
              type: "Feature",
              id: feat.internal_parcel_id ?? i,
              geometry: feat.geometry,
              properties: {
                internal_parcel_id: feat.internal_parcel_id,
                area_sq_m: feat.area_sq_m,
                source: feat.source,
                source_record_id: feat.source_record_id,
                source_last_updated: feat.source_last_updated,
                land_use: feat.land_use,
                ulpin: feat.ulpin,
                disclaimer: feat.disclaimer,
              },
            })),
          };
          const src = map.getSource("parcels") as maplibregl.GeoJSONSource | undefined;
          src?.setData(withIds);
          setParcelCount(withIds.features.length);
          setLoadError(null);
        } catch (err: any) {
          setLoadError(
            `Could not load parcels from the API (${API_BASE_URL}). Is the backend running and has the ingestion script been run? (${err.message})`
          );
        }
      };

      loadParcelsForViewport();
      map.on("moveend", loadParcelsForViewport);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainerRef} className="h-full w-full" />

      <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2">
        <div className="pointer-events-auto rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white/70 backdrop-blur">
          {parcelCount === null
            ? "Loading parcels…"
            : `${parcelCount} parcel${parcelCount === 1 ? "" : "s"} in view`}
        </div>
        {loadError && (
          <div className="pointer-events-auto max-w-sm rounded-lg border border-amber-400/30 bg-amber-950/80 px-3 py-2 text-xs text-amber-200 backdrop-blur">
            {loadError}
          </div>
        )}
      </div>

      {selected && (
        <div className="absolute bottom-6 left-1/2 max-h-[70vh] w-[92%] max-w-sm -translate-x-1/2 overflow-y-auto rounded-xl border border-white/10 bg-[#0f151bee] p-4 shadow-2xl backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-sky-400">
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
              className="rounded-md px-2 py-1 text-white/50 hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {selected.properties.ulpin && (
            <button
              onClick={() => setProfileUlpin(selected.properties.ulpin)}
              className="mt-3 flex w-full items-center justify-between rounded-md border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-300 hover:bg-sky-500/20"
            >
              <span className="font-mono">{selected.properties.ulpin}</span>
              <span>Open full ULPIN profile →</span>
            </button>
          )}

          <p className="mb-1 mt-3 text-[10px] uppercase tracking-wide text-white/30">Geometry (real)</p>
          <dl className="space-y-1 text-xs text-white/70">
            <div className="flex justify-between gap-4">
              <dt className="text-white/40">Land use</dt>
              <dd>{selected.properties.land_use ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/40">Source</dt>
              <dd>{selected.properties.source}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/40">OSM id</dt>
              <dd className="font-mono">{selected.properties.source_record_id}</dd>
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
              <p className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-orange-400">
                Land system: {demoRecords.land_system.label}
              </p>
              <p className="text-[11px] leading-snug text-white/60">{demoRecords.land_system.message}</p>
            </div>
          )}

          <div className="mt-3 border-t border-white/10 pt-3">
            <p className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-amber-400">
              Land record
              <span className="rounded bg-amber-400/20 px-1 py-px text-[9px] normal-case text-amber-300">demo</span>
            </p>
            {demoLoading && <p className="text-xs text-white/40">Loading…</p>}
            {!demoLoading && demoRecords?.available && (
              <>
                <dl className="space-y-1 text-xs text-white/70">
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/40">Survey no.</dt>
                    <dd className="font-mono">{demoRecords.survey_no}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/40">ULPIN</dt>
                    <dd>unavailable</dd>
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

                <p className="mb-1 mt-2 text-[10px] uppercase tracking-wide text-white/30">Owners</p>
                <ul className="space-y-0.5 text-xs text-white/70">
                  {demoRecords.owners?.map((o, i) => (
                    <li key={i} className="flex justify-between gap-4">
                      <span>{o.name}</span>
                      <span className="text-white/40">{o.ownership_share}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-2 flex flex-wrap gap-1.5">
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
