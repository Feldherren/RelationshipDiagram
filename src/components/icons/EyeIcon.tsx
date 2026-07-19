import { useId } from "react";

interface EyeIconProps {
  className?: string;
  size?: number;
}

/** Open eye — hidden elements are visible. Stroke uses currentColor. */
export function EyeOpenIcon({ className, size = 16 }: EyeIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
    >
      {/* Almond outline with a small gap at upper-left, matching the asset. */}
      <path
        d="M5.2 9.2C6.8 6.6 9.2 5.2 12 5.2c4.2 0 7.6 3.2 8.8 6.8-1.2 3.6-4.6 6.8-8.8 6.8S4.4 15.6 3.2 12c.4-1.2 1.1-2.4 2-3.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="2.75"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

/** Half-open eye — partial visibility (e.g. connected hubs only). */
export function EyeHalfIcon({ className, size = 16 }: EyeIconProps) {
  const reactId = useId().replace(/:/g, "");
  const clipId = `eye-half-${reactId}`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          {/* Lower half of the open eye — reads as a drooped upper lid. */}
          <rect x="0" y="11.5" width="24" height="12.5" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <path
          d="M5.2 9.2C6.8 6.6 9.2 5.2 12 5.2c4.2 0 7.6 3.2 8.8 6.8-1.2 3.6-4.6 6.8-8.8 6.8S4.4 15.6 3.2 12c.4-1.2 1.1-2.4 2-3.4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="12"
          cy="12"
          r="2.75"
          stroke="currentColor"
          strokeWidth="2"
        />
      </g>
      <path
        d="M3.5 11.5h17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Closed eye with lashes — hidden elements are hidden. Stroke uses currentColor. */
export function EyeClosedIcon({ className, size = 16 }: EyeIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 10.5c2.2 3.2 4.8 4.7 8 4.7s5.8-1.5 8-4.7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.2 14.2 5 16.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9.1 15.5 8.5 17.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 16v2.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M14.9 15.5 15.5 17.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M17.8 14.2 19 16.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
