import { useEffect, useState } from 'react'
import api from '../api/axios'
import MultiSelectDropdown from './MultiCheckSelect'

export default function SalesReferenceOrgSelect({ value = [], onChange }) {
  const [salesOrganizations, setSalesOrganizations] = useState([])

  useEffect(() => {
    api.get('/onboarding/sales-organizations/')
      .then(({ data }) => setSalesOrganizations(data))
      .catch(() => setSalesOrganizations([]))
  }, [])

  return (
    <MultiSelectDropdown
      options={salesOrganizations}
      value={value}
      onChange={onChange}
      placeholder="-- Select sales reference org(s) --"
    />
  )
}
