import { useEffect, useState } from 'react'
import { sites } from './directory'

export interface StationReading {
  pending: number | null
  availability: 'available' | 'unavailable' | 'unknown'
  observedAt: number
}

type Readings = ReadonlyMap<string, StationReading>
const maxAgeMs = 15 * 60_000
const pollMs = 60_000
const validIds = new Set(sites.map((site) => site.id))
const empty: Readings = new Map()
const timestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFresh(observedAt: number, now: number): boolean {
  return observedAt <= now && now - observedAt <= maxAgeMs
}

export function parsePrinterStatus(
  payload: unknown,
  now = Date.now(),
): Readings {
  if (!isObject(payload) || !Array.isArray(payload.readings)) return empty
  const byId = new Map<string, StationReading>()
  for (const entry of payload.readings) {
    if (!isObject(entry)) continue
    const { id, pending, availability, observedAt } = entry
    if (typeof id !== 'string' || !validIds.has(id)) continue
    if (
      pending !== null &&
      (typeof pending !== 'number' ||
        !Number.isSafeInteger(pending) ||
        pending < 0)
    )
      continue
    if (
      availability !== 'available' &&
      availability !== 'unavailable' &&
      availability !== 'unknown'
    )
      continue
    if (typeof observedAt !== 'string' || !timestampPattern.test(observedAt))
      continue
    // Date.parse normalizes impossible dates (e.g. February 30) on some engines.
    const datePart = observedAt.slice(0, 10)
    const midnight = Date.parse(datePart + 'T00:00:00Z')
    if (
      !Number.isFinite(midnight) ||
      new Date(midnight).toISOString().slice(0, 10) !== datePart
    )
      continue
    const time = Date.parse(observedAt)
    if (!Number.isFinite(time) || !isFresh(time, now)) continue
    const prior = byId.get(id)
    if (!prior || prior.observedAt < time)
      byId.set(id, { pending, availability, observedAt: time })
  }
  return byId
}

export function freshPrinterStatus(
  readings: Readings,
  now = Date.now(),
): Readings {
  if ([...readings.values()].every((r) => isFresh(r.observedAt, now)))
    return readings
  return new Map([...readings].filter(([, r]) => isFresh(r.observedAt, now)))
}

export function resolveStatusEndpoint(
  value: string | undefined,
  base: string,
): string | undefined {
  if (!value?.trim()) return undefined
  try {
    const url = new URL(value.trim(), base)
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return undefined
    return url.href
  } catch {
    return undefined
  }
}

export function usePrinterStatus(): { byId: Readings; enabled: boolean } {
  const endpoint = resolveStatusEndpoint(
    import.meta.env.VITE_PRINTER_STATUS_URL,
    document.baseURI,
  )
  const [byId, setById] = useState<Readings>(empty)

  useEffect(() => {
    const url = endpoint
    if (!url) return
    let active = true
    let inFlight: AbortController | undefined
    const poll = async () => {
      if (inFlight) return
      const controller = new AbortController()
      inFlight = controller
      const timeout = window.setTimeout(() => controller.abort(), 12_000)
      try {
        // The public read-only endpoint receives no document, job, credentials, or station selection.
        const response = await fetch(url, {
          signal: controller.signal,
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          cache: 'no-store',
        })
        if (response.ok) {
          const payload: unknown = await response.json()
          if (active) setById(parsePrinterStatus(payload))
        }
      } catch {
        // A previously received observation remains usable only up to its original expiry.
      } finally {
        window.clearTimeout(timeout)
        inFlight = undefined
      }
    }
    void poll()
    const interval = window.setInterval(poll, pollMs)
    const resume = () => {
      if (document.visibilityState === 'visible') {
        setById((current) => freshPrinterStatus(current))
        void poll()
      }
    }
    document.addEventListener('visibilitychange', resume)
    return () => {
      active = false
      inFlight?.abort()
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', resume)
    }
  }, [endpoint])

  // Expire a reading when its own timestamp ages out, even between polls or after a network failure.
  useEffect(() => {
    if (!byId.size) return
    const earliest = Math.min(...[...byId.values()].map((r) => r.observedAt))
    const delay = Math.max(0, earliest + maxAgeMs + 1 - Date.now())
    const timer = window.setTimeout(
      () => setById((current) => freshPrinterStatus(current)),
      delay,
    )
    return () => window.clearTimeout(timer)
  }, [byId])
  return { byId: endpoint ? byId : empty, enabled: Boolean(endpoint) }
}
