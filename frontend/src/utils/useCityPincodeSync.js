import { useEffect, useRef, useState } from 'react'
import { lookupCityForPincode, lookupPincodesForCity } from './pincodeLookup'

const DEBOUNCE_MS = 500

export function useCityPincodeSync(city, state, pincode, set) {
  const [pincodeSuggestions, setPincodeSuggestions] = useState([])
  const [pincodeLookupLoading, setPincodeLookupLoading] = useState(false)
  const [cityLookupLoading, setCityLookupLoading] = useState(false)

  const lastAppliedPincode = useRef('')
  const lastAppliedCity = useRef('')
  const pincodeRequestId = useRef(0)
  const cityRequestId = useRef(0)

  // City -> Pincode
  useEffect(() => {
    const trimmedCity = city.trim()
    setPincodeSuggestions([])

    if (!trimmedCity || trimmedCity === lastAppliedCity.current) return

    const requestId = ++pincodeRequestId.current
    const timer = setTimeout(async () => {
      setPincodeLookupLoading(true)
      try {
        const matches = await lookupPincodesForCity(trimmedCity, state)
        if (requestId !== pincodeRequestId.current) return
        if (matches.length === 1) {
          lastAppliedPincode.current = matches[0].pincode
          set('pincode', matches[0].pincode)
        } else if (matches.length > 1) {
          setPincodeSuggestions(matches)
        }
      } catch {
        // Best-effort lookup; user can still enter the PIN code manually.
      } finally {
        if (requestId === pincodeRequestId.current) setPincodeLookupLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city])

  // Pincode -> City
  useEffect(() => {
    const trimmedPincode = pincode.trim()

    if (trimmedPincode.length !== 6 || trimmedPincode === lastAppliedPincode.current) return

    const requestId = ++cityRequestId.current
    const timer = setTimeout(async () => {
      setCityLookupLoading(true)
      try {
        const match = await lookupCityForPincode(trimmedPincode)
        if (requestId !== cityRequestId.current) return
        if (match) {
          lastAppliedCity.current = match.city
          set('city', match.city)
          if (!state.trim()) set('state', match.state)
        }
      } catch {
        // Best-effort lookup; user can still enter the city manually.
      } finally {
        if (requestId === cityRequestId.current) setCityLookupLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pincode])

  const applyPincodeSuggestion = (match) => {
    lastAppliedPincode.current = match.pincode
    set('pincode', match.pincode)
    setPincodeSuggestions([])
  }

  return { pincodeSuggestions, pincodeLookupLoading, cityLookupLoading, applyPincodeSuggestion }
}
