import { useEffect, useState } from 'react'
import api from '../api/axios'
import MultiSelectDropdown from './MultiCheckSelect'

const splitPurchaseOrgValue = (value) => (
  Array.isArray(value)
    ? value
    : String(value || '').split(',').map((item) => item.trim()).filter(Boolean)
)

export default function PurchaseOrganizationFields({
  referenceValue,
  onReferenceChange,
  openValue,
  onOpenChange,
  searchTermField,
  companyCodeField,
}) {
  const [organizations, setOrganizations] = useState([])
  const selectedCreatedValues = splitPurchaseOrgValue(openValue)
  const selectedReferenceValues = splitPurchaseOrgValue(referenceValue)

  useEffect(() => {
    api.get('/onboarding/purchase-organizations/')
      .then(({ data }) => setOrganizations(data))
      .catch(() => setOrganizations([]))
  }, [])

  return (
    <>
      <div className="field">
        <label>Purchase Org. in which to be Created</label>
        <MultiSelectDropdown
          options={organizations}
          value={selectedCreatedValues}
          onChange={onOpenChange}
          placeholder="-- Select purchase org(s) --"
        />
      </div>
      {searchTermField}
      {companyCodeField}
      <div className="field">
        <label>Reference Purchase Org.</label>
        <MultiSelectDropdown
          options={organizations}
          value={selectedReferenceValues}
          onChange={onReferenceChange}
          placeholder="-- Select purchase org(s) --"
          disabled
        />
      </div>
    </>
  )
}
