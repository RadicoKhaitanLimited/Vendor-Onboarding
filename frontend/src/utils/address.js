// Registered address fields (District, Street 1-4) allow letters, digits, spaces,
// and the punctuation real addresses need (plot no., comma-separated locality,
// hyphenated names) — blocks symbols like !@#$%^&*().
export const sanitizeAddressText = (value) => String(value || '').replace(/[^a-zA-Z0-9\s,.\-/]/g, '')

// City/State are place names only — no digits or punctuation.
export const sanitizePlaceName = (value) => String(value || '').replace(/[^a-zA-Z\s]/g, '')
