import { useEffect, useState } from 'react'
import api from '../api/axios'

export default function PaymentTermsSelect() {
  const [terms, setTerms] = useState([])

  useEffect(() => {
    api.get('/onboarding/payment-terms/')
      .then(({ data }) => setTerms(data))
      .catch(() => setTerms([]))
  }, [])

  return (
    <>
      {terms.map((term) => (
        <option key={term.value} value={term.value}>{term.label}</option>
      ))}
    </>
  )
}
