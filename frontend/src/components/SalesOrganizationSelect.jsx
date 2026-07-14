import { useEffect, useState } from 'react'
import api from '../api/axios'

export default function SalesOrganizationSelect({ value, onChange }) {
  const [salesOrganizations, setSalesOrganizations] = useState([])

  useEffect(() => {
    api.get('/onboarding/sales-organizations/')
      .then(({ data }) => setSalesOrganizations(data))
      .catch(() => setSalesOrganizations([]))
  }, [])

  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">-- Select --</option>
      {salesOrganizations.map((salesOrganization) => (
        <option key={salesOrganization.value} value={salesOrganization.value}>{salesOrganization.label}</option>
      ))}
    </select>
  )
}
