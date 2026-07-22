export const COMPANY_NAME_SEGMENT_MAX_LENGTH = 40
export const COMPANY_NAME_FIELDS = ['company_name', 'company_name_2', 'company_name_3', 'company_name_4']

export function fullCompanyName(form) {
  return COMPANY_NAME_FIELDS
    .map((field) => String(form?.[field] || '').trim())
    .filter(Boolean)
    .join(' ')
}

// A segment is visible once the previous segment is completely filled
// (reached the character cap) or already has a value of its own.
export function visibleCompanyNameFields(form) {
  const visible = [COMPANY_NAME_FIELDS[0]]
  for (let i = 1; i < COMPANY_NAME_FIELDS.length; i += 1) {
    const previousValue = String(form?.[COMPANY_NAME_FIELDS[i - 1]] || '')
    const currentValue = String(form?.[COMPANY_NAME_FIELDS[i]] || '')
    if (previousValue.length >= COMPANY_NAME_SEGMENT_MAX_LENGTH || currentValue) {
      visible.push(COMPANY_NAME_FIELDS[i])
    } else {
      break
    }
  }
  return visible
}
