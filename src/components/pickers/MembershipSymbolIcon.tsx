import type { ReactNode } from "react";
import type { MembershipSymbol } from "../../models/types";
import {
  BREEZE_LAYOUT,
  BREEZE_PATH,
  DROPLET_LAYOUT,
  DROPLET_PATH,
  FLAME_LAYOUT,
  FLAME_PATH,
  HEART_PATH,
  MOON_PATH,
  MUSIC_NOTE_LAYOUT,
  MUSIC_NOTE_PATH,
  ROCK_LAYOUT,
  ROCK_PATH,
  SKULL_LAYOUT,
  SKULL_PATH,
  SPARKLE_LAYOUT,
  SPARKLE_PATH,
  SWORD_LAYOUT,
  SWORD_PATH,
  regularPolygonPoints,
  starPolygonPoints,
} from "../../utils/membershipSymbolGeometry";

const ICON_SIZE = 22;

function SvgShell({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="-1.15 -1.15 2.3 2.3"
      aria-hidden
      focusable="false"
    >
      <title>{title}</title>
      {children}
    </svg>
  );
}

function pointsAttr(points: number[]): string {
  const pairs: string[] = [];
  for (let i = 0; i < points.length; i += 2) {
    pairs.push(`${points[i]},${points[i + 1]}`);
  }
  return pairs.join(" ");
}

