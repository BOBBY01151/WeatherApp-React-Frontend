import { useState } from 'react'
import './App.css'
import { apiBaseHint, checkHealth, fetchWeather } from './services/weatherApi'

const sampleWeather = {
  city: 'Sample City',
  temperature: 22.4,
  description: 'Clear sky — sample data',
  humidity: 58,
  windSpeed: 3.2,
  pressure: 1014,
  recordedAt: new Date().toISOString(),
  raw: { source: 'sample', note: 'Shown when the backend is unreachable' },
}

const statusLabels = {
  idle: 'Not checked',
  checking: 'Checking…',
  ok: 'Connected',
  degraded: 'Degraded',
  offline: 'Offline',
}

function App() {
  const [city, setCity] = useState('San Francisco')
  const [weather, setWeather] = useState(sampleWeather)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  const handleHealth = async () => {
    setStatus('checking')
    const payload = await checkHealth()
    const isUp = (payload.status || '').toUpperCase() === 'UP'

    if (isUp) {
      setStatus('ok')
      setError('')
    } else {
      setStatus('offline')
      const code = payload.httpStatus ? ` (${payload.httpStatus})` : ''
      setError(`Health check failed${code}. Is Spring Boot running on port 8084?`)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!city.trim()) return

    setLoading(true)
    setError('')

    try {
      const payload = await fetchWeather(city.trim())
      setWeather(normalizeWeather(payload, city.trim()))
      setStatus('ok')
      setLastUpdated(new Date())
    } catch (err) {
      setStatus('offline')
      setError('Could not reach Spring Boot. Showing sample data instead.')
      setWeather({ ...sampleWeather, city: city.trim() })
    } finally {
      setLoading(false)
    }
  }

  const displayedTimestamp = lastUpdated || weather.recordedAt

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Weather microservice UI</p>
          <h1>React frontend wired for Spring Boot</h1>
          <p className="lede">
            Call your backend from the browser without fighting CORS. Use the form to hit
            <span className="code"> /api/weather</span> and see the JSON instantly.
          </p>
        </div>
        <div className={`status-pill ${status}`}>
          <span className="dot" />
          {statusLabels[status] || 'Unknown'}
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="hint">Backend base: {apiBaseHint}</p>
            <p className="hint">Health endpoint: GET /actuator/health</p>
          </div>
          <button
            type="button"
            className="ghost"
            onClick={handleHealth}
            disabled={loading || status === 'checking'}
          >
            {status === 'checking' ? 'Checking…' : 'Check health'}
          </button>
        </div>

        <form className="query" onSubmit={handleSubmit}>
          <label htmlFor="city">City</label>
          <div className="input-row">
            <input
              id="city"
              name="city"
              autoComplete="off"
              placeholder="e.g. Seattle"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
            <button type="submit" disabled={loading || !city.trim()}>
              {loading ? 'Calling…' : 'Call /api/weather'}
            </button>
          </div>
        </form>

        {error ? <div className="callout error">{error}</div> : null}
        <div className="callout neutral">
          Tip: keep Spring Boot on port 8084 in dev, or set
          <span className="code"> VITE_API_BASE_URL</span> /
          <span className="code"> VITE_API_PROXY_TARGET</span>.
        </div>
      </section>

      <section className="grid">
        <article className="card highlight">
          <div className="card-meta">
            <span className="pill">{weather.city}</span>
            <span className="muted">Updated {formatTimestamp(displayedTimestamp)}</span>
          </div>
          <div className="temperature">
            {typeof weather.temperature === 'number' ? weather.temperature.toFixed(1) : '—'}
            <span>°C</span>
          </div>
          <p className="summary">{weather.description}</p>
          <div className="metrics">
            <Metric label="Humidity" value={weather.humidity} suffix="%" />
            <Metric label="Wind" value={weather.windSpeed} suffix=" m/s" />
            <Metric label="Pressure" value={weather.pressure} suffix=" hPa" />
          </div>
        </article>

        <article className="card code">
          <div className="card-meta">
            <strong>Raw response</strong>
            <span className="muted">Great for debugging field names</span>
          </div>
          <pre>
            <code>{JSON.stringify(weather.raw ?? weather, null, 2)}</code>
          </pre>
        </article>
      </section>
    </div>
  )
}

function Metric({ label, value, suffix }) {
  return (
    <div className="metric">
      <p className="muted">{label}</p>
      <p className="metric-value">
        {Number.isFinite(Number(value)) ? Number(value).toFixed(1) : '—'}
        <span>{suffix}</span>
      </p>
    </div>
  )
}

function formatTimestamp(value) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function normalizeWeather(payload, fallbackCity) {
  if (!payload || typeof payload !== 'object') return sampleWeather

  const temperature =
    payload.temperature ?? payload.temp ?? payload.main?.temp ?? sampleWeather.temperature
  const humidity = payload.humidity ?? payload.main?.humidity ?? sampleWeather.humidity
  const windSpeed = payload.windSpeed ?? payload.wind?.speed ?? sampleWeather.windSpeed
  const pressure = payload.pressure ?? payload.main?.pressure ?? sampleWeather.pressure
  const description =
    payload.description ??
    payload.summary ??
    payload.weather?.[0]?.description ??
    sampleWeather.description

  const recordedAt =
    payload.recordedAt ??
    payload.timestamp ??
    (payload.dt ? new Date(payload.dt * 1000).toISOString() : sampleWeather.recordedAt)

  return {
    city: payload.city ?? payload.name ?? fallbackCity ?? sampleWeather.city,
    temperature: Number(temperature),
    description,
    humidity: Number(humidity),
    windSpeed: Number(windSpeed),
    pressure: Number(pressure),
    recordedAt,
    raw: payload,
  }
}

export default App
