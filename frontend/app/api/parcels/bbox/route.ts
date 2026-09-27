import { NextResponse } from "next/server";
import { SAMPLE_PUNE_PARCELS } from "@/lib/sampleParcels";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const minLon = parseFloat(searchParams.get("minLon") || "-180");
  const minLat = parseFloat(searchParams.get("minLat") || "-90");
  const maxLon = parseFloat(searchParams.get("maxLon") || "180");
  const maxLat = parseFloat(searchParams.get("maxLat") || "90");

  const filtered = SAMPLE_PUNE_PARCELS.filter((p) => {
    const coords = p.geometry.coordinates[0];
    const avgLng = coords.reduce((acc, c) => acc + c[0], 0) / coords.length;
    const avgLat = coords.reduce((acc, c) => acc + c[1], 0) / coords.length;
    return avgLng >= minLon && avgLng <= maxLon && avgLat >= minLat && avgLat <= maxLat;
  });

  const featuresToReturn = filtered.length > 0 ? filtered : SAMPLE_PUNE_PARCELS;

  return NextResponse.json({
    type: "FeatureCollection",
    count: featuresToReturn.length,
    disclaimer: "OpenStreetMap crowd-sourced building/landuse footprints for central Pune demo. Not official cadastral boundaries.",
    features: featuresToReturn,
  });
}
