import { useEffect, useState } from 'react'
import api from '../api/axios'

export default function CompanyCodeSelect({ value, onChange, disabled = false }) {
  const [companyCodes, setCompanyCodes] = useState([])

  useEffect(() => {
    api.get('/onboarding/company-codes/')
      .then(({ data }) => setCompanyCodes(data))
      .catch(() => setCompanyCodes([]))
  }, [])

  const selectedCompanyCode = companyCodes.find((companyCode) => companyCode.value === value)
  const displayValue = selectedCompanyCode ? selectedCompanyCode.label : value

  if (disabled) {
    return (
      <input
        type="text"
        value={displayValue}
        readOnly
        onFocus={(event) => event.target.select()}
        style={{
          fontWeight: 700,
          cursor: 'text',
          userSelect: 'text',
        }}
      />
    )
  }

  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
      <option value="">-- Select --</option>
      {companyCodes.map((companyCode) => (
        <option key={companyCode.value} value={companyCode.value}>{companyCode.label}</option>
      ))}
    </select>
  )
}
