import { useState, useEffect } from 'react'
import './App.css'
import { apiBaseHint, checkHealth, fetchWeather } from './services/weatherApi'

const sampleWeather = {
  city: 'San Francisco',
  temperature: 18.5,
  description: 'Partly cloudy — demo mode',
  humidity: 62,
  windSpeed: 4.1,
  pressure: 1012,
  recordedAt: new Date().toISOString(),
  raw: { source: 'demo', note: 'Start the Spring Boot backend to see real-time data' },
}

const statusLabels = {
  idle: 'Sync Pending',
  checking: 'Synchronizing…',
  ok: 'Node Active',
  degraded: 'Link Degraded',
  offline: 'Node Offline',
}

function App() {
  const [city, setCity] = useState('San Francisco')
  const [weather, setWeather] = useState(sampleWeather)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleHealth = async () => {
    setStatus('checking')
    try {
      const payload = await checkHealth()
      const isUp = (payload.status || '').toUpperCase() === 'UP'
      if (isUp) {
        setStatus('ok')
        setError('')
      } else {
        setStatus('offline')
        setError(`Connection refused. Verify Spring Boot is running on port 8084.`)
      }
    } catch (err) {
      setStatus('offline')
      setError('Network error. Is the backend unreachable?')
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
      setError('Could not reach backend. Switched to demo data.')
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
          <p className="eyebrow">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • Weather Intel
          </p>
          <h1>Atmospheric Intelligence</h1>
          <p className="lede">
            Advanced weather monitoring interface powered by Spring Boot microservices. 
            Real-time data synchronization with secure API endpoints.
          </p>
        </div>
        <div className={`status-pill ${status}`}>
          <span className="dot" />
          {statusLabels[status] || 'Unknown State'}
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="hint">Gateway: {apiBaseHint}</p>
            <p className="hint">Health: actuator/health</p>
          </div>
          <button
            type="button"
            className="ghost"
            onClick={handleHealth}
            disabled={loading || status === 'checking'}
          >
            {status === 'checking' ? 'Syncing…' : 'Sync Gateway'}
          </button>
        </div>

        <form className="query" onSubmit={handleSubmit}>
          <label htmlFor="city">Target Location</label>
          <div className="input-row">
            <input
              id="city"
              name="city"
              autoComplete="off"
              placeholder="Enter city..."
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
            <button type="submit" disabled={loading || !city.trim()}>
              {loading ? 'Consulting...' : 'Fetch Forecast'}
            </button>
          </div>
        </form>

        {error && <div className="callout error"><span>⚠️</span> {error}</div>}
        <div className="callout neutral">
          <span>ℹ️</span> Pro Tip: Ensure your microservice backend is active for live telemetry.
        </div>
      </section>

      <section className="grid">
        <article className="card">
          <div className="card-meta">
            <span className="pill">{weather.city}</span>
            <span className="muted">Refreshed: {formatTimestamp(displayedTimestamp)}</span>
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
            <strong>Stream Data</strong>
            <span className="muted">Live JSON Payload</span>
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
    timeStyle: 'short',
    dateStyle: 'medium',
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
