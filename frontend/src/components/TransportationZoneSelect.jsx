import { useEffect, useState } from 'react'
import api from '../api/axios'

export default function TransportationZoneSelect({ value, onChange }) {
  const [zones, setZones] = useState([])

  useEffect(() => {
    api.get('/onboarding/transportation-zones/')
      .then(({ data }) => setZones(data))
      .catch(() => setZones([]))
  }, [])

  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">-- Select --</option>
      {zones.map((zone) => (
        <option key={zone.value} value={zone.value}>{zone.label}</option>
      ))}
    </select>
  )
}
