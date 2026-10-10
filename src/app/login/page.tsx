"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Hoopoe } from "@/components/Hoopoe";

function Gate() {
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [wrong, setWrong] = useState(false);
  const [busy, setBusy] = useState(false);

  async function knock(e: React.FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setWrong(false);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    if (res?.ok) {
      const next = params.get("next");
      window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
      return;
    }
    setBusy(false);
    setWrong(true);
    setPassword("");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <form
        onSubmit={knock}
        className="w-full max-w-sm rounded-[28px] bg-panel px-7 pt-6 pb-7 text-center shadow-[0_8px_30px_rgba(43,34,56,0.08)]"
      >
        <div className="flex justify-center">
          <Hoopoe mood={wrong ? "sit" : "hello"} size={112} />
        </div>
        <h1 className="mt-2 font-display text-[28px] font-semibold text-ink">Knock knock</h1>
        <p className="mt-1 text-[15px] text-ink-3">Hudhud the hoopoe keeps the garden gate of Oud.</p>
        <label htmlFor="pw" className="sr-only">
          Password
        </label>
        <input
          id="pw"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="The secret word"
          className="mt-5 w-full rounded-full border border-line bg-bg px-5 py-3 text-[16px] text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
        />
        {wrong && (
          <p role="alert" className="mt-3 text-[14px] text-danger">
            That&rsquo;s not the word. Try again.
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !password}
          className="mt-5 w-full rounded-full bg-accent px-5 py-3 font-display text-[17px] font-medium text-white transition-opacity disabled:opacity-50"
        >
          {busy ? "Opening…" : "Let me in"}
        </button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <Gate />
    </Suspense>
  );
}
