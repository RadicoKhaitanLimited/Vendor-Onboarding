export const MSME_OPTIONS = [
  { code: 'MME', description: 'Micro or A or D' },
  { code: 'MSE', description: 'Small or B or E' },
  { code: 'MSM', description: 'Medium or C or F' },
  { code: 'MET', description: 'Micro Enterprises - Trading' },
  { code: 'MMT', description: 'Medium Enterprise - Trading' },
  { code: 'MST', description: 'Small Enterprise - Trading' },
  { code: 'MNA', description: 'Not MSME Registered/Applicable' },
]

const LEGACY_MSME_CODES = {
  Micro: 'MME',
  Small: 'MSE',
  Medium: 'MSM',
  MSME: 'MME',
}

export function normalizeMsmeCode(value) {
  if (!value) return ''
  return LEGACY_MSME_CODES[value] || value
}

export function getMsmeOption(value) {
  const code = normalizeMsmeCode(value)
  return MSME_OPTIONS.find((option) => option.code === code)
}

export function formatMsmeOption(value) {
  const option = getMsmeOption(value)
  if (!option) return value || ''
  return `${option.code} - ${option.description}`
}

export const MSME_REGISTERED_OPTIONS = MSME_OPTIONS.filter((option) => option.code !== 'MNA')
