"use client";

import Link from "next/link";
import { motion } from "framer-motion";

// Real aerial farmland photography (Unsplash License — free to use, by Bernd
// Dittrich). Hotlinked from Unsplash's CDN, not rehosted.
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1719178006695-e0e36780adac?auto=format&fit=crop&w=2400&q=80";
const BAND_IMAGE =
  "https://images.unsplash.com/photo-1772912138800-3ee8b14000c5?auto=format&fit=crop&w=2400&q=80";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const FEATURES = [
  {
    tag: "01",
    title: "GIS parcel map, real geometry",
    desc: "Every parcel rendered from real OpenStreetMap footprint data — pan, zoom, search, and click straight into a parcel's full record. Not a mockup, not a static screenshot.",
  },
  {
    tag: "02",
    title: "ULPIN as the single key",
    desc: "One identifier connects ownership, registration, tax, mortgage, building approval, restrictions, and utilities for the same parcel — instead of nine separate department logins.",
  },
  {
    tag: "03",
    title: "Cross-department anomaly detection",
    desc: "The system compares the same fact — area, owner, land use — across departments and flags disagreements, with the evidence and confidence shown, not hidden behind a black box.",
  },
  {
    tag: "04",
    title: "Explainable property risk score",
    desc: "A 0–100 due-diligence indicator built from ownership consistency, mortgage, tax, approvals, and restrictions — every point of the score traces back to a stated reason.",
  },
  {
    tag: "05",
    title: "Satellite change timeline",
    desc: "A year-by-year land-use timeline per parcel, flagging built-up change against the officially recorded use — sent for human verification, never treated as a legal finding.",
  },
  {
    tag: "06",
    title: "State Adapter Framework",
    desc: "Maharashtra, Tamil Nadu, Karnataka, and Uttar Pradesh each use different field names for the same facts. A configuration-driven adapter maps each into one common schema — adding a state means writing a mapping, not rewriting the core.",
  },
];

const FLOW = [
  "Open the map",
  "Select a parcel",
  "Resolve its ULPIN",
  "Read the unified profile",
  "See cross-department anomalies",
  "Check the risk score",
  "Officer opens a verification workflow",
  "Governance dashboard tracks it all",
];

