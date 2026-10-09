import { Hoopoe, type Mood } from "./Hoopoe";

/** Mix a hex colour with white. amount 0 = colour, 1 = white. */
export function tint(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const m = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${((1 << 24) | (m(r) << 16) | (m(g) << 8) | m(b)).toString(16).slice(1)}`;
}

const STARS: [number, number][] = [
  [70, 60],
  [160, 110],
  [260, 50],
  [350, 95],
  [470, 40],
  [560, 120],
  [700, 60],
  [760, 130],
];

const FLOWER_SPOTS: [number, number][] = [
  [470, 270],
  [520, 282],
  [565, 268],
  [740, 280],
  [430, 290],
  [785, 268],
  [495, 300],
  [545, 302],
  [590, 296],
  [765, 302],
  [455, 254],
  [720, 300],
];

function Flower({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(1.5)`}>
      <g className="hh-grow">
        <path d="M0 0 V14" stroke="#6FAE6A" strokeWidth="2.5" strokeLinecap="round" />
        {[0, 72, 144, 216, 288].map((a) => (
          <circle
            key={a}
            cx={Math.round(Math.cos((a * Math.PI) / 180) * 6 * 10) / 10}
            cy={Math.round(Math.sin((a * Math.PI) / 180) * 6 * 10) / 10 - 2}
            r="5"
            fill={color}
          />
        ))}
        <circle cx="0" cy="-2" r="3.6" fill="#FFE9A8" />
      </g>
    </g>
  );
}

/**
 * The garden at the top of each view: a pastel sky in the list's colour, a
 * smiling sun that follows the Marrakech hour (a sleepy moon at night), round
 * hills, one flower for every task finished today, and Hudhud on her hill.
 */
export function HeroScene({
  sky,
  hour,
  mood,
  flowers,
}: {
  sky: string;
  hour: number;
  mood: Mood;
  flowers: string[];
}) {
  const night = hour >= 19 || hour < 6;
  const t = Math.min(1, Math.max(0, (hour - 6) / 13));
  const sunX = 500 + t * 110;
  const sunY = 200 - Math.sin(t * Math.PI) * 30;
  const skyFill = night ? "#3D3A6B" : tint(sky, 0.62);

  return (
    <svg
      viewBox="0 0 800 320"
      preserveAspectRatio="xMaxYMax slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <rect width="800" height="320" fill={skyFill} />

      {night ? (
        <>
          {STARS.map(([x, y], i) => (
            <path
              key={i}
              d={`M${x} ${y - 6} L${x + 1.8} ${y - 1.8} L${x + 6} ${y} L${x + 1.8} ${y + 1.8} L${x} ${y + 6} L${x - 1.8} ${y + 1.8} L${x - 6} ${y} L${x - 1.8} ${y - 1.8} Z`}
              fill="#FFE9A8"
              className="hh-twinkle"
              style={{ animationDelay: `${i * 0.4}s` }}
            />
          ))}
          <g transform="translate(540 180)">
            <circle r="34" fill="#FFE9A8" />
            <path
              d="M-12 -2 q5 4 10 0 M4 -2 q5 4 10 0"
              stroke="#3D3A6B"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M-4 10 q4 3 8 0"
              stroke="#3D3A6B"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        </>
      ) : (
        <>
          <g transform={`translate(${sunX} ${sunY})`}>
            <g className="hh-spin">
              {Array.from({ length: 10 }, (_, i) => (
                <rect
                  key={i}
                  x="-3"
                  y="-58"
                  width="6"
                  height="14"
                  rx="3"
                  fill="#FFD25E"
                  transform={`rotate(${i * 36})`}
                />
              ))}
            </g>
            <circle r="38" fill="#FFD25E" />
            <circle cx="-12" cy="-4" r="3.5" fill="#2B2238" />
            <circle cx="12" cy="-4" r="3.5" fill="#2B2238" />
            <path
              d="M-9 9 q9 8 18 0"
              stroke="#2B2238"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            <ellipse cx="-20" cy="7" rx="5" ry="3" fill="#F7A07C" />
            <ellipse cx="20" cy="7" rx="5" ry="3" fill="#F7A07C" />
          </g>
          {[
            [240, 196, 1],
            [728, 182, 0.7],
          ].map(([x, y, s], i) => (
            <g key={i} transform={`translate(${x} ${y}) scale(${s})`} fill="#fff">
              <g className="hh-drift" style={{ animationDelay: `${i * 3}s` }}>
                <circle cx="0" cy="0" r="20" />
                <circle cx="24" cy="-8" r="26" />
                <circle cx="52" cy="0" r="20" />
                <rect x="0" y="0" width="52" height="20" />
              </g>
            </g>
          ))}
        </>
      )}

      {/* hills */}
      <ellipse cx="180" cy="330" rx="330" ry="120" fill={night ? "#2E4A44" : "#BFE3B4"} />
      <ellipse cx="660" cy="335" rx="280" ry="115" fill={night ? "#284039" : "#A6D69C"} />
      <ellipse cx="400" cy="360" rx="420" ry="95" fill={night ? "#22362F" : "#8CC985"} />

      {flowers.slice(0, FLOWER_SPOTS.length).map((c, i) => (
        <Flower key={i} x={FLOWER_SPOTS[i]![0]} y={FLOWER_SPOTS[i]![1]} color={c} />
      ))}

      <Hoopoe x={600} y={196} size={112} mood={night ? "sleep" : mood} />
    </svg>
  );
}
