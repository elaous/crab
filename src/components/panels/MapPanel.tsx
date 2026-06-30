import { useState } from 'react'
import { useSceneStore } from '../../store/sceneStore'
import { v4 as uuidv4 } from 'uuid'
import type { SceneObject } from '../../types'

// Converts lat/lon/zoom to OSM tile coordinates
function latLonToTile(lat: number, lon: number, zoom: number) {
  const n = Math.pow(2, zoom)
  const x = Math.floor((lon + 180) / 360 * n)
  const latRad = lat * Math.PI / 180
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n)
  return { x, y, z: zoom }
}

async function fetchTileAsDataUrl(x: number, y: number, z: number): Promise<string> {
  // Use OSM tile CDN
  const s = ['a', 'b', 'c'][Math.floor(Math.random() * 3)]
  const url = `https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OSM tile fetch failed: ${res.status}`)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

// Metres per OSM tile at given zoom
function tileSizeMetres(lat: number, zoom: number): number {
  const earthCircum = 40075016.686
  return earthCircum * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom)
}

export function MapPanel() {
  const importObjects = useSceneStore(s => s.importObjects)
  const [lat, setLat] = useState(51.505)
  const [lon, setLon] = useState(-0.09)
  const [zoom, setZoom] = useState(16)
  const [size, setSize] = useState(3)   // tile grid (size × size)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  const handleImport = async () => {
    setLoading(true)
    setStatus('Fetching tiles…')
    try {
      const center = latLonToTile(lat, lon, zoom)
      const half = Math.floor(size / 2)
      const tileM = tileSizeMetres(lat, zoom)
      const objects: SceneObject[] = []

      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const tx = center.x + dx
          const ty = center.y + dy
          setStatus(`Tile ${dx + half + 1}/${size} · ${dy + half + 1}/${size}`)
          const dataUrl = await fetchTileAsDataUrl(tx, ty, zoom)
          objects.push({
            id: uuidv4(),
            name: `Map ${tx}/${ty}/${zoom}`,
            type: 'box',
            layerId: 'default',
            visible: true,
            locked: true,
            color: '#888888',
            opacity: 1,
            roughness: 1,
            metalness: 0,
            textureDataUrl: dataUrl,
            uvScale: { x: 1, y: 1, z: 1 },
            position: { x: dx * tileM, y: 0, z: dy * tileM },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            dimensions: { width: tileM, height: 0.01, depth: tileM },
            metadata: { notes: `OSM tile ${tx}/${ty} z${zoom}` },
          })
        }
      }

      importObjects(objects)
      setStatus(`Imported ${objects.length} tile${objects.length !== 1 ? 's' : ''}`)
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header">Map Import</div>
      <div className="p-2 space-y-2 overflow-y-auto">
        <p className="text-xs text-slate-500">
          Import OpenStreetMap tiles as textured floor planes at real-world scale.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-slate-500 mb-0.5">Latitude</div>
            <input type="number" step="0.001" className="prop-input w-full text-xs"
              value={lat} onChange={e => setLat(parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-0.5">Longitude</div>
            <input type="number" step="0.001" className="prop-input w-full text-xs"
              value={lon} onChange={e => setLon(parseFloat(e.target.value) || 0)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-slate-500 mb-0.5">Zoom (14–18)</div>
            <input type="number" min={14} max={18} className="prop-input w-full text-xs"
              value={zoom} onChange={e => setZoom(Math.min(18, Math.max(14, parseInt(e.target.value) || 16)))} />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-0.5">Grid ({size}×{size} tiles)</div>
            <input type="number" min={1} max={5} className="prop-input w-full text-xs"
              value={size} onChange={e => setSize(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))} />
          </div>
        </div>
        <div className="text-xs text-slate-600">
          Tile size ≈ {tileSizeMetres(lat, zoom).toFixed(0)} m · {size}×{size} = {(tileSizeMetres(lat, zoom) * size).toFixed(0)} m total
        </div>
        <button
          className={`w-full text-xs py-1.5 rounded transition-colors ${
            loading ? 'bg-blue-800 text-blue-300 cursor-wait' : 'bg-blue-700 text-white hover:bg-blue-600'
          }`}
          onClick={() => void handleImport()}
          disabled={loading}
        >
          {loading ? 'Importing…' : 'Import Map Tiles'}
        </button>
        {status && (
          <div className="text-xs text-slate-400 text-center">{status}</div>
        )}
        <div className="text-xs text-slate-700 border-t border-slate-800 pt-2">
          Map data © OpenStreetMap contributors. Tiles used under ODbL.
        </div>
      </div>
    </div>
  )
}
