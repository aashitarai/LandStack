import { NextResponse } from "next/server";
import { SAMPLE_PUNE_PARCELS } from "@/lib/sampleParcels";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const parcelId = parseInt(params?.id || "101", 10);
  const found =
    SAMPLE_PUNE_PARCELS.find((p) => p.properties.internal_parcel_id === parcelId) ||
    SAMPLE_PUNE_PARCELS[0];

  return NextResponse.json({
    ...found.properties,
    geometry: found.geometry,
  });
}
