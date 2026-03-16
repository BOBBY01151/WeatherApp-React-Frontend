const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
const PROXY_TARGET = import.meta.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8084'

const withBase = (path) => `${API_BASE}${path}`

export const apiBaseHint = API_BASE || `/api (proxy → ${PROXY_TARGET})`

export async function fetchWeather(city) {
  const url = withBase(`/api/weather?city=${encodeURIComponent(city)}`)
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || `Request failed (${res.status})`)
  }
  return res.json()
}

export async function checkHealth() {
  try {
    const res = await fetch(withBase('/actuator/health'))
    if (!res.ok) {
      return { status: 'DOWN', httpStatus: res.status }
    }
    return res.json()
  } catch (err) {
    return { status: 'DOWN', error: err?.message || 'Unavailable' }
  }
}
