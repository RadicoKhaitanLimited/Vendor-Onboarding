import { useEffect, useRef, useState } from 'react'
import { lookupIfsc, bankNamesLikelyMatch } from './ifscLookup'

const DEBOUNCE_MS = 500

export function useIfscVerification(ifscCode, bankName, branchName, set) {
  const [ifscLookupLoading, setIfscLookupLoading] = useState(false)
  const [ifscBankMismatch, setIfscBankMismatch] = useState(null)
  const [ifscNotFound, setIfscNotFound] = useState(false)

  const lastCheckedResult = useRef(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const code = ifscCode.trim().toUpperCase()
    setIfscBankMismatch(null)
    setIfscNotFound(false)

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) return

    if (lastCheckedResult.current?.code === code) {
      const result = lastCheckedResult.current
      if (bankName && !bankNamesLikelyMatch(bankName, result.bank)) {
        setIfscBankMismatch(result.bank)
      }
      return
    }

    const requestId = ++requestIdRef.current
    const timer = setTimeout(async () => {
      setIfscLookupLoading(true)
      try {
        const result = await lookupIfsc(code)
        if (requestId !== requestIdRef.current) return
        if (!result) return
        if (result.notFound) {
          setIfscNotFound(true)
          return
        }
        lastCheckedResult.current = { code, bank: result.bank }
        if (!branchName.trim()) set('branch_name', result.branch)
        if (bankName && !bankNamesLikelyMatch(bankName, result.bank)) {
          setIfscBankMismatch(result.bank)
        }
      } catch {
        // Best-effort verification; user can still proceed manually.
      } finally {
        setIfscLookupLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ifscCode, bankName])

  return { ifscLookupLoading, ifscBankMismatch, ifscNotFound }
}