/** Compact SVG glyph for symbol picker buttons. */
export function MembershipSymbolIcon({
  symbol,
  label,
}: {
  symbol: MembershipSymbol;
  label: string;
}) {
  if (symbol === "none") {
    return null;
  }

  switch (symbol) {
    case "star":
      return (
        <SvgShell title={label}>
          <polygon
            points={pointsAttr(starPolygonPoints(1, 0.4, 5))}
            fill="currentColor"
          />
        </SvgShell>
      );
    case "moon":
      return (
        <SvgShell title={label}>
          <path d={MOON_PATH} fill="currentColor" />
        </SvgShell>
      );
    case "heart":
      return (
        <SvgShell title={label}>
          <path d={HEART_PATH} fill="currentColor" />
        </SvgShell>
      );
    case "diamond":
      return (
        <SvgShell title={label}>
          <polygon
            points={pointsAttr(regularPolygonPoints(4, 1))}
            fill="currentColor"
          />
        </SvgShell>
      );
    case "circle":
      return (
        <SvgShell title={label}>
          <circle r={0.72} fill="currentColor" />
        </SvgShell>
      );
    case "ring":
      return (
        <SvgShell title={label}>
          <circle r={0.68} fill="none" stroke="currentColor" strokeWidth={0.22} />
        </SvgShell>
      );
    case "square":
      return (
        <SvgShell title={label}>
          <rect
            x={-0.62}
            y={-0.62}
            width={1.24}
            height={1.24}
            rx={0.12}
            fill="currentColor"
          />
        </SvgShell>
      );
    case "triangle":
      return (
        <SvgShell title={label}>
          <polygon
            points={pointsAttr(regularPolygonPoints(3, 1))}
            fill="currentColor"
          />
        </SvgShell>
      );
    case "hexagon":
      return (
        <SvgShell title={label}>
          <polygon
            points={pointsAttr(regularPolygonPoints(6, 0.95))}
            fill="currentColor"
          />
        </SvgShell>
      );
    case "plus":
      return (
        <SvgShell title={label}>
          <line
            x1={-0.85}
            y1={0}
            x2={0.85}
            y2={0}
            stroke="currentColor"
            strokeWidth={0.24}
            strokeLinecap="round"
          />
          <line
            x1={0}
            y1={-0.85}
            x2={0}
            y2={0.85}
            stroke="currentColor"
            strokeWidth={0.24}
            strokeLinecap="round"
          />
        </SvgShell>
      );
    case "cross":
      return (
        <SvgShell title={label}>
          <line
            x1={-0.7}
            y1={-0.7}
            x2={0.7}
            y2={0.7}
            stroke="currentColor"
            strokeWidth={0.24}
            strokeLinecap="round"
          />
          <line
            x1={-0.7}
            y1={0.7}
            x2={0.7}
            y2={-0.7}
            stroke="currentColor"
            strokeWidth={0.24}
            strokeLinecap="round"
          />
        </SvgShell>
      );
    case "slash":
      return (
        <SvgShell title={label}>
          <line
            x1={-0.65}
            y1={0.65}
            x2={0.65}
            y2={-0.65}
            stroke="currentColor"
            strokeWidth={0.24}
            strokeLinecap="round"
          />
        </SvgShell>
      );
    case "music":
      return (
        <SvgShell title={label}>
          <g
            transform={`scale(${MUSIC_NOTE_LAYOUT.unitScale}) translate(${-MUSIC_NOTE_LAYOUT.centerX} ${-MUSIC_NOTE_LAYOUT.centerY})`}
          >
            <path d={MUSIC_NOTE_PATH} fill="currentColor" />
          </g>
        </SvgShell>
      );
    case "sword":
      return (
        <SvgShell title={label}>
          <g
            transform={`scale(${SWORD_LAYOUT.unitScale}) translate(${-SWORD_LAYOUT.centerX} ${-SWORD_LAYOUT.centerY})`}
          >
            <path d={SWORD_PATH} fill="currentColor" fillRule="evenodd" />
          </g>
        </SvgShell>
      );
    case "flame":
      return (
        <SvgShell title={label}>
          <g
            transform={`scale(${FLAME_LAYOUT.unitScale}) translate(${-FLAME_LAYOUT.centerX} ${-FLAME_LAYOUT.centerY})`}
          >
            <path d={FLAME_PATH} fill="currentColor" />
          </g>
        </SvgShell>
      );
    case "droplet":
      return (
        <SvgShell title={label}>
          <g
            transform={`scale(${DROPLET_LAYOUT.unitScale}) translate(${-DROPLET_LAYOUT.centerX} ${-DROPLET_LAYOUT.centerY})`}
          >
            <path d={DROPLET_PATH} fill="currentColor" fillRule="evenodd" />
          </g>
        </SvgShell>
      );
    case "breeze":
    case "plant":
      return (
        <SvgShell title={label}>
          <g
            transform={`${symbol === "plant" ? "rotate(-90) " : ""}scale(${BREEZE_LAYOUT.unitScale}) translate(${-BREEZE_LAYOUT.centerX} ${-BREEZE_LAYOUT.centerY})`}
          >
            <path d={BREEZE_PATH} fill="currentColor" fillRule="evenodd" />
          </g>
        </SvgShell>
      );
    case "rock":
      return (
        <SvgShell title={label}>
          <g
            transform={`scale(${ROCK_LAYOUT.unitScale}) translate(${-ROCK_LAYOUT.centerX} ${-ROCK_LAYOUT.centerY})`}
          >
            <path d={ROCK_PATH} fill="currentColor" />
          </g>
        </SvgShell>
      );
    case "sparkle":
      return (
        <SvgShell title={label}>
          <g
            transform={`scale(${SPARKLE_LAYOUT.unitScale}) translate(${-SPARKLE_LAYOUT.centerX} ${-SPARKLE_LAYOUT.centerY})`}
          >
            <path d={SPARKLE_PATH} fill="currentColor" />
          </g>
        </SvgShell>
      );
    case "skull":
      return (
        <SvgShell title={label}>
          <g
            transform={`scale(${SKULL_LAYOUT.unitScale}) translate(${-SKULL_LAYOUT.centerX} ${-SKULL_LAYOUT.centerY})`}
          >
            <path d={SKULL_PATH} fill="currentColor" fillRule="evenodd" />
          </g>
        </SvgShell>
      );
    default:
      return null;
  }
}
