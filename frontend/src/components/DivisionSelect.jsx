import { useEffect, useState } from 'react'
import api from '../api/axios'

export default function DivisionSelect({ value, onChange }) {
  const [divisions, setDivisions] = useState([])

  useEffect(() => {
    api.get('/onboarding/divisions/')
      .then(({ data }) => setDivisions(data))
      .catch(() => setDivisions([]))
  }, [])

  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">-- Select --</option>
      {divisions.map((division) => (
        <option key={division.value} value={division.value}>{division.label}</option>
      ))}
    </select>
  )
}
