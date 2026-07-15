export async function lookupCityForPincode(pincode) {
  const trimmedPincode = pincode.trim()
  if (!/^\d{6}$/.test(trimmedPincode)) return null

  const response = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(trimmedPincode)}`)
  if (!response.ok) return null
  const [result] = await response.json()
  if (result?.Status !== 'Success' || !result.PostOffice?.length) return null

  const counts = new Map()
  for (const po of result.PostOffice) {
    const key = `${po.District}|${po.State}`
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  const [topKey] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  const [district, state] = topKey.split('|')
  return { city: district, state }
}

export async function lookupPincodesForCity(city, state) {
  const trimmedCity = city.trim()
  if (!trimmedCity) return []

  const response = await fetch(`https://api.postalpincode.in/postoffice/${encodeURIComponent(trimmedCity)}`)
  if (!response.ok) return []
  const [result] = await response.json()
  if (result?.Status !== 'Success' || !result.PostOffice?.length) return []

  const matches = result.PostOffice.map((po) => ({
    pincode: po.Pincode,
    city: po.Name,
    district: po.District,
    state: po.State,
  }))

  const normalizedState = state?.trim().toLowerCase()
  const stateMatches = normalizedState
    ? matches.filter((m) => m.state.toLowerCase() === normalizedState)
    : matches

  const pool = stateMatches.length ? stateMatches : matches
  const uniqueByPincode = Array.from(new Map(pool.map((m) => [m.pincode, m])).values())
  return uniqueByPincode
}