export default function Landing() {
  return (
    <main className="min-h-screen bg-[#f6f1e6] text-[#2b2415]">
      <nav className="absolute inset-x-0 top-0 z-30 flex h-16 items-center justify-between px-6 md:px-10">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#c8d9a8]" />
          <span className="text-sm font-semibold tracking-tight text-white">LandStack</span>
        </div>
        <div className="hidden items-center gap-8 text-sm text-white/75 md:flex">
          <a href="#features" className="hover:text-white">Features</a>
          <a href="#flow" className="hover:text-white">How it works</a>
          <a href="#adapters" className="hover:text-white">State Adapters</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-white/75 hover:text-white">Sign in</Link>
          <Link
            href="/dashboard"
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#2b2415] transition hover:bg-white/90"
          >
            Open the map
          </Link>
        </div>
      </nav>

      {/* HERO — static aerial-field background, no scroll/zoom effects */}
      <section className="relative flex h-screen items-center justify-center overflow-hidden px-6">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#1a160d]/60 via-[#1a160d]/20 to-[#1a160d]/40" />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/20 px-4 py-1.5 text-xs text-white/85 backdrop-blur-sm"
          >
            SIH 2026 · Problem Statement 26014
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl font-semibold leading-[1.05] tracking-tight text-white drop-shadow-sm sm:text-7xl"
          >
            One parcel.
            <br />
            <span className="text-[#d8e6b8]">Every department.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mx-auto mt-6 max-w-xl text-lg text-white/85 drop-shadow-sm"
          >
            LandStack connects India's fragmented land-records, registration, tax, and
            planning systems around a single ULPIN-based framework — real GIS geometry,
            explainable AI, one parcel at a time.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-10 flex items-center justify-center gap-4"
          >
            <Link
              href="/dashboard"
              className="rounded-full bg-white px-6 py-3 text-sm font-medium text-[#2b2415] transition hover:bg-white/90"
            >
              Explore the live map →
            </Link>
            <a
              href="#features"
              className="rounded-full border border-white/40 px-6 py-3 text-sm font-medium text-white transition hover:border-white/70"
            >
              See what's inside
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-6 text-xs text-white/60"
          >
            No account needed to explore · Sign in unlocks officer &amp; admin views
          </motion.p>
        </div>
      </section>

      {/* THE CORE IDEA */}
      <section className="border-t border-[#2b2415]/10 bg-[#f0e9d8] px-6 py-28">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-xs uppercase tracking-widest text-[#4a6741]">The core idea</p>
          <h2 className="mt-4 text-3xl font-medium leading-snug sm:text-4xl">
            Land Records. Registration. Tax. Planning. Building. Utilities.
            <br />
            <span className="text-[#2b2415]/40">Nine systems. One parcel identifier.</span>
          </h2>
          <p className="mt-6 text-[#2b2415]/55">
            Every fragmented department record resolves back to the same ULPIN — ownership,
            registration, tax, mortgage, land use, and building approval, all on one screen,
            including where the departments disagree with each other.
          </p>
        </motion.div>
      </section>

      {/* FEATURES GRID */}
      <section id="features" className="border-t border-[#2b2415]/10 px-6 py-28">
        <div className="mx-auto max-w-6xl">
          <motion.p
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mb-14 text-center text-xs uppercase tracking-widest text-[#4a6741]"
          >
            What's inside
          </motion.p>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[#2b2415]/10 bg-[#2b2415]/10 md:grid-cols-2 lg:grid-cols-3"
          >
            {FEATURES.map((f) => (
              <motion.div key={f.tag} variants={fadeUp} className="bg-[#f6f1e6] p-8">
                <span className="font-mono text-xs text-[#2b2415]/30">{f.tag}</span>
                <h3 className="mt-3 text-lg font-medium">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#2b2415]/55">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FLOW */}
      <section id="flow" className="border-t border-[#2b2415]/10 bg-[#f0e9d8] px-6 py-28">
        <div className="mx-auto max-w-3xl">
          <motion.p
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mb-14 text-center text-xs uppercase tracking-widest text-[#4a6741]"
          >
            The demo flow
          </motion.p>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="space-y-0"
          >
            {FLOW.map((step, i) => (
              <motion.div
                key={step}
                variants={fadeUp}
                className="flex items-center gap-5 border-b border-[#2b2415]/10 py-5 last:border-b-0"
              >
                <span className="font-mono text-sm text-[#2b2415]/30">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[#2b2415]/80">{step}</span>
                {i < FLOW.length - 1 && <span className="ml-auto text-[#2b2415]/20">↓</span>}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* STATE ADAPTERS */}
      <section id="adapters" className="border-t border-[#2b2415]/10 px-6 py-28">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="mx-auto max-w-4xl text-center"
        >
          <p className="text-xs uppercase tracking-widest text-[#4a6741]">State adapters</p>
          <h2 className="mt-4 text-3xl font-medium sm:text-4xl">
            Different states, different field names, one schema.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-[#2b2415]/55">
            Survey Number, Gat Number, Patta Number, Hissa, Khasra — every state names the same
            facts differently. A configuration file maps each state's fields into one common
            schema. Adding a state means writing a new mapping, not new code.
          </p>

          <div className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-3">
            {["Maharashtra", "Tamil Nadu", "Karnataka", "Uttar Pradesh"].map((s) => (
              <span key={s} className="rounded-full border border-[#2b2415]/15 bg-white/50 px-4 py-2 text-sm text-[#2b2415]/60">
                {s}
              </span>
            ))}
          </div>

          <Link
            href="/dashboard"
            className="mt-10 inline-block rounded-full border border-[#2b2415]/20 px-6 py-3 text-sm font-medium text-[#2b2415]/70 transition hover:border-[#2b2415]/40 hover:text-[#2b2415]"
          >
            View the adapter mappings →
          </Link>
        </motion.div>
      </section>

      {/* FINAL CTA — second real aerial photo, bookending the hero */}
      <section className="relative overflow-hidden px-6 py-40">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${BAND_IMAGE})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a160d]/55 via-[#1a160d]/45 to-[#1a160d]/65" />

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="relative z-10 mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-medium text-white sm:text-4xl">See a real parcel resolve, end to end.</h2>
          <p className="mt-4 text-white/80">
            Click a building on the map. Watch its ULPIN resolve, its anomalies surface, and
            its risk score explain itself — no login required to look, sign in to act.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-block rounded-full bg-white px-8 py-3.5 text-sm font-medium text-[#2b2415] transition hover:bg-white/90"
          >
            Open LandStack →
          </Link>
        </motion.div>
      </section>

      <footer className="border-t border-[#2b2415]/10 px-6 py-8 text-center text-xs text-[#2b2415]/40">
        LandStack Intelligence — SIH PS 26014 prototype. Real parcel geometry and select
        government records are live; departmental data is clearly-labeled mock data per the
        problem statement's own instructions.
      </footer>
    </main>
  );
}
