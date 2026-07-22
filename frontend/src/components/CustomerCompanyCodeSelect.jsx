import { useEffect, useState } from 'react'
import api from '../api/axios'
import SearchableSelect from './SearchableSelect'

export default function CustomerCompanyCodeSelect({ value, onChange }) {
  const [companyCodes, setCompanyCodes] = useState([])

  useEffect(() => {
    api.get('/onboarding/customer-company-codes/')
      .then(({ data }) => setCompanyCodes(data))
      .catch(() => setCompanyCodes([]))
  }, [])

  return (
    <SearchableSelect options={companyCodes} value={value} onChange={onChange} />
  )
}
