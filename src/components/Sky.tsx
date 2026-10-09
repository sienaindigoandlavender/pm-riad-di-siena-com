"use client";

import { useEffect, useState } from "react";
import { marrakechTime } from "@/lib/dates";

/** The time in Marrakech, ticking every few seconds. */
export function Clock() {
  // Set after mount so the time always comes from this device's clock.
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    setTime(marrakechTime());
    const id = setInterval(() => setTime(marrakechTime()), 10_000);
    return () => clearInterval(id);
  }, []);
  return <time className="inline-block min-w-[42px] tabular-nums">{time ?? "\u00a0"}</time>;
}

export type WeatherKind = "clear" | "partly" | "cloudy" | "fog" | "rain" | "snow" | "storm";
export type Weather = { temp: number; kind: WeatherKind; isDay: boolean };

function kindOf(code: number): WeatherKind {
  if (code === 0) return "clear";
  if (code <= 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "rain";
}

const KEY = "pm-weather";
const URL =
  "https://api.open-meteo.com/v1/forecast?latitude=31.63&longitude=-7.99&current=temperature_2m,weather_code,is_day&timezone=Africa%2FCasablanca";

/** Marrakech weather from Open-Meteo (free, no key), refreshed every 30 minutes. */
export function useWeather(): Weather | null {
  const [w, setW] = useState<Weather | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const cached = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
        if (cached && Date.now() - cached.at < 30 * 60_000) {
          setW(cached.w);
          return;
        }
      } catch {}
      try {
        const res = await fetch(URL);
        const j = await res.json();
        const c = j.current;
        const next: Weather = {
          temp: Math.round(c.temperature_2m),
          kind: kindOf(Number(c.weather_code)),
          isDay: c.is_day === 1,
        };
        if (!alive) return;
        setW(next);
        try {
          sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), w: next }));
        } catch {}
      } catch {
        // No weather today; the garden carries on.
      }
    };
    load();
    const id = setInterval(load, 30 * 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return w;
}

const SUN = "#FFC93C";
const CLOUD = "#FFFFFF";
const CLOUD_EDGE = "#C9C2DA";
const DROP = "#5AA9E6";

function CloudShape({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        d="M6 20 h20 a6 6 0 0 0 0-12 a8 8 0 0 0-15-2 a6 6 0 0 0-5 14 z"
        fill={CLOUD}
        stroke={CLOUD_EDGE}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </g>
  );
}

/** A small round weather picture. */
export function WeatherIcon({ w, size = 26 }: { w: Weather; size?: number }) {
  const night = !w.isDay;
  const orb = night ? (
    <g>
      <circle cx="14" cy="13" r="8" fill="#FFE9A8" />
      <circle cx="18" cy="10" r="7" fill="#fff" />
    </g>
  ) : (
    <g>
      {Array.from({ length: 8 }, (_, i) => (
        <rect
          key={i}
          x="13"
          y="1"
          width="2.4"
          height="4"
          rx="1.2"
          fill={SUN}
          transform={`rotate(${i * 45} 14.2 13)`}
        />
      ))}
      <circle cx="14.2" cy="13" r="6.5" fill={SUN} />
    </g>
  );
  return (
    <svg viewBox="0 0 36 32" width={size * 1.12} height={size} aria-hidden>
      {w.kind === "clear" ? <g transform="translate(4 2)">{orb}</g> : null}
      {w.kind === "partly" ? (
        <>
          {orb}
          <CloudShape x={6} y={8} s={0.9} />
        </>
      ) : null}
      {w.kind === "cloudy" || w.kind === "fog" ? (
        <>
          <CloudShape x={0} y={2} s={0.75} />
          <CloudShape x={6} y={8} s={0.95} />
        </>
      ) : null}
      {w.kind === "fog" ? (
        <path d="M4 29h24M8 25h22" stroke={CLOUD_EDGE} strokeWidth="2" strokeLinecap="round" />
      ) : null}
      {w.kind === "rain" || w.kind === "storm" || w.kind === "snow" ? (
        <>
          <CloudShape x={2} y={0} s={1} />
          {w.kind === "snow"
            ? [9, 17, 25].map((x) => <circle key={x} cx={x} cy="27" r="2" fill={DROP} />)
            : [9, 17, 25].map((x) => (
                <path
                  key={x}
                  d={`M${x} 23 l-2 5`}
                  stroke={DROP}
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              ))}
          {w.kind === "storm" ? (
            <path
              d="M18 20 l-3 6 h4 l-3 6"
              stroke={SUN}
              strokeWidth="2.2"
              fill="none"
              strokeLinejoin="round"
            />
          ) : null}
        </>
      ) : null}
    </svg>
  );
}

/**
 * The riad's burger: two uneven lines that fold into a cross when the menu is open.
 */
export function Burger({
  open,
  onClick,
  className = "",
}: {
  open: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex size-9 flex-col items-start justify-center gap-[6px] ps-1 ${className}`}
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
    >
      <span
        className={`block h-[2.5px] rounded-full bg-ink transition-all duration-500 origin-left ${
          open ? "w-6 rotate-[40deg] translate-y-[0.5px]" : "w-7 group-hover:w-6"
        }`}
      />
      <span
        className={`block h-[2.5px] rounded-full bg-ink transition-all duration-500 origin-left ${
          open ? "w-6 -rotate-[40deg] -translate-y-[0.5px]" : "w-5 group-hover:w-6"
        }`}
      />
    </button>
  );
}
