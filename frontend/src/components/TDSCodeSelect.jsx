import { useEffect, useState } from 'react'
import api from '../api/axios'
import MultiCheckSelect from './MultiCheckSelect'
import { effectiveTdsCode, isPanApprovalInvalid } from '../constants/tdsCodes'

const parseTdsCodes = (value) => {
  if (Array.isArray(value)) return value
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const stringifyTdsCodes = (values) => values.join(', ')

const describeTdsCode = (code, tdsCodes) => (
  tdsCodes.find((option) => option.value === code)?.label || code
)

// The vendor's original selection is preserved in form state as-is; the
// higher-rate code is only ever derived for display/export when PAN is
// invalid/inoperative, so a later PAN fix doesn't require re-selecting TDS codes.
export default function TDSCodeSelect({ value = '', onChange, disabled, panApprovalStatus }) {
  const [tdsCodes, setTdsCodes] = useState([])

  useEffect(() => {
    api.get('/onboarding/tds-codes/')
      .then(({ data }) => setTdsCodes(data))
      .catch(() => setTdsCodes([]))
  }, [])

  const panInvalid = isPanApprovalInvalid(panApprovalStatus)
  const selectedValues = parseTdsCodes(value)
  const swaps = selectedValues
    .map((code) => [code, effectiveTdsCode(code, panApprovalStatus)])
    .filter(([code, effective]) => code !== effective)

  return (
    <>
      <MultiCheckSelect
        options={tdsCodes}
        value={selectedValues}
        onChange={(values) => onChange(stringifyTdsCodes(values))}
        placeholder="Select TDS codes"
        disabled={disabled}
        emptyMessage="No matching TDS code."
      />
      {panInvalid && swaps.length > 0 && (
        <span className="hint" style={{ display: 'block', marginTop: 4 }}>
          PAN is invalid/inoperative — will be exported as{' '}
          {swaps.map(([, effective]) => describeTdsCode(effective, tdsCodes)).join(', ')} at the higher rate.
        </span>
      )}
    </>
  )
}
