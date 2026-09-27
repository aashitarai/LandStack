export type SampleParcel = {
  type: "Feature";
  id: number;
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
  properties: {
    internal_parcel_id: number;
    area_sq_m: number;
    source: string;
    source_record_id: string;
    source_last_updated: string;
    land_use: string;
    ulpin: string;
    disclaimer: string;
  };
};

export const SAMPLE_PUNE_PARCELS: SampleParcel[] = [
  {
    type: "Feature",
    id: 101,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [73.8820, 18.5390],
          [73.8835, 18.5390],
          [73.8835, 18.5402],
          [73.8820, 18.5402],
          [73.8820, 18.5390],
        ],
      ],
    },
    properties: {
      internal_parcel_id: 101,
      area_sq_m: 1850.5,
      source: "OpenStreetMap",
      source_record_id: "way/10482910",
      source_last_updated: "2024-02-18T10:30:00Z",
      land_use: "commercial",
      ulpin: "MH-PUN-HAV-KP-042918",
      disclaimer: "OpenStreetMap crowd-sourced building/landuse footprint. Research and visualization demonstration only. Not official survey cadastral boundary.",
    },
  },
  {
    type: "Feature",
    id: 102,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [73.8838, 18.5391],
          [73.8852, 18.5391],
          [73.8852, 18.5404],
          [73.8838, 18.5404],
          [73.8838, 18.5391],
        ],
      ],
    },
    properties: {
      internal_parcel_id: 102,
      area_sq_m: 2120.0,
      source: "OpenStreetMap",
      source_record_id: "way/10482911",
      source_last_updated: "2024-03-01T14:15:00Z",
      land_use: "residential",
      ulpin: "MH-PUN-HAV-KP-042919",
      disclaimer: "OpenStreetMap crowd-sourced building/landuse footprint. Research and visualization demonstration only. Not official survey cadastral boundary.",
    },
  },
  {
    type: "Feature",
    id: 103,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [73.8815, 18.5405],
          [73.8830, 18.5405],
          [73.8830, 18.5418],
          [73.8815, 18.5418],
          [73.8815, 18.5405],
        ],
      ],
    },
    properties: {
      internal_parcel_id: 103,
      area_sq_m: 1640.8,
      source: "OpenStreetMap",
      source_record_id: "way/10482912",
      source_last_updated: "2024-01-20T09:40:00Z",
      land_use: "residential",
      ulpin: "MH-PUN-HAV-KP-042920",
      disclaimer: "OpenStreetMap crowd-sourced building/landuse footprint. Research and visualization demonstration only. Not official survey cadastral boundary.",
    },
  },
  {
    type: "Feature",
    id: 104,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [73.8834, 18.5407],
          [73.8850, 18.5407],
          [73.8850, 18.5420],
          [73.8834, 18.5420],
          [73.8834, 18.5407],
        ],
      ],
    },
    properties: {
      internal_parcel_id: 104,
      area_sq_m: 2340.2,
      source: "OpenStreetMap",
      source_record_id: "way/10482913",
      source_last_updated: "2024-02-12T16:00:00Z",
      land_use: "commercial",
      ulpin: "MH-PUN-HAV-KP-042921",
      disclaimer: "OpenStreetMap crowd-sourced building/landuse footprint. Research and visualization demonstration only. Not official survey cadastral boundary.",
    },
  },
  {
    type: "Feature",
    id: 105,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [73.8855, 18.5395],
          [73.8872, 18.5395],
          [73.8872, 18.5410],
          [73.8855, 18.5410],
          [73.8855, 18.5395],
        ],
      ],
    },
    properties: {
      internal_parcel_id: 105,
      area_sq_m: 2890.6,
      source: "OpenStreetMap",
      source_record_id: "way/10482914",
      source_last_updated: "2024-03-10T11:25:00Z",
      land_use: "civic",
      ulpin: "MH-PUN-HAV-KP-042922",
      disclaimer: "OpenStreetMap crowd-sourced building/landuse footprint. Research and visualization demonstration only. Not official survey cadastral boundary.",
    },
  },
  {
    type: "Feature",
    id: 106,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [73.8795, 18.5385],
          [73.8812, 18.5385],
          [73.8812, 18.5398],
          [73.8795, 18.5398],
          [73.8795, 18.5385],
        ],
      ],
    },
    properties: {
      internal_parcel_id: 106,
      area_sq_m: 1980.3,
      source: "OpenStreetMap",
      source_record_id: "way/10482915",
      source_last_updated: "2024-02-05T08:50:00Z",
      land_use: "residential",
      ulpin: "MH-PUN-HAV-KP-042923",
      disclaimer: "OpenStreetMap crowd-sourced building/landuse footprint. Research and visualization demonstration only. Not official survey cadastral boundary.",
    },
  },
  {
    type: "Feature",
    id: 107,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [73.8825, 18.5372],
          [73.8842, 18.5372],
          [73.8842, 18.5386],
          [73.8825, 18.5386],
          [73.8825, 18.5372],
        ],
      ],
    },
    properties: {
      internal_parcel_id: 107,
      area_sq_m: 2450.0,
      source: "OpenStreetMap",
      source_record_id: "way/10482916",
      source_last_updated: "2024-03-04T12:00:00Z",
      land_use: "mixed",
      ulpin: "MH-PUN-HAV-KP-042924",
      disclaimer: "OpenStreetMap crowd-sourced building/landuse footprint. Research and visualization demonstration only. Not official survey cadastral boundary.",
    },
  },
  {
    type: "Feature",
    id: 108,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [73.8845, 18.5375],
          [73.8860, 18.5375],
          [73.8860, 18.5389],
          [73.8845, 18.5389],
          [73.8845, 18.5375],
        ],
      ],
    },
    properties: {
      internal_parcel_id: 108,
      area_sq_m: 1780.4,
      source: "OpenStreetMap",
      source_record_id: "way/10482917",
      source_last_updated: "2024-01-15T15:30:00Z",
      land_use: "residential",
      ulpin: "MH-PUN-HAV-KP-042925",
      disclaimer: "OpenStreetMap crowd-sourced building/landuse footprint. Research and visualization demonstration only. Not official survey cadastral boundary.",
    },
  },
  {
    type: "Feature",
    id: 109,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [73.8865, 18.5378],
          [73.8885, 18.5378],
          [73.8885, 18.5392],
          [73.8865, 18.5392],
          [73.8865, 18.5378],
        ],
      ],
    },
    properties: {
      internal_parcel_id: 109,
      area_sq_m: 3100.0,
      source: "OpenStreetMap",
      source_record_id: "way/10482918",
      source_last_updated: "2024-02-28T17:40:00Z",
      land_use: "commercial",
      ulpin: "MH-PUN-HAV-KP-042926",
      disclaimer: "OpenStreetMap crowd-sourced building/landuse footprint. Research and visualization demonstration only. Not official survey cadastral boundary.",
    },
  },
  {
    type: "Feature",
    id: 110,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [73.8810, 18.5422],
          [73.8828, 18.5422],
          [73.8828, 18.5436],
          [73.8810, 18.5436],
          [73.8810, 18.5422],
        ],
      ],
    },
    properties: {
      internal_parcel_id: 110,
      area_sq_m: 2200.0,
      source: "OpenStreetMap",
      source_record_id: "way/10482919",
      source_last_updated: "2024-03-12T13:10:00Z",
      land_use: "residential",
      ulpin: "MH-PUN-HAV-KP-042927",
      disclaimer: "OpenStreetMap crowd-sourced building/landuse footprint. Research and visualization demonstration only. Not official survey cadastral boundary.",
    },
  },
  {
    type: "Feature",
    id: 111,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [73.8832, 18.5425],
          [73.8850, 18.5425],
          [73.8850, 18.5439],
          [73.8832, 18.5439],
          [73.8832, 18.5425],
        ],
      ],
    },
    properties: {
      internal_parcel_id: 111,
      area_sq_m: 2580.9,
      source: "OpenStreetMap",
      source_record_id: "way/10482920",
      source_last_updated: "2024-02-22T10:05:00Z",
      land_use: "mixed",
      ulpin: "MH-PUN-HAV-KP-042928",
      disclaimer: "OpenStreetMap crowd-sourced building/landuse footprint. Research and visualization demonstration only. Not official survey cadastral boundary.",
    },
  },
  {
    type: "Feature",
    id: 112,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [73.8855, 18.5415],
          [73.8875, 18.5415],
          [73.8875, 18.5430],
          [73.8855, 18.5430],
          [73.8855, 18.5415],
        ],
      ],
    },
    properties: {
      internal_parcel_id: 112,
      area_sq_m: 2950.0,
      source: "OpenStreetMap",
      source_record_id: "way/10482921",
      source_last_updated: "2024-03-08T09:15:00Z",
      land_use: "commercial",
      ulpin: "MH-PUN-HAV-KP-042929",
      disclaimer: "OpenStreetMap crowd-sourced building/landuse footprint. Research and visualization demonstration only. Not official survey cadastral boundary.",
    },
  },
];

