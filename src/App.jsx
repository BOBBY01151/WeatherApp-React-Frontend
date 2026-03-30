import { useState, useEffect, useRef } from 'react'
import './App.css'
import LocationPicker from './components/LocationPicker'
import {
  apiBaseHint,
  checkHealth,
  fetchWeather,
  listObservations,
  saveObservation,
} from './services/weatherApi'
import { fetchOpenMeteoCurrent } from './services/openMeteoApi'

const sampleWeather = {
  city: 'San Francisco',
  temperature: 18.5,
  description: 'Partly cloudy — demo mode',
  humidity: 62,
  windSpeed: 4.1,
  pressure: 1012,
  weatherCode: null,
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
  const [observations, setObservations] = useState([])
  const [dbError, setDbError] = useState('')
  const [dbNotice, setDbNotice] = useState('')
  const [dbBusy, setDbBusy] = useState(false)
  const [location, setLocation] = useState(() => ({
    lat: 37.7749,
    lon: -122.4194,
  }))
  const [locationError, setLocationError] = useState('')
  const [locationBusy, setLocationBusy] = useState(false)
  const [liveBusy, setLiveBusy] = useState(false)
  const liveRequestSeq = useRef(0)
  const [testData, setTestData] = useState(() => ({
    city: 'Colombo',
    temperature: '28',
    humidity: '70',
    windSpeed: '3.2',
    pressure: '1012',
    description: 'manual db test',
    source: 'ui-test',
  }))

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const requestLiveWeather = async (lat, lon) => {
    const requestId = ++liveRequestSeq.current
    setLiveBusy(true)
    setLocationError('')

    try {
      const payload = await fetchOpenMeteoCurrent(lat, lon)
      if (requestId !== liveRequestSeq.current) return
      setWeather(toOpenMeteoWeather(payload, { lat, lon }))
      setLastUpdated(new Date())
    } catch (err) {
      if (requestId !== liveRequestSeq.current) return
      setLocationError(err?.message || 'Failed to fetch live weather data.')
    } finally {
      if (requestId === liveRequestSeq.current) {
        setLiveBusy(false)
      }
    }
  }

  const handleUseMyLocation = () => {
    setLocationError('')

    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by this browser.')
      return
    }

    // Browsers block geolocation on insecure origins (anything not https://, except localhost).
    if (!window.isSecureContext) {
      const host = window.location?.hostname
      const isLocal =
        host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
      if (!isLocal) {
        setLocationError(
          'Geolocation requires HTTPS (or localhost). Open the app on https:// or http://localhost:5173.',
        )
        return
      }
    }

    setLocationBusy(true)
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude
          const lon = pos.coords.longitude
          setLocation({ lat, lon })
          setLocationBusy(false)
          requestLiveWeather(lat, lon)
        },
        (err) => {
          setLocationError(formatGeoError(err))
          setLocationBusy(false)
        },
        { enableHighAccuracy: true, timeout: 20_000, maximumAge: 60_000 },
      )
    } catch (err) {
      setLocationError(err?.message || 'Failed to request your location.')
      setLocationBusy(false)
    }
  }

  const handleFetchLiveWeather = async () => {
    if (!location) return
    requestLiveWeather(location.lat, location.lon)
  }

  const handleHealth = async () => {
    setStatus('checking')
    try {
      const payload = await checkHealth()
      const gatewayStatus = (payload.status || '').toUpperCase()

      if (gatewayStatus === 'UP') {
        setStatus('ok')
        setError('')
        return
      }

      if (gatewayStatus === 'DEGRADED') {
        setStatus('degraded')
        setError('Backend is reachable, but the database is DOWN. Start MySQL and retry.')
        return
      }

      setStatus('offline')
      setError('Backend is offline. Verify Spring Boot is running on port 8084.')
    } catch {
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
    } catch {
      setStatus('offline')
      setError('Could not reach backend. Switched to demo data.')
      setWeather({ ...sampleWeather, city: city.trim() })
    } finally {
      setLoading(false)
    }
  }

  const loadObservations = async () => {
    const rows = await listObservations(25)
    setObservations(Array.isArray(rows) ? rows : [])
  }

  const handleLoadObservations = async () => {
    setDbBusy(true)
    setDbError('')
    setDbNotice('')
    try {
      await loadObservations()
    } catch {
      setDbError('Failed to load records. Is MySQL running and the backend connected?')
    } finally {
      setDbBusy(false)
    }
  }

  const handleSaveObservation = async () => {
    setDbBusy(true)
    setDbError('')
    setDbNotice('')
    try {
      const saved = await saveObservation(toObservationPayload(weather))
      setDbNotice(`Saved current forecast to MySQL (id: ${saved.id}).`)
      await loadObservations()
    } catch {
      setDbError('Failed to save record. Is MySQL running and the backend connected?')
    } finally {
      setDbBusy(false)
    }
  }

  const handleUseCurrentAsTest = () => {
    setTestData({
      city: String(weather?.city || '').trim() || 'Colombo',
      temperature: String(Number(weather?.temperature ?? 0)),
      humidity: String(Number(weather?.humidity ?? 0)),
      windSpeed: String(Number(weather?.windSpeed ?? 0)),
      pressure: String(Number(weather?.pressure ?? 0)),
      description: String(weather?.description || ''),
      source: String(weather?.raw?.source || 'ui-test'),
    })
  }

  const handleSaveTestData = async (event) => {
    event.preventDefault()

    setDbBusy(true)
    setDbError('')
    setDbNotice('')

    try {
      const saved = await saveObservation(toObservationPayloadFromTest(testData))
      setDbNotice(`Saved TEST data to MySQL (id: ${saved.id}).`)
      await loadObservations()
    } catch {
      setDbError('Failed to save TEST data. Is MySQL running and the backend connected?')
    } finally {
      setDbBusy(false)
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
            <p className="hint">Ping: /api/ping</p>
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

      <section className="card location">
        <div className="card-meta">
          <div>
            <strong>Location</strong>
            <p className="muted">
              Pick a spot on the map (OpenStreetMap) or use your GPS location, then fetch live conditions (Open-Meteo).
            </p>
          </div>
          <div className="location-actions">
            <button
              type="button"
              className="ghost"
              onClick={handleUseMyLocation}
              disabled={locationBusy || liveBusy}
              title="Browser permission required (works on https:// or localhost)."
            >
              {locationBusy ? 'Locating…' : 'Use My Location'}
            </button>
            <button
              type="button"
              onClick={handleFetchLiveWeather}
              disabled={!location || liveBusy}
              title="Fetch live current conditions for the selected coordinates."
            >
              {liveBusy ? 'Fetching…' : 'Fetch Live Weather'}
            </button>
          </div>
        </div>

        {locationError ? (
          <div className="callout error">
            <span>⚠️</span> {locationError}
          </div>
        ) : null}

        <div className="location-body">
          <LocationPicker
            value={location}
            onChange={(next) => {
              setLocation(next)
              requestLiveWeather(next.lat, next.lon)
            }}
            className="location-map"
          />
          <div className="location-readout">
            <div>
              <p className="muted">Selected Coordinates</p>
              <p className="mono coords">
                {formatCoord(location?.lat)}, {formatCoord(location?.lon)}
              </p>
            </div>
            <p className="muted">Tip: click on the map or drag the marker to fine-tune.</p>
          </div>
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

      <section className="card db">
        <div className="card-meta">
          <div>
            <strong>Database</strong>
            <p className="muted">Save your current forecast and verify it persists in MySQL.</p>
          </div>
          <div className="db-actions">
            <button
              type="button"
              className="ghost"
              onClick={handleLoadObservations}
              disabled={dbBusy}
            >
              {dbBusy ? 'Loading…' : 'Load Records'}
            </button>
            <button
              type="button"
              onClick={handleSaveObservation}
              disabled={dbBusy || status !== 'ok'}
              title={
                status === 'degraded'
                  ? 'Database is down. Start MySQL, then sync again.'
                  : status !== 'ok'
                    ? 'Sync the backend first, then fetch a forecast.'
                    : undefined
              }
            >
              Save Current
            </button>
          </div>
        </div>

        {dbError ? (
          <div className="callout error">
            <span>⚠️</span> {dbError}
          </div>
        ) : null}

        {dbNotice ? (
          <div className="callout success">
            <span>✅</span> {dbNotice}
          </div>
        ) : null}

        <form className="db-form" onSubmit={handleSaveTestData}>
          <div className="db-form-head">
            <div>
              <strong>Test Data</strong>
              <p className="muted">Manually send a record to MySQL and confirm it appears below.</p>
            </div>
            <button type="button" className="ghost" onClick={handleUseCurrentAsTest} disabled={dbBusy}>
              Use Current
            </button>
          </div>

          <div className="db-form-grid">
            <label>
              <span className="muted">City</span>
              <input
                value={testData.city}
                onChange={(e) => setTestData((s) => ({ ...s, city: e.target.value }))}
                placeholder="City"
              />
            </label>

            <label>
              <span className="muted">Temperature (C)</span>
              <input
                type="number"
                step="0.1"
                value={testData.temperature}
                onChange={(e) => setTestData((s) => ({ ...s, temperature: e.target.value }))}
              />
            </label>

            <label>
              <span className="muted">Humidity (%)</span>
              <input
                type="number"
                step="1"
                value={testData.humidity}
                onChange={(e) => setTestData((s) => ({ ...s, humidity: e.target.value }))}
              />
            </label>

            <label>
              <span className="muted">Wind (m/s)</span>
              <input
                type="number"
                step="0.1"
                value={testData.windSpeed}
                onChange={(e) => setTestData((s) => ({ ...s, windSpeed: e.target.value }))}
              />
            </label>

            <label>
              <span className="muted">Pressure (hPa)</span>
              <input
                type="number"
                step="1"
                value={testData.pressure}
                onChange={(e) => setTestData((s) => ({ ...s, pressure: e.target.value }))}
              />
            </label>

            <label>
              <span className="muted">Source</span>
              <input
                value={testData.source}
                onChange={(e) => setTestData((s) => ({ ...s, source: e.target.value }))}
                placeholder="ui-test"
              />
            </label>

            <label className="db-form-desc">
              <span className="muted">Description</span>
              <textarea
                value={testData.description}
                onChange={(e) => setTestData((s) => ({ ...s, description: e.target.value }))}
                placeholder="Description"
              />
            </label>
          </div>

          <div className="db-form-actions">
            <button
              type="submit"
              disabled={dbBusy || status !== 'ok' || !testData.city.trim()}
              title={
                status === 'degraded'
                  ? 'Database is down. Start MySQL, then sync again.'
                  : status !== 'ok'
                    ? 'Sync the backend first.'
                    : undefined
              }
            >
              Save Test Data
            </button>
          </div>
        </form>

        <div className="db-scroll">
          {observations.length ? (
            <table className="db-table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>City</th>
                  <th>Temp</th>
                  <th>Humidity</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {observations.map((row) => (
                  <tr key={row.id}>
                    <td className="mono">{formatTimestamp(row.createdAt || row.recordedAt)}</td>
                    <td>{row.city}</td>
                    <td className="mono">{Number(row.temperature).toFixed(1)}°C</td>
                    <td className="mono">{Number(row.humidity)}%</td>
                    <td className="mono">{row.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted db-empty">
              No records saved yet. Fetch a forecast, then click “Save Current”.
            </p>
          )}
        </div>
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

function toObservationPayload(weather) {
  const recordedAt = weather?.recordedAt ? new Date(weather.recordedAt).toISOString() : new Date().toISOString()
  const coords = weather?.raw?.coords

  return {
    city: String(weather?.city || '').trim(),
    latitude: coords?.lat,
    longitude: coords?.lon,
    temperature: Number(weather?.temperature),
    humidity: Number(weather?.humidity),
    windSpeed: Number(weather?.windSpeed),
    pressure: Math.round(Number(weather?.pressure)),
    weatherCode: Number.isFinite(Number(weather?.weatherCode)) ? Number(weather?.weatherCode) : undefined,
    description: String(weather?.description || ''),
    recordedAt,
    source: String(weather?.raw?.source || 'ui'),
  }
}

function toObservationPayloadFromTest(testData) {
  const recordedAt = new Date().toISOString()

  return {
    city: String(testData?.city || '').trim(),
    temperature: Number(testData?.temperature),
    humidity: Number(testData?.humidity),
    windSpeed: Number(testData?.windSpeed),
    pressure: Math.round(Number(testData?.pressure)),
    description: String(testData?.description || ''),
    recordedAt,
    source: String(testData?.source || 'ui-test'),
  }
}

function formatCoord(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  return num.toFixed(4)
}

function formatGeoError(err) {
  const code = err?.code
  if (code === 1) return 'Location permission denied. Allow location access in your browser settings and try again.'
  if (code === 2) return 'Location unavailable. Check GPS/network, then retry.'
  if (code === 3) return 'Location request timed out. Try again.'
  return err?.message || 'Failed to get your location.'
}

function toOpenMeteoWeather(payload, coords) {
  const label = coords
    ? `Coords ${formatCoord(coords.lat)}, ${formatCoord(coords.lon)}`
    : 'Current Location'

  return {
    city: label,
    temperature: Number(payload?.temperature),
    description: 'Current conditions — Open-Meteo',
    humidity: Number(payload?.humidity),
    windSpeed: Number(payload?.windSpeed),
    pressure: Math.round(Number(payload?.pressure)),
    weatherCode: Number.isFinite(Number(payload?.weatherCode)) ? Number(payload?.weatherCode) : null,
    recordedAt: payload?.recordedAt || new Date().toISOString(),
    raw: {
      source: 'open-meteo',
      coords,
      payload: payload?.raw ?? payload,
    },
  }
}

export default App
