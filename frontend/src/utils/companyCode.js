export function companyCodeForPurchaseOrg(purchaseOrg) {
  const normalized = String(purchaseOrg || '').trim().toUpperCase()
  if (!normalized) return ''
  return normalized.startsWith('T') ? normalized : 'R001'
}
