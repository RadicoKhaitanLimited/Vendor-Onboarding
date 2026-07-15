import { useEffect, useRef, useState } from 'react'
import { lookupCityForPincode, lookupPincodesForCity } from './pincodeLookup'

const DEBOUNCE_MS = 350

export function useCityPincodeSync(city, state, pincode, set) {
  const [pincodeSuggestions, setPincodeSuggestions] = useState([])
  const [pincodeLookupLoading, setPincodeLookupLoading] = useState(false)
  const [cityLookupLoading, setCityLookupLoading] = useState(false)

  // Tracks what the sync itself last wrote, per field, so we can tell an
  // auto-filled value apart from one the user typed — and so clearing the
  // field that produced it can clear the dependent value too.
  const autoFilled = useRef({ city: null, state: null, pincode: null })
  const pincodeRequestId = useRef(0)
  const cityRequestId = useRef(0)

  const setAuto = (key, value) => {
    autoFilled.current[key] = value
    set(key, value)
  }

  // If the user has edited a field away from what we last auto-filled it to,
  // treat it as theirs from now on — a clear elsewhere should never wipe a
  // value the user typed or picked themselves.
  if (autoFilled.current.state !== null && autoFilled.current.state !== state.trim()) {
    autoFilled.current.state = null
  }

  // City -> Pincode (+ State)
  useEffect(() => {
    const trimmedCity = city.trim()
    setPincodeSuggestions([])

    if (!trimmedCity) {
      // City was cleared — clear whatever this sync had derived from it.
      if (autoFilled.current.pincode !== null) {
        autoFilled.current.pincode = null
        set('pincode', '')
      }
      if (autoFilled.current.state !== null) {
        autoFilled.current.state = null
        set('state', '')
      }
      return
    }

    // If the city text no longer matches what we auto-filled it to, whatever
    // we derived from the old city is stale — drop it before re-searching.
    if (autoFilled.current.city !== null && autoFilled.current.city !== trimmedCity) {
      autoFilled.current.city = null
    }

    const requestId = ++pincodeRequestId.current
    const timer = setTimeout(async () => {
      setPincodeLookupLoading(true)
      try {
        const matches = await lookupPincodesForCity(trimmedCity, state)
        if (requestId !== pincodeRequestId.current) return
        if (matches.length === 1) {
          setAuto('pincode', matches[0].pincode)
          if (!state.trim() || autoFilled.current.state !== null) setAuto('state', matches[0].state)
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

  // Pincode -> City (+ State)
  useEffect(() => {
    const trimmedPincode = pincode.trim()

    if (!trimmedPincode) {
      // Pincode was cleared — clear whatever this sync had derived from it.
      if (autoFilled.current.city !== null) {
        autoFilled.current.city = null
        set('city', '')
      }
      if (autoFilled.current.state !== null) {
        autoFilled.current.state = null
        set('state', '')
      }
      return
    }

    if (trimmedPincode.length !== 6) return

    if (autoFilled.current.pincode !== null && autoFilled.current.pincode !== trimmedPincode) {
      autoFilled.current.pincode = null
    }

    const requestId = ++cityRequestId.current
    const timer = setTimeout(async () => {
      setCityLookupLoading(true)
      try {
        const match = await lookupCityForPincode(trimmedPincode)
        if (requestId !== cityRequestId.current) return
        if (match) {
          setAuto('city', match.city)
          if (!state.trim() || autoFilled.current.state !== null) setAuto('state', match.state)
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
    setAuto('pincode', match.pincode)
    if (!state.trim() || autoFilled.current.state !== null) setAuto('state', match.state)
    setPincodeSuggestions([])
  }

  return { pincodeSuggestions, pincodeLookupLoading, cityLookupLoading, applyPincodeSuggestion }
}
