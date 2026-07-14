import { useEffect, useState } from 'react'
import api from '../api/axios'

export default function DistributionChannelSelect({ value, onChange }) {
  const [distributionChannels, setDistributionChannels] = useState([])

  useEffect(() => {
    api.get('/onboarding/distribution-channels/')
      .then(({ data }) => setDistributionChannels(data))
      .catch(() => setDistributionChannels([]))
  }, [])

  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">-- Select --</option>
      {distributionChannels.map((distributionChannel) => (
        <option key={distributionChannel.value} value={distributionChannel.value}>{distributionChannel.label}</option>
      ))}
    </select>
  )
}
