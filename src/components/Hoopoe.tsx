/**
 * Hudhud, the little hoopoe who keeps you company. Round, peachy, with a
 * striped wing and a crest that fans up when she's happy.
 */
export type Mood = "hello" | "cheer" | "sleep" | "sit";

const BODY = "#F2B48A";
const BELLY = "#FBE3CC";
const CREST = "#F2994A";
const TIP = "#2B2238";
const INK = "#2B2238";
const BLUSH = "#F08A8A";

export function Hoopoe({
  mood = "sit",
  size = 120,
  className,
  x,
  y,
}: {
  mood?: Mood;
  size?: number;
  className?: string;
  x?: number;
  y?: number;
}) {
  const asleep = mood === "sleep";
  const fanned = mood === "cheer" || mood === "hello";
  // crest feathers: angle (deg) from vertical
  const feathers = fanned ? [-48, -30, -12, 6, 24] : [-28, -18, -8, 2, 12];
  return (
    <svg
      viewBox="0 0 120 120"
      x={x}
      y={y}
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      {/* tail */}
      <path d="M22 78 L6 88 L10 70 Z" fill={TIP} />
      <path d="M24 76 L10 80 L14 68 Z" fill="#fff" />
      {/* crest */}
      <g transform="translate(60 40)">
        {feathers.map((a) => (
          <g key={a} transform={`rotate(${a})`}>
            <g className={mood === "cheer" ? "hh-wiggle" : undefined}>
              <rect x="-4" y="-30" width="8" height="26" rx="4" fill={CREST} />
              <rect x="-4" y="-30" width="8" height="7" rx="3.5" fill={TIP} />
            </g>
          </g>
        ))}
      </g>
      {/* body */}
      <ellipse cx="60" cy="72" rx="36" ry="32" fill={BODY} />
      <ellipse cx="62" cy="84" rx="22" ry="17" fill={BELLY} />
      {/* wing with stripes */}
      <g
        transform={
          mood === "hello"
            ? "rotate(-35 40 70)"
            : mood === "cheer"
              ? "rotate(-50 40 70)"
              : undefined
        }
      >
        <ellipse cx="38" cy="76" rx="16" ry="20" fill="#fff" />
        <clipPath id="hh-wing">
          <ellipse cx="38" cy="76" rx="16" ry="20" />
        </clipPath>
        <g clipPath="url(#hh-wing)" fill={TIP}>
          <rect x="20" y="64" width="40" height="5" />
          <rect x="20" y="74" width="40" height="5" />
          <rect x="20" y="84" width="40" height="5" />
        </g>
      </g>
      {/* beak */}
      <path d="M88 62 Q108 66 116 76 Q104 70 88 70 Z" fill="#6B5444" />
      {/* eye */}
      {asleep ? (
        <path d="M70 58 q6 5 12 0" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
      ) : mood === "cheer" ? (
        <path
          d="M70 60 q6 -7 12 0"
          stroke={INK}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <>
          <circle cx="76" cy="58" r="6" fill={INK} />
          <circle cx="78" cy="56" r="2" fill="#fff" />
        </>
      )}
      <ellipse cx="80" cy="70" rx="5" ry="3" fill={BLUSH} opacity="0.85" />
      {/* feet */}
      <path d="M52 102 v8 M68 102 v8" stroke="#6B5444" strokeWidth="3" strokeLinecap="round" />
      {asleep ? (
        <text
          x="94"
          y="38"
          fontSize="16"
          fontWeight="700"
          fill={INK}
          fontFamily="var(--font-display)"
        >
          z
          <tspan dx="2" dy="-8" fontSize="12">
            z
          </tspan>
        </text>
      ) : null}
    </svg>
  );
}
