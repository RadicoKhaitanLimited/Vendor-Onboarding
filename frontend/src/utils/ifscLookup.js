function normalizeBankName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\b(bank|ltd|limited|of|the|&|first)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function bankNamesLikelyMatch(a, b) {
  const normA = normalizeBankName(a)
  const normB = normalizeBankName(b)
  if (!normA || !normB) return true
  if (normA === normB) return true
  const tokensA = normA.split(' ').filter(Boolean)
  const tokensB = normB.split(' ').filter(Boolean)
  return tokensA.some((token) => token.length > 2 && tokensB.includes(token))
}

export async function lookupIfsc(ifscCode) {
  const code = String(ifscCode || '').trim().toUpperCase()
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) return null

  const response = await fetch(`https://ifsc.razorpay.com/${encodeURIComponent(code)}`)
  if (!response.ok) return response.status === 404 ? { notFound: true } : null
  const data = await response.json()
  return {
    bank: data.BANK || '',
    branch: data.BRANCH || '',
    address: data.ADDRESS || '',
    city: data.CITY || '',
    state: data.STATE || '',
  }
}
