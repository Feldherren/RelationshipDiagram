interface LayersIconProps {
  className?: string;
  size?: number;
}

/** Stacked rectangles — layer list toggle. Stroke uses currentColor. */
export function LayersIcon({ className, size = 22 }: LayersIconProps) {
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
        d="M12 4.5 3.5 9 12 13.5 20.5 9 12 4.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 13.5 12 18l8.5-4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 17.5 12 22l8.5-4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Plus for adding a layer. */
export function LayerAddIcon({ className, size = 20 }: LayersIconProps) {
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
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Two stacked layers with a down arrow — merge into the layer below. */
export function LayerMergeDownIcon({ className, size = 20 }: LayersIconProps) {
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
        d="M12 3.5 5.5 7 12 10.5 18.5 7 12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M12 13.5 5.5 17 12 20.5 18.5 17 12 13.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M12 9.5v5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M9.5 13 12 15.5 14.5 13"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
