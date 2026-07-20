// Vendor Reference Master group codes for which TDS Codes must be filled in.
export const TDS_MANDATORY_GROUP_CODES = [
  'VC&F', 'VRMS', 'VSMS', 'VPMS', 'VCIS', 'VCON', 'VPRF', 'VTRP', 'VOTH', 'VMKT',
]

export const isTdsMandatoryForGroupCode = (groupCode) => (
  TDS_MANDATORY_GROUP_CODES.includes(String(groupCode || '').trim().toUpperCase())
)
