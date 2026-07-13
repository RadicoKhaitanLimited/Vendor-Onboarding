const PAN_EDITABLE_HOLDER_TYPES = new Set(['P', 'H'])

export function isPanNameEditable(panNumber) {
  const normalized = String(panNumber || '').trim().toUpperCase()
  return normalized.length >= 4 && PAN_EDITABLE_HOLDER_TYPES.has(normalized[3])
}
