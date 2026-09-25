"use client";

import { useState } from "react";
import { AuthUser, login as doLogin, setAuth } from "@/lib/auth";

const DEMO_ACCOUNTS = [
  { username: "citizen", password: "citizen123", role: "Citizen" },
  { username: "officer", password: "officer123", role: "Government Officer" },
  { username: "admin", password: "admin123", role: "Administrator" },
];

export default function LoginBox({
  onLoggedIn,
  onClose,
}: {
  onLoggedIn: (user: AuthUser) => void;
  onClose: () => void;
}) {
  const [username, setUsername] = useState("citizen");
  const [password, setPassword] = useState("citizen123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      const user = await doLogin(username, password);
      onLoggedIn(user);
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="absolute right-4 top-16 z-30 w-80 rounded-xl border border-white/10 bg-[#0f151bf5] p-4 text-xs shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] uppercase tracking-wide text-sky-400">Sign in — LandStack RBAC demo</p>
        <button onClick={onClose} className="rounded-md px-2 py-1 text-white/50 hover:bg-white/10 hover:text-white">
          ✕
        </button>
      </div>

      <div className="mt-3 space-y-2">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="username"
          className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-white focus:outline-none"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="password"
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-white focus:outline-none"
        />
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full rounded-md bg-sky-500/20 px-3 py-1.5 text-sky-300 hover:bg-sky-500/30 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
        {error && <p className="text-amber-300">{error}</p>}
      </div>

      <div className="mt-3 border-t border-white/10 pt-3">
        <p className="mb-1 text-white/40">Demo accounts</p>
        {DEMO_ACCOUNTS.map((a) => (
          <button
            key={a.username}
            onClick={() => {
              setUsername(a.username);
              setPassword(a.password);
            }}
            className="flex w-full justify-between rounded-md px-1.5 py-1 text-left text-white/60 hover:bg-white/5"
          >
            <span>{a.role}</span>
            <span className="font-mono text-white/30">{a.username}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
