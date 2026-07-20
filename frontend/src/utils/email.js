// Strict email format check: proper local part (no leading/trailing/consecutive
// dots), a domain with at least one dot and a 2+ letter TLD, no consecutive dots
// in the domain, and the RFC 5321 max length of 254 characters.
const EMAIL_RE = /^(?!\.)[A-Za-z0-9._%+-]+(?<!\.)@(?!-)[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/

export function isValidEmail(value) {
  const trimmed = String(value || '').trim()
  if (!trimmed || trimmed.length > 254) return false
  if (trimmed.includes('..')) return false
  return EMAIL_RE.test(trimmed)
}
