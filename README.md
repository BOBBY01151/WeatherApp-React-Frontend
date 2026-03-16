# Weather frontend (React + Vite)

Lightweight UI that calls the Spring Boot weather microservice and shows the raw JSON for debugging.

## Quick start
- `cd WeatherApp-React--Frontend-`
- `npm install`
- Copy `.env.example` to `.env.local` if you need a different backend host/port.
- `npm run dev -- --host`
- Open the URL shown (default http://localhost:5173).

## API wiring
- Default call: `GET /api/weather?city=<city>` with CORS handled by Vite’s proxy.
- Health check: `GET /actuator/health`.
- Dev proxy forwards `/api` and `/actuator` to `http://localhost:8084` unless you override.
- If you prefer absolute URLs from the browser, set `VITE_API_BASE_URL` in `.env.local`.

## Environment variables
- `VITE_API_BASE_URL` — absolute base URL for the API (skip the trailing slash). Leave blank to use the proxy.
- `VITE_API_PROXY_TARGET` — backend address for the dev proxy (defaults to `http://localhost:8084`).

## Notes
- The UI falls back to sample data if the backend is unreachable so you can design without the API up.
- Source entry: `src/App.jsx`, proxy config: `vite.config.js`.
