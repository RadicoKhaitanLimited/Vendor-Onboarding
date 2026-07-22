import { useEffect, useState } from 'react'
import api from '../api/axios'
import SearchableSelect from './SearchableSelect'

export default function PaymentTermsSelect({ value, onChange }) {
  const [terms, setTerms] = useState([])

  useEffect(() => {
    api.get('/onboarding/payment-terms/')
      .then(({ data }) => setTerms(data))
      .catch(() => setTerms([]))
  }, [])

  return (
    <SearchableSelect options={terms} value={value} onChange={onChange} />
  )
}
