import { useEffect, useState } from 'react'
import api from '../api/axios'

export default function DeliveryPlantSelect({ value, onChange }) {
  const [plants, setPlants] = useState([])

  useEffect(() => {
    api.get('/onboarding/delivery-plants/')
      .then(({ data }) => setPlants(data))
      .catch(() => setPlants([]))
  }, [])

  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">-- Select --</option>
      {plants.map((plant) => (
        <option key={plant.value} value={plant.value}>{plant.label}</option>
      ))}
    </select>
  )
}
