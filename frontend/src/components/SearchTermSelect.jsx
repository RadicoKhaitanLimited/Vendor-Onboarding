import { useEffect, useState } from 'react'
import api from '../api/axios'

export default function SearchTermSelect({ value, onChange }) {
  const [searchTerms, setSearchTerms] = useState([])

  useEffect(() => {
    api.get('/onboarding/search-terms/')
      .then(({ data }) => setSearchTerms(data))
      .catch(() => setSearchTerms([]))
  }, [])

  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">-- Select --</option>
      {searchTerms.map((searchTerm) => (
        <option key={searchTerm.value} value={searchTerm.value}>{searchTerm.label}</option>
      ))}
    </select>
  )
}
