import { useEffect, useState } from 'react'
import api from '../api/axios'
import SearchableSelect from './SearchableSelect'

export default function DeliveryPlantSelect({ value, onChange }) {
  const [plants, setPlants] = useState([])

  useEffect(() => {
    api.get('/onboarding/delivery-plants/')
      .then(({ data }) => setPlants(data))
      .catch(() => setPlants([]))
  }, [])

  return (
    <SearchableSelect options={plants} value={value} onChange={onChange} />
  )
}
