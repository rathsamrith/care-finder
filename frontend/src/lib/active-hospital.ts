// Which of an account's hospitals the dashboard is acting on. Stored per
// browser and sent to the API as `X-Hospital-Id` (see plugins/axios.ts); the
// backend only honors it for hospitals the account really manages and
// otherwise falls back to the first one, so a stale value is harmless.
const KEY = 'active_hospital_id'

export const getActiveHospitalId = (): string | null => {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export const setActiveHospitalId = (id: string | number) => {
  try {
    localStorage.setItem(KEY, String(id))
  } catch {
    /* storage unavailable */
  }
}

export const clearActiveHospitalId = () => {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* storage unavailable */
  }
}
