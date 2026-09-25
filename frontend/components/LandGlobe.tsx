"use client";

import { useEffect, useRef } from "react";
import createGlobe from "cobe";

// Maharashtra + a few reference points, in an earthy land-survey palette —
// not a generic tech-startup blue globe.
const MARKERS: [number, number][] = [
  [18.5204, 73.8567], // Pune
  [19.076, 72.8777], // Mumbai
  [19.033, 73.0297], // Kharghar/Panvel
  [28.6139, 77.209], // Delhi
  [13.0827, 80.2707], // Chennai
  [12.9716, 77.5946], // Bengaluru
];

export default function LandGlobe({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    let phi = 0;
    let width = 0;
    const onResize = () => canvasRef.current && (width = canvasRef.current.offsetWidth);
    window.addEventListener("resize", onResize);
    onResize();

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.32,
      dark: 0,
      diffuse: 1.3,
      mapSamples: 28000,
      mapBrightness: 4.2,
      baseColor: [0.86, 0.82, 0.71], // parchment / land tone
      markerColor: [0.42, 0.32, 0.18], // soil brown
      glowColor: [0.55, 0.62, 0.42], // olive green glow
      markers: MARKERS.map(([lat, lng]) => ({ location: [lat, lng] as [number, number], size: 0.07 })),
      onRender: (state) => {
        state.phi = phi;
        phi += 0.0028;
        state.width = width * 2;
        state.height = width * 2;
      },
    });

    return () => globe.destroy();
  }, []);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", aspectRatio: 1, maxWidth: "100%" }}
      />
    </div>
  );
}
