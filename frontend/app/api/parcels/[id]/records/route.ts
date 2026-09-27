import { NextResponse } from "next/server";
import { getMockDemoRecords } from "@/lib/sampleParcels";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const parcelId = parseInt(params?.id || "101", 10);
  const records = getMockDemoRecords(isNaN(parcelId) ? 101 : parcelId);
  return NextResponse.json(records);
}
