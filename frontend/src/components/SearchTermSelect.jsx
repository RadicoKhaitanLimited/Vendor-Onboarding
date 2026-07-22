import { useEffect, useState } from 'react'
import api from '../api/axios'
import SearchableSelect from './SearchableSelect'

export default function SearchTermSelect({ value, onChange }) {
  const [searchTerms, setSearchTerms] = useState([])

  useEffect(() => {
    api.get('/onboarding/search-terms/')
      .then(({ data }) => setSearchTerms(data))
      .catch(() => setSearchTerms([]))
  }, [])

  return (
    <SearchableSelect options={searchTerms} value={value} onChange={onChange} />
  )
}
