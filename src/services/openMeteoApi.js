const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

const withBase = (path) => `${API_BASE}${path}`

export async function fetchOpenMeteoCurrent(lat, lon) {
  // Call our backend, which proxies Open-Meteo. This avoids CORS issues and reduces noisy
  // browser-console errors when the client network blocks external APIs.
  const url = withBase(
    `/api/live-weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
  )

  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || `Live weather request failed (${res.status})`)
  }

  const data = await res.json()

  return {
    temperature: Number(data.temperature),
    humidity: Number(data.humidity),
    windSpeed: Number(data.windSpeed),
    pressure: Math.round(Number(data.pressure)),
    weatherCode: data.weatherCode == null ? null : Number(data.weatherCode),
    recordedAt: data.recordedAt,
    raw: data,
  }
}