export function getMockDemoRecords(parcelId: number) {
  const p = SAMPLE_PUNE_PARCELS.find((x) => x.properties.internal_parcel_id === parcelId) || SAMPLE_PUNE_PARCELS[0];
  const sNum = `${(parcelId * 7) % 89 + 1}/${(parcelId % 4) + 1}`;
  return {
    available: true,
    disclaimer: "DEMO DATA — NOT A GOVERNMENT RECORD. Generated synthetically for SIH 2026 prototype evaluation.",
    survey_no: sNum,
    village: "Koregaon Park",
    taluka: "Haveli",
    district: "Pune",
    land_system: {
      code: "urban_pmc",
      label: "Urban (Pune Municipal Corporation)",
      message: "Inside PMC municipal limits; governed by City Survey (CTS) & Property Card framework.",
    },
    ulpin_status: "ULPIN generated from OSM bounding box reference",
    owners: [
      { name: "Rameshwar Deshmukh", ownership_share: "1/2", ownership_type: "Individual (Co-owner)" },
      { name: "Sunita R. Deshmukh", ownership_share: "1/2", ownership_type: "Individual (Co-owner)" },
    ],
    records: {
      seven_twelve: true,
      eight_a: true,
      property_card: true,
      mutation_count: 2,
    },
  };
}
