import type { PrinterSite } from './directory'

export interface BrowseFilters {
  query: string
  method: 'all' | PrinterSite['method']
  hours: 'all' | PrinterSite['serviceScope']
  queue: 'actual' | 'demo'
}

export const initialFilters: BrowseFilters = {
  query: '',
  method: 'all',
  hours: 'all',
  queue: 'actual',
}
export const paymentNames = {
  quota: 'Printing quota',
  macaupass: 'Macau Pass',
  unknown: 'Payment unlisted',
}
const order = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

export function parseStudentTotal(text: string): number | null {
  const digits = text.trim()
  if (!/^\d+$/.test(digits)) return null
  const count = Number(digits)
  return count <= 100 ? count : null
}

// Each simulated student contributes one job. One ticket per known device
// (or one per listing when inventory is unlisted) weights the assignment.
export function distributeStudents(
  directory: PrinterSite[],
  total: number,
): Map<string, number> {
  if (!Number.isInteger(total) || total < 0 || total > 100) {
    throw new RangeError(
      'The campus total must be a whole number from 0 to 100.',
    )
  }
  const counts = new Map(directory.map((site) => [site.id, 0]))
  if (total === 0) return counts

  const tickets = directory
    .flatMap((site) => Array<string>(site.units ?? 1).fill(site.id))
    .sort()
  if (!tickets.length)
    throw new RangeError('Assigning students requires a printer location.')

  // Restart the same pseudo-random sequence for each scenario. Increasing
  // the total adds students without moving those already in a queue.
  let seed = 20261126
  const modulus = 2147483647
  for (let student = 0; student < total; student++) {
    seed = (seed * 48271) % modulus
    const index = Math.floor((seed / modulus) * tickets.length)
    const id = tickets[index]
    counts.set(id, counts.get(id)! + 1)
  }
  return counts
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

export function matchSites(sites: PrinterSite[], filters: BrowseFilters) {
  const words = normalize(filters.query).split(/\s+/).filter(Boolean)
  const codes = new Set(sites.map((site) => site.building.toLowerCase()))
  return sites.filter((site) => {
    if (filters.method !== 'all' && site.method !== filters.method) return false
    if (filters.hours !== 'all' && site.serviceScope !== filters.hours)
      return false
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
