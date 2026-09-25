"use client";

// Organic aerial-farmland pattern — self-contained SVG (no external photo
// dependency to break during a demo). Irregular curved plot boundaries,
// varied crop-row textures, small water tanks and tree clusters, styled
// after real aerial agricultural photography rather than blocky rectangles.

const PLOTS = [
  { d: "M0,60 L180,20 L260,120 L190,230 L40,260 L-40,180 Z", fill: "#5c6b34" },
  { d: "M180,20 L400,0 L430,140 L260,120 Z", fill: "#7a8f45" },
  { d: "M400,0 L640,10 L610,150 L430,140 Z", fill: "#8a9a5b" },
  { d: "M640,10 L880,30 L860,170 L610,150 Z", fill: "#6b7d3a" },
  { d: "M880,30 L1120,0 L1150,160 L860,170 Z", fill: "#94815a" },
  { d: "M1120,0 L1440,20 L1420,180 L1150,160 Z", fill: "#5c6b34" },

  { d: "M-40,180 L190,230 L170,400 L-60,410 Z", fill: "#8a7247" },
  { d: "M190,230 L260,120 L430,140 L400,320 L170,400 Z", fill: "#7a8f45" },
  { d: "M430,140 L610,150 L590,340 L400,320 Z", fill: "#9a8258" },
  { d: "M610,150 L860,170 L840,350 L590,340 Z", fill: "#6b7d3a" },
  { d: "M860,170 L1150,160 L1140,360 L840,350 Z", fill: "#8a9a5b" },
  { d: "M1150,160 L1420,180 L1440,370 L1140,360 Z", fill: "#5c6b34" },

  { d: "M-60,410 L170,400 L200,600 L-70,610 Z", fill: "#6b5a35" },
  { d: "M170,400 L400,320 L440,560 L200,600 Z", fill: "#8a9a5b" },
  { d: "M400,320 L590,340 L620,570 L440,560 Z", fill: "#5c6b34" },
  { d: "M590,340 L840,350 L860,580 L620,570 Z", fill: "#7a8f45" },
  { d: "M840,350 L1140,360 L1150,590 L860,580 Z", fill: "#94815a" },
  { d: "M1140,360 L1440,370 L1460,600 L1150,590 Z", fill: "#6b7d3a" },

  { d: "M-70,610 L200,600 L230,800 L-90,810 Z", fill: "#8a9a5b" },
  { d: "M200,600 L440,560 L470,790 L230,800 Z", fill: "#6b5a35" },
  { d: "M440,560 L620,570 L650,800 L470,790 Z", fill: "#9a8258" },
  { d: "M620,570 L860,580 L880,810 L650,800 Z", fill: "#5c6b34" },
  { d: "M860,580 L1150,590 L1160,820 L880,810 Z", fill: "#7a8f45" },
  { d: "M1150,590 L1460,600 L1480,830 L1160,820 Z", fill: "#8a7247" },
];

const ROW_GROUPS = [
  { x: 40, y: 40, w: 200, rows: 9, angle: -8 },
  { x: 280, y: 60, w: 180, rows: 8, angle: 4 },
  { x: 700, y: 60, w: 220, rows: 10, angle: -3 },
  { x: 60, y: 260, w: 200, rows: 9, angle: 6 },
  { x: 460, y: 380, w: 180, rows: 8, angle: -5 },
  { x: 900, y: 400, w: 200, rows: 9, angle: 3 },
  { x: 240, y: 640, w: 200, rows: 9, angle: -6 },
  { x: 680, y: 640, w: 200, rows: 9, angle: 5 },
  { x: 1100, y: 620, w: 180, rows: 8, angle: -4 },
];

const TANKS = [
  { x: 990, y: 190, w: 60, h: 40 },
  { x: 520, y: 490, w: 50, h: 35 },
  { x: 1230, y: 60, w: 55, h: 38 },
];

const TREE_CLUSTERS = [
  { cx: 720, cy: 260, n: 14, r: 70 },
  { cx: 300, cy: 500, n: 10, r: 55 },
  { cx: 1000, cy: 700, n: 12, r: 60 },
];

function rowLines(x: number, y: number, w: number, rows: number, angle: number) {
  const lines = [];
  for (let i = 0; i <= rows; i++) {
    const ly = y + i * (w / rows);
    lines.push(
      <line
        key={`${x}-${y}-${i}`}
        x1={x}
        y1={ly}
        x2={x + w}
        y2={ly}
        transform={`rotate(${angle} ${x + w / 2} ${y + w / 2})`}
      />
    );
  }
  return lines;
}

function seededRand(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export default function FarmlandBackground({ className }: { className?: string }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
        <g>
          {PLOTS.map((p, i) => (
            <path key={i} d={p.d} fill={p.fill} stroke="#f6f1e6" strokeWidth="2.5" strokeOpacity="0.5" />
          ))}
        </g>

        <g stroke="#2b2415" strokeOpacity="0.16" strokeWidth="1.4">
          {ROW_GROUPS.map((g, i) => rowLines(g.x, g.y, g.w, g.rows, g.angle))}
        </g>

        {/* winding dirt path */}
        <path
          d="M0,340 C200,320 260,420 420,400 C620,375 680,300 860,330 C1050,360 1150,470 1440,430"
          fill="none"
          stroke="#c9b585"
          strokeWidth="14"
          strokeOpacity="0.55"
        />

        {TREE_CLUSTERS.map((c, ci) => (
          <g key={ci}>
            {Array.from({ length: c.n }).map((_, i) => {
              const a = (i / c.n) * Math.PI * 2 + seededRand(ci * 97 + i);
              const rr = c.r * (0.4 + 0.6 * seededRand(i + ci * 13));
              return (
                <circle
                  key={i}
                  cx={c.cx + Math.cos(a) * rr}
                  cy={c.cy + Math.sin(a) * rr * 0.6}
                  r={6 + seededRand(i * 3 + ci) * 5}
                  fill="#3d5636"
                  fillOpacity="0.65"
                />
              );
            })}
          </g>
        ))}

        {TANKS.map((t, i) => (
          <rect key={i} x={t.x} y={t.y} width={t.w} height={t.h} rx="3" fill="#3f6b7a" fillOpacity="0.75" />
        ))}

        {/* vignette for text legibility, strongest at the top where the headline sits */}
        <defs>
          <linearGradient id="heroVignette" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a160d" stopOpacity="0.55" />
            <stop offset="38%" stopColor="#1a160d" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#1a160d" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="1440" height="900" fill="url(#heroVignette)" />
      </svg>
    </div>
  );
}
