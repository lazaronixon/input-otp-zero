export const REGEXP_ONLY_DIGITS = "^\\d+$"
export const REGEXP_ONLY_CHARS = "^[a-zA-Z]+$"
export const REGEXP_ONLY_DIGITS_AND_CHARS = "^[a-zA-Z0-9]+$"

const ALIASES = {
  "digits": REGEXP_ONLY_DIGITS,
  "chars": REGEXP_ONLY_CHARS,
  "digits-and-chars": REGEXP_ONLY_DIGITS_AND_CHARS
}

// Accepts a `RegExp`, a raw source string, or one of the named aliases so that
// the common cases stay readable as an HTML attribute: `pattern="digits"`.
export function resolvePattern(pattern) {
  if (!pattern) return null
  if (pattern instanceof RegExp) return pattern

  return new RegExp(ALIASES[pattern] ?? pattern)
}
