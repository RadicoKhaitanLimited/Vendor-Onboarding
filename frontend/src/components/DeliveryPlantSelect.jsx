import { useEffect, useState } from 'react'
import api from '../api/axios'

export default function DeliveryPlantSelect({ value, onChange, salesOrganizations = [], distributionChannel }) {
  const [plants, setPlants] = useState([])

  useEffect(() => {
    const params = {}
    if (distributionChannel) params.distribution_channel = distributionChannel
    api.get('/onboarding/delivery-plants/', { params })
      .then(({ data }) => setPlants(data))
      .catch(() => setPlants([]))
  }, [distributionChannel])

  const options = salesOrganizations.length
    ? plants.filter((plant) => salesOrganizations.includes(plant.sales_organization))
    : plants

  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">-- Select --</option>
      {options.map((plant) => (
        <option key={plant.value} value={plant.value}>{plant.label}</option>
      ))}
    </select>
  )
}
