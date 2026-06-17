const REDACTION_RULES: Array<[RegExp, string | ((match: string, ...args: string[]) => string)]> = [
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]'],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]+\b/g, 'Bearer [redacted-token]'],
  [/\bsk_(?:live|test)_[A-Za-z0-9_]+\b/g, '[redacted-key]'],
  [/\beyJ[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){2}\b/g, '[redacted-token]'],
  [/\b[A-Za-z0-9+/]{40,}={0,2}\b/g, '[redacted-token]'],
  [
    /https?:\/\/[^\s"'<>?]+(?:\?[^'"<>\s]*)/g,
    (match) => match.replace(/\?.*$/, '?[redacted-query]'),
  ],
  [
    /(^|[\s"'(])([/?#][^\s"'<>]*\?[^'"<>\s]*)/g,
    (_match, prefix, path) => `${prefix}${path.replace(/\?.*$/, '?[redacted-query]')}`,
  ],
  [/\b[A-Za-z0-9_-]{32,}\b/g, '[redacted-token]'],
];

export function canaryText(value: unknown): string {
  if (value instanceof Error) return value.message || value.name;
  if (typeof value === 'string') return value;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function redactCanaryText(value: unknown): string {
  return REDACTION_RULES.reduce(
    (text, [pattern, replacement]) =>
      typeof replacement === 'string'
        ? text.replace(pattern, replacement)
        : text.replace(pattern, replacement),
    canaryText(value),
  );
}
