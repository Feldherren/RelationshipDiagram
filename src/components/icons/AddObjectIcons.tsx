interface AddObjectIconProps {
  className?: string;
  size?: number;
  title?: string;
}

/** Circle avatar glyph matching on-canvas characters. Uses currentColor. */
export function CharacterObjectIcon({
  className,
  size = 16,
  title,
}: AddObjectIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden={title ? undefined : "true"}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <circle
        cx="12"
        cy="12"
        r="8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="10" r="2.75" fill="currentColor" />
      <path
        fill="currentColor"
        d="M7.6 17.2c1.15-1.7 2.65-2.55 4.4-2.55s3.25.85 4.4 2.55A8.35 8.35 0 0 1 12 20.5a8.35 8.35 0 0 1-4.4-3.3z"
      />
    </svg>
  );
}

/** Labelled rectangle glyph matching on-canvas boxes. Uses currentColor. */
export function BoxObjectIcon({
  className,
  size = 16,
  title,
}: AddObjectIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden={title ? undefined : "true"}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <rect
        x="4"
        y="5"
        width="16"
        height="14"
        rx="2"
        fill="currentColor"
        fillOpacity="0.16"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect x="6.5" y="7.25" width="8" height="2.5" rx="1" fill="currentColor" />
    </svg>
  );
}

/** Typography glyph matching floating text. Uses currentColor. */
export function TextObjectIcon({
  className,
  size = 16,
  title,
}: AddObjectIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden={title ? undefined : "true"}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path
        fill="currentColor"
        d="M5.5 5.75h13v2.25h-5.25V18.5h-2.5V8h-5.25z"
      />
    </svg>
  );
}
