import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { Layers3, Maximize, Minus, Plus } from 'lucide-react'
import './map.css'

export interface CampusBuilding {
  building: string
  buildingName: string
  lat: number
  lng: number
  count: number
  students?: number
}

interface MapProps {
  groups: CampusBuilding[]
  simulated?: boolean
  selected: string | null
  onSelect: (building: string) => void
}

interface Point {
  x: number
  y: number
}
interface Size {
  width: number
  height: number
}
interface Marker extends Point {
  group: CampusBuilding
  value: number
  anchor: Point
  width: number
}
const EXTENT = { left: -810, right: 1120, top: -1220, bottom: 1200 }
const WORLD_W = EXTENT.right - EXTENT.left
const WORLD_H = EXTENT.bottom - EXTENT.top
const IMAGE_URL = import.meta.env.BASE_URL + 'maps/campus.svg'
const ZOOM_STEPS = [1, 1.5, 2.25, 3.4, 5]
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n))
function project(lat: number, lng: number): Point {
  return { x: (lng - 113.544) * 103150, y: (22.129 - lat) * 110720 }
}

function mapValue(group: CampusBuilding, simulated: boolean) {
  return simulated ? (group.students ?? 0) : group.count
}

// Map anchors stay at their geographic position. Nearby labels may move to
// either side of the anchor and are joined back to it with a leader line.
function layoutMarkers(
  groups: CampusBuilding[],
  position: (p: Point) => Point,
  size: Size,
  selected: string | null,
  simulated: boolean,
) {
  const placed: Marker[] = []
  const ordered = [...groups].sort((a, b) => b.lat - a.lat || a.lng - b.lng)
  for (const group of ordered) {
    const anchor = position(project(group.lat, group.lng))
    if (
      anchor.x < -5 ||
      anchor.x > size.width + 5 ||
      anchor.y < -5 ||
      anchor.y > size.height + 5
    )
      continue
    const value = mapValue(group, simulated)
    const width = Math.max(
      58,
      26 + (group.building.length + String(value).length) * 7.5,
    )
    const gaps = [
      0,
      -width * 0.55,
      width * 0.55,
      -width * 1.12,
      width * 1.12,
      -width * 1.8,
      width * 1.8,
    ]
    let best: Marker | undefined
    let bestCost = Infinity
    for (const dy of [0, -25, 25, -48, 48, -70, 70]) {
      for (const dx of gaps) {
        const x = clamp(
          anchor.x + dx,
          width / 2 + 5,
          size.width - width / 2 - 5,
        )
        const y = clamp(anchor.y + dy, 24, size.height - 33)
        let cost = Math.hypot(x - anchor.x, (y - anchor.y) * 2.8)
        if (y < 60 && (x < 37 + width / 2 || x > size.width - 140 - width / 2))
          cost += 800
        for (const other of placed) {
          const overlapX = (other.width + width) / 2 + 5 - Math.abs(other.x - x)
          const overlapY = 43 - Math.abs(other.y - y)
          if (overlapX > 0 && overlapY > 0) cost += 400 + overlapX * overlapY
        }
        if (cost < bestCost) {
          bestCost = cost
          best = { x, y, group, value, anchor, width }
        }
      }
    }
    if (best) placed.push(best)
  }
  return placed.sort(
    (a, b) =>
      Number(a.group.building === selected) -
      Number(b.group.building === selected),
  )
}

// Compute a sum of fixed-radius kernels in physical space. Changing zoom only
// scales the finished raster; it cannot change a building's density category.
function drawHeat(
  canvas: HTMLCanvasElement,
  groups: CampusBuilding[],
  simulated: boolean,
) {
  const sampleM = 3.5
  const width = Math.ceil(WORLD_W / sampleM)
  const height = Math.ceil(WORLD_H / sampleM)
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const field = new Float32Array(width * height)
  const sigma = 50 / sampleM
  const radius = 3 * sigma
  for (const group of groups) {
    const weight = mapValue(group, simulated)
    if (weight === 0) continue
    const point = project(group.lat, group.lng)
    const cx = ((point.x - EXTENT.left) / WORLD_W) * width
    const cy = ((point.y - EXTENT.top) / WORLD_H) * height
    for (
      let y = Math.max(0, Math.floor(cy - radius));
      y <= Math.min(height - 1, Math.ceil(cy + radius));
      y++
    ) {
      for (
        let x = Math.max(0, Math.floor(cx - radius));
        x <= Math.min(width - 1, Math.ceil(cx + radius));
        x++
      ) {
        const d2 = (x - cx) ** 2 + (y - cy) ** 2
        if (d2 <= radius * radius)
          field[y * width + x] +=
            weight * Math.exp(-d2 / (2 * sigma * sigma))
      }
    }
  }
  const image = ctx.createImageData(width, height)
  const colors = [
    [58, 171, 155],
    [119, 195, 137],
    [241, 206, 88],
    [245, 146, 62],
    [211, 78, 44],
  ]
  const maxStudentIntensity = Math.log1p(100)
  for (let i = 0; i < field.length; i++) {
    if (field[i] < 0.012) continue
    const t = simulated
      ? Math.min(1, Math.log1p(field[i]) / maxStudentIntensity)
      : 1 - Math.exp(-field[i] / 2.6)
    const step = t * (colors.length - 1)
    const lo = Math.floor(step)
    const hi = Math.min(colors.length - 1, lo + 1)
    for (let c = 0; c < 3; c++)
      image.data[i * 4 + c] =
        colors[lo][c] + (colors[hi][c] - colors[lo][c]) * (step - lo)
    image.data[i * 4 + 3] = 190 * Math.pow(t, 0.55)
  }
  ctx.putImageData(image, 0, 0)
}

