import { useEffect, useState } from 'react'
import api from '../api/axios'
import SearchableSelect from './SearchableSelect'

export default function DivisionSelect({ value, onChange }) {
  const [divisions, setDivisions] = useState([])

  useEffect(() => {
    api.get('/onboarding/divisions/')
      .then(({ data }) => setDivisions(data))
      .catch(() => setDivisions([]))
  }, [])

  return (
    <SearchableSelect options={divisions} value={value} onChange={onChange} />
  )
}
