"use client";

import { useEffect, useRef, useState } from "react";

const SIZE = 320;
const C = SIZE / 2;
const R = C - 8;
const SPIN_MS = 6000;
const COLOURS = ["#7f1d1d", "#1c1917", "#9a3412", "#292524"];

/** Point on the rim at `deg` degrees clockwise from 12 o'clock. */
function rim(deg: number, r = R) {
  const rad = (deg * Math.PI) / 180;
  return `${C + r * Math.sin(rad)} ${C - r * Math.cos(rad)}`;
}

/**
 * The Wheel of Doom. Purely theatrical: the buyer is decided server-side and the wheel is rigged
 * to land on them, as all the best wheels are. Remount it (via `key`) for each pick.
 */
export function Wheel({
  names,
  winnerIndex,
  alreadySpun,
  autoSpin,
  onSpun,
  small = false,
}: {
  names: string[];
  winnerIndex: number;
  /** This viewer has watched this pick's spin before, so rest on the result. */
  alreadySpun: boolean;
  /** Spin as soon as it mounts, e.g. straight after "More milk now!". */
  autoSpin: boolean;
  onSpun: () => void;
  /** The little spinner used for "More milk now!" extras. */
  small?: boolean;
}) {
  const seg = 360 / names.length;
  // Where the wheel stops: the middle of the winning slice under the pointer, nudged by a wobble
  // fixed at mount. Worked out on every render, so it stays right if the names change.
  const [wobble] = useState(() => (Math.random() - 0.5) * 0.6);
  const landing = -(winnerIndex * seg + seg / 2) + wobble * seg;
  // Full turns spun so far. The wheel sits level until its first spin, so it gives nothing away.
  const [turns, setTurns] = useState(0);
  const [state, setState] = useState<"idle" | "spinning" | "done">("idle");
  const rotation = state === "idle" ? 0 : turns * 360 + landing;
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    if (alreadySpun) {
      started.current = true;
      setState("done");
    } else if (autoSpin) {
      // Let the level wheel paint first. If it mounts and spins before the browser has drawn it,
      // there is no starting angle to animate from, and it just jumps to the result.
      const t = setTimeout(spin, 50);
      return () => clearTimeout(t);
    }
  }, [alreadySpun, autoSpin]);

  function spin() {
    started.current = true;
    setState("spinning");
    setTurns((t) => t + 8);
    setTimeout(() => {
      setState("done");
      onSpun();
    }, SPIN_MS);
  }

  return (
    <div className={`flex flex-col items-center ${small ? "gap-4" : "gap-6"}`}>
      <div className="relative">
        {/* Pointer: a jagged orc blade */}
        <svg
          className="absolute left-1/2 -top-3 z-10 -translate-x-1/2 drop-shadow-[0_0_6px_#f97316]"
          width={small ? 20 : 28}
          height={small ? 29 : 40}
          viewBox="0 0 28 40"
        >
          <path d="M2 0 H26 L18 14 L22 16 L14 40 L6 16 L10 14 Z" fill="#d6d3d1" stroke="#0c0a09" strokeWidth="2" />
        </svg>

        <svg
          width={small ? SIZE * 0.65 : SIZE}
          height={small ? SIZE * 0.65 : SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="max-w-[85vw] h-auto rounded-full shadow-[0_0_60px_-5px] shadow-red-700/60"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition:
              state === "spinning"
                ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.8, 0.15, 1)`
                : "none",
          }}
        >
          <circle cx={C} cy={C} r={R + 6} fill="#0c0a09" stroke="#57534e" strokeWidth="3" />
          {names.map((name, i) => {
            const a0 = i * seg;
            const a1 = a0 + seg;
            const mid = a0 + seg / 2;
            return (
              <g key={i}>
                {names.length === 1 ? (
                  <circle cx={C} cy={C} r={R} fill={COLOURS[0]} />
                ) : (
                  <path
                    d={`M ${C} ${C} L ${rim(a0)} A ${R} ${R} 0 ${seg > 180 ? 1 : 0} 1 ${rim(a1)} Z`}
                    fill={COLOURS[i % COLOURS.length]}
                    stroke="#0c0a09"
                    strokeWidth="2"
                  />
                )}
                <text
                  transform={`rotate(${mid - 90} ${C} ${C})`}
                  x={C + R - 14}
                  y={C}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className={`fill-stone-100 font-display font-bold ${small ? "text-[17px]" : "text-[13px]"}`}
                >
                  {name.length > 14 ? `${name.slice(0, 13)}…` : name}
                </text>
              </g>
            );
          })}
          {/* The Eye */}
          <circle cx={C} cy={C} r={34} fill="#0c0a09" stroke="#57534e" strokeWidth="3" />
          <ellipse cx={C} cy={C} rx={26} ry={14} fill="#f97316" className="animate-pulse" />
          <ellipse cx={C} cy={C} rx={4} ry={13} fill="#0c0a09" />
        </svg>
      </div>

      {state !== "spinning" && (
        <button
          onClick={spin}
          className={`rounded-md bg-red-800 font-display font-bold tracking-wide text-stone-100 transition hover:bg-red-700 ${
            small ? "px-4 py-2 text-base" : "px-6 py-3 text-lg"
          }`}
        >
          {state === "idle"
            ? small
              ? "Spin the Little Wheel"
              : "Spin the Wheel of Doom"
            : "Spin it again (it won't help)"}
        </button>
      )}
      {state === "spinning" && (
        <p className="font-display text-lg text-ember animate-pulse">
          {small ? "The Eye looks again..." : "The Eye is choosing..."}
        </p>
      )}
    </div>
  );
}
