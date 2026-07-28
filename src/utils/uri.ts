/** Accepts https://, obsidian://, mailto:, etc. */
const URI_SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

export function isValidUri(value: string): boolean {
  return URI_SCHEME_RE.test(value.trim());
}

export function normalizeUriForOpen(value: string): string {
  return value.trim();
}

export function getUriScheme(value: string): string | null {
  const match = value.trim().match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  return match ? match[1].toLowerCase() : null;
}

export function isHttpUri(value: string): boolean {
  const scheme = getUriScheme(value);
  return scheme === "http" || scheme === "https";
}

export function normalizeCharacterLink(
  link: string | undefined,
): string | undefined {
  if (link == null) return undefined;
  const trimmed = link.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
