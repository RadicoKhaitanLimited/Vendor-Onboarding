import { useEffect, useState } from 'react'
import api from '../api/axios'
import SearchableSelect from './SearchableSelect'

export default function DistributionChannelSelect({ value, onChange }) {
  const [distributionChannels, setDistributionChannels] = useState([])

  useEffect(() => {
    api.get('/onboarding/distribution-channels/')
      .then(({ data }) => setDistributionChannels(data))
      .catch(() => setDistributionChannels([]))
  }, [])

  return (
    <SearchableSelect options={distributionChannels} value={value} onChange={onChange} />
  )
}
