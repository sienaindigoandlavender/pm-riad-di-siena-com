/**
 * A flat landscape behind the title: sky in the list's colour, the sun moving
 * across it with the hour (a moon after dark), and layered hills in earth tones.
 * When the day's tasks are all done, two birds cross the sky.
 */
export function HeroScene({ sky, hour, allDone }: { sky: string; hour: number; allDone: boolean }) {
  const night = hour >= 19 || hour < 6;
  // Sun travels from left (6h) to right (19h) along a gentle arc.
  const t = Math.min(1, Math.max(0, (hour - 6) / 13));
  const sunX = 380 + t * 240;
  const sunY = 205 - Math.sin(t * Math.PI) * 60;

  return (
    <svg
      viewBox="0 0 800 300"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <rect width="800" height="300" fill={night ? "#2f3b47" : sky} />
      {night ? (
        <>
          <circle cx={520} cy={90} r={30} fill="#efe6cf" />
          <circle cx={534} cy={82} r={26} fill="#2f3b47" />
          {[
            [60, 60],
            [150, 100],
            [250, 45],
            [360, 85],
            [440, 40],
            [620, 120],
            [720, 70],
          ].map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="3" height="3" fill="#efe6cf" />
          ))}
        </>
      ) : (
        <>
          <circle cx={sunX} cy={sunY} r={44} fill="#f6e7b8" />
        </>
      )}
      {allDone && !night ? (
        <g fill="none" stroke="#1c1b19" strokeWidth="3" strokeLinecap="round" opacity="0.55">
          <path d="M420 95 q10 -10 20 0 q10 -10 20 0" />
          <path d="M470 120 q8 -8 16 0 q8 -8 16 0" />
        </g>
      ) : null}
      {/* hills, back to front */}
      <path
        d="M0 205 C 120 160, 230 170, 330 192 S 560 160, 680 182 S 770 195, 800 188 V300 H0 Z"
        fill={night ? "#3e4a44" : "#9bb59a"}
      />
      <path
        d="M0 238 C 100 210, 200 215, 300 232 S 510 208, 620 224 S 750 238, 800 230 V300 H0 Z"
        fill={night ? "#36403a" : "#7a9a7e"}
      />
      <path
        d="M0 268 C 130 248, 250 255, 400 266 S 650 250, 800 262 V300 H0 Z"
        fill={night ? "#2d332f" : "#5f7355"}
      />
      {/* a palm on the far right */}
      <g transform="translate(700 160)" fill={night ? "#262b28" : "#4d5d45"}>
        <rect x="-3" y="20" width="6" height="105" />
        <path d="M0 22 C -30 5, -55 12, -70 28 C -45 18, -20 22, 0 30 Z" />
        <path d="M0 22 C 30 5, 55 12, 70 28 C 45 18, 20 22, 0 30 Z" />
        <path d="M0 20 C -15 -10, -40 -18, -58 -12 C -35 -6, -15 6, 0 26 Z" />
        <path d="M0 20 C 15 -10, 40 -18, 58 -12 C 35 -6, 15 6, 0 26 Z" />
      </g>
    </svg>
  );
}
