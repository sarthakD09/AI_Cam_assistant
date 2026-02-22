export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:5000'

export const PREDICT_URL = `${API_BASE}/predict`
export const DETECT_URL = `${API_BASE}/detect`
export const SMART_URL = `${API_BASE}/smart`


