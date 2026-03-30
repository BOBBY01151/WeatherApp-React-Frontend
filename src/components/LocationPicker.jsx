import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

// Fix missing marker icons when bundling with Vite.
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

function RecenterMap({ position }) {
  const map = useMap()

  useEffect(() => {
    map.setView([position.lat, position.lon], map.getZoom(), { animate: true })
  }, [map, position.lat, position.lon])

  return null
}

function PickOnClick({ onPick }) {
  useMapEvents({
    click(event) {
      if (!onPick) return
      onPick({ lat: event.latlng.lat, lon: event.latlng.lng })
    },
  })
  return null
}

export default function LocationPicker({
  value,
  onChange,
  zoom = 12,
  className = '',
}) {
  const position = value ?? { lat: 6.9271, lon: 79.8612 }

  return (
    <div className={className}>
      <MapContainer
        center={[position.lat, position.lon]}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          // More reliable public tiles than the default OSM tile server for small demo apps.
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
        />
        <PickOnClick onPick={onChange} />
        <RecenterMap position={position} />
        <Marker
          position={[position.lat, position.lon]}
          draggable
          eventHandlers={{
            dragend: (event) => {
              if (!onChange) return
              const next = event.target.getLatLng()
              onChange({ lat: next.lat, lon: next.lng })
            },
          }}
        />
      </MapContainer>
    </div>
  )
}
