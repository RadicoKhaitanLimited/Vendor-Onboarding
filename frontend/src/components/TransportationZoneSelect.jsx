import { useEffect, useState } from 'react'
import api from '../api/axios'
import SearchableSelect from './SearchableSelect'

export default function TransportationZoneSelect({ value, onChange }) {
  const [zones, setZones] = useState([])

  useEffect(() => {
    api.get('/onboarding/transportation-zones/')
      .then(({ data }) => setZones(data))
      .catch(() => setZones([]))
  }, [])

  return (
    <SearchableSelect options={zones} value={value} onChange={onChange} />
  )
}
