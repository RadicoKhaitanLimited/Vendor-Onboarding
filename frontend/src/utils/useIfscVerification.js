import { useEffect, useRef, useState } from 'react'
import { lookupIfsc, bankNamesLikelyMatch, normalizeBankNameTokens } from './ifscLookup'
import { BANKS } from '../constants/banks'

const DEBOUNCE_MS = 500

// Auto-selecting the Bank Name dropdown needs to be precise (a wrong pick is
// worse than no pick). Only an exact match on the normalized token set counts —
// subset/overlap matching (as used for the mismatch warning elsewhere) is too
// loose here: e.g. "Bank of India" and "State Bank of India" both normalize
// to token sets that are subsets of each other after stripping "bank"/"of".
function closestBankOption(resolvedBankName) {
  const resolvedTokens = normalizeBankNameTokens(resolvedBankName)
  if (!resolvedTokens.length) return 'Other'
  const resolvedKey = [...resolvedTokens].sort().join(' ')

  for (const option of BANKS) {
    if (option === 'Other') continue
    const optionTokens = normalizeBankNameTokens(option)
    if (!optionTokens.length) continue
    const optionKey = [...optionTokens].sort().join(' ')
    if (optionKey === resolvedKey) return option
  }
  return 'Other'
}

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
      if (!bankName) {
        set('bank_name', closestBankOption(result.bank))
      } else if (!bankNamesLikelyMatch(bankName, result.bank)) {
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
        if (!bankName) {
          set('bank_name', closestBankOption(result.bank))
        } else if (!bankNamesLikelyMatch(bankName, result.bank)) {
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
