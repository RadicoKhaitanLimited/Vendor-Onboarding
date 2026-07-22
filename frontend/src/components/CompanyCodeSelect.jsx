import { useEffect, useState } from 'react'
import api from '../api/axios'
import SearchableSelect from './SearchableSelect'

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
    <SearchableSelect options={companyCodes} value={value} onChange={onChange} disabled={disabled} />
  )
}
