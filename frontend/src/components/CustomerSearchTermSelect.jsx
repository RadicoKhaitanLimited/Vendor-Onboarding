import { useEffect, useState } from 'react'
import api from '../api/axios'

export default function CustomerSearchTermSelect({ value, onChange }) {
  const [searchTerms, setSearchTerms] = useState([])

  useEffect(() => {
    api.get('/onboarding/customer-search-terms/')
      .then(({ data }) => setSearchTerms(data))
      .catch(() => setSearchTerms([]))
  }, [])

  return (
    <>
      <input
        type="text"
        list="customer-search-term-options"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Type or select a search term"
      />
      <datalist id="customer-search-term-options">
        {searchTerms.map((searchTerm) => (
          <option key={searchTerm.value} value={searchTerm.value}>{searchTerm.label}</option>
        ))}
      </datalist>
    </>
  )
}
