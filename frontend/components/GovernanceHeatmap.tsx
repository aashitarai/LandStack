"use client";

import { useEffect, useRef } from "react";
import L, { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

type Point = {
  ulpin: string;
  lat: number;
  lng: number;
  risk_score: number;
  risk_label: string;
  scenario: string;
  anomaly_count: number;
};

const RISK_COLOR: Record<string, string> = {
  Low: "#22c55e",
  Moderate: "#f59e0b",
  High: "#ef4444",
};

export default function GovernanceHeatmap({ points }: { points: Point[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || leafletMapRef.current) return;
    const container = containerRef.current;

    try {
      const map = L.map(container, {
        center: [18.8, 73.5],
        zoom: 8,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          subdomains: ["a", "b", "c", "d"],
          maxZoom: 18,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/" target="_blank" rel="noreferrer">CARTO</a>',
        }
      ).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      leafletMapRef.current = map;

      setTimeout(() => map.invalidateSize(), 150);
      setTimeout(() => map.invalidateSize(), 500);
    } catch (err) {
      console.warn("Leaflet heatmap init error:", err);
    }

    return () => {
      if (leafletMapRef.current) {
        try {
          leafletMapRef.current.remove();
        } catch {
          // ignore
        }
        leafletMapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!leafletMapRef.current || !markersLayerRef.current) return;
    const group = markersLayerRef.current;
    group.clearLayers();

    points.forEach((p) => {
      const color = RISK_COLOR[p.risk_label] || "#3b82f6";
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: 7,
        color: "#ffffff",
        fillColor: color,
        fillOpacity: 0.85,
        weight: 1.5,
      }).bindPopup(
        `<div class="text-xs p-1"><strong>ULPIN:</strong> ${p.ulpin}<br/><strong>Risk:</strong> <span style="color:${color};font-weight:600">${p.risk_label} (${p.risk_score})</span><br/><strong>Anomalies:</strong> ${p.anomaly_count}</div>`
      );
      group.addLayer(marker);
    });
  }, [points]);

  return <div ref={containerRef} className="h-full w-full rounded-lg" />;
}
