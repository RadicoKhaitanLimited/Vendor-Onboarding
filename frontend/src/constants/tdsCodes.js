// Higher-rate (206AA/206AB) equivalents applied when PAN verification has
// failed or the PAN is valid but inoperative. Must mirror
// backend/apps/onboarding/views.py::TDS_HIGHER_RATE_CODES.
export const TDS_HIGHER_RATE_CODES = {
  I1: 'ID',
  I2: 'ID',
  I3: 'II',
  I4: 'IC',
  I5: 'IF',
  IB: 'IK',
  I8: 'IJ',
  I9: 'IG',
  IA: 'IA',
  IQ: 'IH',
  IR: 'IS',
}

export const PAN_APPROVAL_STATUS = {
  PENDING: 'pending',
  VALID_OPERATIVE: 'valid_operative',
  VALID_INOPERATIVE: 'valid_inoperative',
  FAILED: 'failed',
}

const hasAny = (value, terms) => {
  const normalized = String(value || '').toLowerCase()
  return terms.some((term) => normalized.includes(term))
}

export const classifyPanApprovalStatus = (record) => {
  const status = record.pan_verification_status
  if (!record.pan_number || !status) return PAN_APPROVAL_STATUS.PENDING
  if (hasAny(status, ['invalid', 'failed', 'failure', 'error', 'no records', 'not found'])) return PAN_APPROVAL_STATUS.FAILED
  if (hasAny(status, ['inoperative', 'not operative'])) return PAN_APPROVAL_STATUS.VALID_INOPERATIVE
  if (record.pan_verified || hasAny(status, ['valid'])) return PAN_APPROVAL_STATUS.VALID_OPERATIVE
  return PAN_APPROVAL_STATUS.FAILED
}

export const isPanApprovalInvalid = (panApprovalStatus) => (
  panApprovalStatus === PAN_APPROVAL_STATUS.FAILED || panApprovalStatus === PAN_APPROVAL_STATUS.VALID_INOPERATIVE
)

export const effectiveTdsCode = (tdsCode, panApprovalStatus) => (
  isPanApprovalInvalid(panApprovalStatus) ? (TDS_HIGHER_RATE_CODES[tdsCode] || tdsCode) : tdsCode
)