const places = [
  {
    name: 'Shizimen Waterway',
    lat: 22.1295,
    lng: 113.5487,
    rotation: -84,
    water: true,
  },
  { name: 'University Avenue', lat: 22.1302, lng: 113.54672, rotation: -86 },
  { name: 'Alumni Avenue', lat: 22.1301, lng: 113.54227, rotation: -84 },
  { name: 'Scholar Street', lat: 22.12489, lng: 113.5446, rotation: -4 },
  { name: 'Library Street North', lat: 22.13069, lng: 113.54535, rotation: 0 },
]

export default function CampusMap({
  groups,
  selected,
  onSelect,
  simulated = false,
}: MapProps) {
  const surface = useRef<HTMLDivElement>(null)
  const density = useRef<HTMLCanvasElement>(null)
  const titleId = useId()
  const [size, setSize] = useState<Size>({ width: 640, height: 500 })
  const [zoom, setZoom] = useState(0)
  const [center, setCenter] = useState<Point | null>(null)
  const [heat, setHeat] = useState(true)
  const drag = useRef<{ id: number; start: Point; center: Point } | null>(null)
  // Fixed opening frame gives filtered and unfiltered results the same spatial context.
  const topLeft = project(22.13236, 113.54135)
  const bottomRight = project(22.12428, 113.54525)
  const home = {
    x: (topLeft.x + bottomRight.x) / 2,
    y: (topLeft.y + bottomRight.y) / 2,
  }
  const scale =
    Math.max(
      0.1,
      Math.min(
        (size.width - 88) / (bottomRight.x - topLeft.x),
        (size.height - 90) / (bottomRight.y - topLeft.y),
      ),
    ) * ZOOM_STEPS[zoom]
  function bounded(p: Point): Point {
    const halfW = Math.min(WORLD_W / 2, size.width / (scale * 2))
    const halfH = Math.min(WORLD_H / 2, size.height / (scale * 2))
    return {
      x: clamp(p.x, EXTENT.left + halfW, EXTENT.right - halfW),
      y: clamp(p.y, EXTENT.top + halfH, EXTENT.bottom - halfH),
    }
  }
  const camera = bounded(center || home)
  const position = (p: Point) => ({
    x: (p.x - camera.x) * scale + size.width / 2,
    y: (p.y - camera.y) * scale + size.height / 2,
  })
  const markers = layoutMarkers(groups, position, size, selected, simulated)
  const markerUnit = simulated ? 'simulated student' : 'matching listing'
  const origin = position({ x: EXTENT.left, y: EXTENT.top })
  const world = {
    left: origin.x,
    top: origin.y,
    width: WORLD_W * scale,
    height: WORLD_H * scale,
  }
  const selectedPoint = groups.find((g) => g.building === selected)
  const selectedKey = selectedPoint?.building
  useLayoutEffect(() => {
    if (!surface.current) return
    const target = surface.current
    const read = () => {
      const b = target.getBoundingClientRect()
      if (b.width > 0 && b.height > 0)
        setSize({ width: b.width, height: b.height })
    }
    read()
    const observer = new ResizeObserver(read)
    observer.observe(target)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (density.current) drawHeat(density.current, groups, simulated)
  }, [groups, simulated])
  useEffect(() => {
    if (!selectedPoint) return
    const point = project(selectedPoint.lat, selectedPoint.lng)
    const screen = position(point)
    if (
      screen.x < 30 ||
      screen.x > size.width - 30 ||
      screen.y < 48 ||
      screen.y > size.height - 42
    )
      setCenter(point)
  }, [selectedKey])
  function reset() {
    setCenter(null)
    setZoom(0)
  }
  function move(e: KeyboardEvent<HTMLDivElement>) {
    if (e.target !== surface.current) return
    const moves: Record<string, Point> = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
    }
    if (moves[e.key]) {
      e.preventDefault()
      const d = moves[e.key]
      setCenter(
        bounded({
          x: camera.x + (d.x * 85) / scale,
          y: camera.y + (d.y * 85) / scale,
        }),
      )
    } else if (e.key === 'Home') {
      e.preventDefault()
      reset()
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault()
      setZoom((z) => Math.min(ZOOM_STEPS.length - 1, z + 1))
    } else if (e.key === '-') {
      e.preventDefault()
      setZoom((z) => Math.max(0, z - 1))
    }
  }
  function startDrag(e: PointerEvent<HTMLDivElement>) {
    if (
      !e.isPrimary ||
      e.button !== 0 ||
      (e.target as Element).closest('button,a') ||
      (e.pointerType === 'touch' && zoom === 0)
    )
      return
    drag.current = {
      id: e.pointerId,
      start: { x: e.clientX, y: e.clientY },
      center: camera,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function pan(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    setCenter(
      bounded({
        x: d.center.x - (e.clientX - d.start.x) / scale,
        y: d.center.y - (e.clientY - d.start.y) / scale,
      }),
    )
  }
  function endDrag(e: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id !== e.pointerId) return
    drag.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId)
  }
  const scaleMetres = [200, 100, 50, 25, 10].find((n) => n * scale <= 78) ?? 10
  return (
    <section className="cm-map" aria-labelledby={titleId}>
      <header className="cm-header">
        <div>
          <h2 id={titleId}>Campus heatmap</h2>
          <p>
            {simulated
              ? 'Simulated students at matching printers, by building'
              : 'Matching printer listings by building'}
          </p>
        </div>
        <button
          className="cm-layer"
          type="button"
          aria-pressed={heat}
          onClick={() => setHeat((value) => !value)}
        >
          <Layers3 size={16} aria-hidden="true" />
          Heat layer
        </button>
      </header>
      <div
        className={'cm-stage' + (zoom ? ' cm-zoomed' : '')}
        ref={surface}
        tabIndex={0}
        role="group"
        aria-label="Campus map. Use arrow keys to pan, plus or minus to zoom, and Home to reset."
        onKeyDown={move}
        onPointerDown={startDrag}
        onPointerMove={pan}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={() => {
          drag.current = null
        }}
      >
        <img
          className="cm-base"
          style={world}
          src={IMAGE_URL}
          alt=""
          draggable={false}
        />
        <canvas
          ref={density}
          className="cm-heat"
          style={{ ...world, visibility: heat ? 'visible' : 'hidden' }}
          aria-hidden="true"
        />
        <svg
          className="cm-leaders"
          width="100%"
          height="100%"
          viewBox={`0 0 ${size.width} ${size.height}`}
          aria-hidden="true"
        >
          {places.map((p) => {
            const xy = position(project(p.lat, p.lng))
            if (
              markers.some(
                (m) => Math.abs(m.x - xy.x) < 60 && Math.abs(m.y - xy.y) < 19,
              )
            )
              return null
            return (
              <text
                key={p.name}
                className={p.water ? 'cm-water-text' : 'cm-road-text'}
                x={xy.x}
                y={xy.y}
                textAnchor="middle"
                transform={`rotate(${p.rotation} ${xy.x} ${xy.y})`}
              >
                {p.name}
              </text>
            )
          })}
          {markers.map(
            (m) =>
              Math.hypot(m.anchor.x - m.x, m.anchor.y - m.y) > 12 && (
                <g key={m.group.building}>
                  <line x1={m.anchor.x} y1={m.anchor.y} x2={m.x} y2={m.y} />
                  <circle cx={m.anchor.x} cy={m.anchor.y} r="3" />
                </g>
              ),
          )}
        </svg>
        {markers.map((m) => (
          <button
            type="button"
            key={m.group.building}
            className="cm-marker"
            aria-pressed={m.group.building === selected}
            style={{ left: m.x, top: m.y, width: m.width }}
            title={m.group.buildingName}
            onClick={() => onSelect(m.group.building)}
            aria-label={`${m.group.building}, ${m.group.buildingName}, ${m.value} ${markerUnit}${m.value === 1 ? '' : 's'}`}
          >
            <span className="cm-pin">
              <strong>{m.group.building}</strong>
              <span>{m.value}</span>
            </span>
          </button>
        ))}
        <div className="cm-north" aria-label="North is up">
          <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden="true">
            <path d="M5 1 9 15 5 11 1 15Z" />
          </svg>
          N
        </div>
        <div className="cm-tools" role="group" aria-label="Map controls">
          <button
            type="button"
            aria-label="Zoom in"
            title="Zoom in"
            disabled={zoom === ZOOM_STEPS.length - 1}
            onClick={() =>
              setZoom((z) => Math.min(z + 1, ZOOM_STEPS.length - 1))
            }
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            title="Zoom out"
            disabled={zoom === 0}
            onClick={() => setZoom((z) => Math.max(z - 1, 0))}
          >
            <Minus size={18} />
          </button>
          <button
            type="button"
            aria-label="Reset map view"
            title="Reset map view"
            onClick={reset}
          >
            <Maximize size={16} />
          </button>
        </div>
        <div className="cm-scale" aria-hidden="true">
          <span style={{ width: scaleMetres * scale }} />
          {scaleMetres} m
        </div>
        <a
          className="cm-attribution"
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          © OpenStreetMap contributors
        </a>
      </div>
      <div className="cm-key">
        <strong>{simulated ? 'Student density' : 'Listing density'}</strong>
        {simulated && <span>1</span>}
        <span className="cm-ramp" aria-hidden="true" />
        <span>{simulated ? '100 students' : 'Low to high'}</span>
        {simulated && <span>0 = no heat</span>}
        {!heat && <small>Layer hidden</small>}
      </div>
    </section>
  )
}
