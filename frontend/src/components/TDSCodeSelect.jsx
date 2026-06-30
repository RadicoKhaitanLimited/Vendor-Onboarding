import { useEffect, useState } from 'react'
import api from '../api/axios'
import MultiCheckSelect from './MultiCheckSelect'

const parseTdsCodes = (value) => {
  if (Array.isArray(value)) return value
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const stringifyTdsCodes = (values) => values.join(', ')

export default function TDSCodeSelect({ value = '', onChange, disabled }) {
  const [tdsCodes, setTdsCodes] = useState([])

  useEffect(() => {
    api.get('/onboarding/tds-codes/')
      .then(({ data }) => setTdsCodes(data))
      .catch(() => setTdsCodes([]))
  }, [])

  return (
    <MultiCheckSelect
      options={tdsCodes}
      value={parseTdsCodes(value)}
      onChange={(values) => onChange(stringifyTdsCodes(values))}
      placeholder="Select TDS codes"
      disabled={disabled}
      emptyMessage="No matching TDS code."
    />
  )
}
