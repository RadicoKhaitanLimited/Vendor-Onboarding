export const GST_STATE_CODES = {
  'Jammu And Kashmir': '01',
  'Jammu & Kashmir': '01',
  'Himachal Pradesh': '02',
  Punjab: '03',
  Chandigarh: '04',
  Uttarakhand: '05',
  Haryana: '06',
  Delhi: '07',
  Rajasthan: '08',
  'Uttar Pradesh': '09',
  Bihar: '10',
  Sikkim: '11',
  'Arunachal Pradesh': '12',
  Nagaland: '13',
  Manipur: '14',
  Mizoram: '15',
  Tripura: '16',
  Meghalaya: '17',
  Assam: '18',
  'West Bengal': '19',
  Jharkhand: '20',
  Orissa: '21',
  Odisha: '21',
  Chhattisgarh: '22',
  'Madhya Pradesh': '23',
  Gujarat: '24',
  'Dadra And Nagar Haveli & Daman And Diu': '26',
  'Dadra & Nagar Haveli': '26',
  'Daman & Diu': '26',
  Maharashtra: '27',
  Karnataka: '29',
  Goa: '30',
  Lakshadweep: '31',
  Kerala: '32',
  'Tamil Nadu': '33',
  Puducherry: '34',
  'Andaman And Nicobar': '35',
  'Andaman & Nicobar Islands': '35',
  Telangana: '36',
  'Andhra Pradesh': '37',
  Ladakh: '38',
  'Other Territory': '97',
  'Other Country': '99',
}

export function gstStateCodeForState(state) {
  return GST_STATE_CODES[String(state || '').trim()] || ''
}

export function validateGstStateCode(state, gstNumber) {
  const expectedCode = gstStateCodeForState(state)
  const actualCode = String(gstNumber || '').trim().slice(0, 2)
  if (!expectedCode || actualCode.length < 2) return null
  return actualCode === expectedCode
    ? null
    : `GST first two digits must be ${expectedCode} for ${state}.`
}
