"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type Point = { ulpin: string; lat: number; lng: number; risk_score: number; risk_label: string; scenario: string; anomaly_count: number };

const RISK_COLOR: Record<string, string> = { Low: "#22c55e", Moderate: "#f59e0b", High: "#ef4444" };

export default function GovernanceHeatmap({ points }: { points: Point[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [73.5, 18.8],
      zoom: 8,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({}), "top-right");
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || points.length === 0) return;
    const addLayer = () => {
      const geojson = {
        type: "FeatureCollection" as const,
        features: points.map((p) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
          properties: p,
        })),
      };
      if (map.getSource("risk-points")) {
        (map.getSource("risk-points") as maplibregl.GeoJSONSource).setData(geojson as any);
      } else {
        map.addSource("risk-points", { type: "geojson", data: geojson as any });
        map.addLayer({
          id: "risk-points-layer",
          type: "circle",
          source: "risk-points",
          paint: {
            "circle-radius": 4,
            "circle-color": [
              "match", ["get", "risk_label"],
              "High", RISK_COLOR.High,
              "Moderate", RISK_COLOR.Moderate,
              RISK_COLOR.Low,
            ],
            "circle-opacity": 0.75,
          },
        });
      }
    };
    if (map.loaded()) addLayer();
    else map.on("load", addLayer);
  }, [points]);

  return <div ref={containerRef} className="h-full w-full rounded-lg" />;
}
