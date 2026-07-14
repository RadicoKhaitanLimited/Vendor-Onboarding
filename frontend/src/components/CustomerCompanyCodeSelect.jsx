import { useEffect, useState } from 'react'
import api from '../api/axios'

export default function CustomerCompanyCodeSelect({ value, onChange }) {
  const [companyCodes, setCompanyCodes] = useState([])

  useEffect(() => {
    api.get('/onboarding/customer-company-codes/')
      .then(({ data }) => setCompanyCodes(data))
      .catch(() => setCompanyCodes([]))
  }, [])

  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">-- Select --</option>
      {companyCodes.map((companyCode) => (
        <option key={companyCode.value} value={companyCode.value}>{companyCode.label}</option>
      ))}
    </select>
  )
}
