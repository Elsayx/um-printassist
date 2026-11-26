import type { PrinterSite } from './directory'

export interface BrowseFilters {
  query: string
  method: 'all' | PrinterSite['method']
  hours: 'all' | PrinterSite['serviceScope']
  queue: 'actual' | 'demo'
  length: 'all' | 'empty' | 'short' | 'busy' | 'exact'
  exact: string
}

export const initialFilters: BrowseFilters = {
  query: '',
  method: 'all',
  hours: 'all',
  queue: 'actual',
  length: 'all',
  exact: '',
}
export const paymentNames = {
  quota: 'Printing quota',
  macaupass: 'Macau Pass',
  unknown: 'Payment unlisted',
}
const order = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

export function parseQueueLength(text: string): number | null {
  const digits = text.trim()
  if (!/^\d+$/.test(digits)) return null
  const count = Number(digits)
  return count <= 100 ? count : null
}

/** A participant may replace the seeded count for this simulated station. */
export function demoPending(
  id: string,
  overrides?: ReadonlyMap<string, number>,
) {
  const edited = overrides?.get(id)
  if (edited !== undefined) return edited
  let seed = 7
  for (const character of id)
    seed = (Math.imul(seed, 31) + character.charCodeAt(0)) >>> 0
  return seed % 10
}

const floors = ['ground', 'first', 'second', 'third', 'fourth']
const floorWords: Record<string, number> = Object.fromEntries(
  floors.map((name, i) => [name, i]),
)

function normalize(value: string) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(
      /\b(ground|first|second|third|fourth)\s+floor\b/g,
      (_, word) => ' storey' + floorWords[word] + ' ',
    )
    .replace(
      /\b(g|[0-9])\s*\/?\s*f\b/g,
      (_, n) => ' storey' + (n === 'g' ? '0' : n) + ' ',
    )
    .replace(
      /\b(?:floor|level)\s+(\d+)\b|\b(\d+)(?:st|nd|rd|th)\s+floor\b/g,
      (_, a, b) => ' storey' + (a ?? b) + ' ',
    )
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

export function matchSites(
  sites: PrinterSite[],
  filters: BrowseFilters,
  readings?: ReadonlyMap<string, { pending: number | null }>,
  demoCounts?: ReadonlyMap<string, number>,
) {
  const words = normalize(filters.query).split(/\s+/).filter(Boolean)
  const exact = parseQueueLength(filters.exact)
  const applyLength =
    filters.length !== 'all' && (filters.length !== 'exact' || exact !== null)
  const codes = new Set(sites.map((site) => site.building.toLowerCase()))
  return sites.filter((site) => {
    if (filters.method !== 'all' && site.method !== filters.method) return false
    if (filters.hours !== 'all' && site.serviceScope !== filters.hours)
      return false
    if (applyLength && (filters.queue === 'demo' || readings)) {
      const jobs =
        filters.queue === 'demo'
          ? demoPending(site.id, demoCounts)
          : readings?.get(site.id)?.pending
      if (jobs == null) return false
      if (filters.length === 'exact' && jobs !== exact) return false
      if (filters.length === 'empty' && jobs !== 0) return false
      if (filters.length === 'short' && (jobs < 1 || jobs > 3)) return false
      if (filters.length === 'busy' && jobs < 4) return false
    }
    const search = normalize(
      [
        site.building,
        site.buildingName,
        ...(site.aliases ?? []),
        site.location,
        paymentNames[site.method],
        site.method === 'quota'
          ? 'Follow-You'
          : site.method === 'macaupass'
            ? 'MacauPass Macao Pass'
            : '',
      ].join(' '),
    )
    const compact = search.replaceAll(' ', '')
    return words.every((word) =>
      codes.has(word)
        ? site.building.toLowerCase() === word
        : search.includes(word) || compact.includes(word),
    )
  })
}
export function groupSites(sites: PrinterSite[], directory = sites) {
  // Keep each building anchored at the same point when filters remove an indoor location.
  function anchor(building: string) {
    const points = directory.filter((site) => site.building === building)
    return {
      lat: points.reduce((sum, site) => sum + site.lat, 0) / points.length,
      lng: points.reduce((sum, site) => sum + site.lng, 0) / points.length,
    }
  }
  const groups = new Map<string, PrinterSite[]>()
  for (const site of sites) {
    const existing = groups.get(site.building)
    if (existing) existing.push(site)
    else groups.set(site.building, [site])
  }
  return [...groups]
    .sort(([a], [b]) => order.compare(a, b))
    .map(([building, entries]) => ({
      building,
      buildingName: entries[0].buildingName,
      ...anchor(building),
      devices: entries.every((e) => e.units !== undefined)
        ? entries.reduce((sum, e) => sum + (e.units ?? 0), 0)
        : null,
      count: entries.length,
      entries,
    }))
}
