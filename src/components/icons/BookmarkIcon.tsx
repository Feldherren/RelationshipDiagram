interface BookmarkIconProps {
  className?: string;
  size?: number;
  title?: string;
}

/** Filled ribbon bookmark glyph (notch at the bottom). Uses currentColor. */
export function BookmarkIcon({ className, size = 16, title }: BookmarkIconProps) {
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
        d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"
      />
    </svg>
  );
}

/** Ribbon bookmark with a plus knocked out of the upper half. Uses currentColor. */
export function BookmarkAddIcon({
  className,
  size = 16,
  title,
}: BookmarkIconProps) {
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
        fillRule="evenodd"
        d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm-6 3.5h2V9h2.5v2H13v2.5h-2V11H8.5V9H11V6.5z"
      />
    </svg>
  );
}
