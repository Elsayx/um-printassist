import test from 'node:test'
import assert from 'node:assert/strict'
import { sites } from '../src/printers/directory'
import {
  groupSites,
  initialFilters,
  matchSites,
  parseQueueLength,
} from '../src/printers/browse'

test('rooms, exact building codes and conventional floor names resolve to the same public listings', () => {
  const run = (query: string) =>
    matchSites(sites, { ...initialFilters, query }).map((s) => s.id)
  assert.deepEqual(run('E6-G111i'), run('E6 ground floor'))
  assert.deepEqual(run('E2 4th floor'), run('library 4/F'))
  assert.ok(run('E2').every((id) => id.startsWith('e2-')))
  assert.ok(run('E6 floor 2').includes('e6-2093'))
})

test('queue brackets work only in demo mode and each bracket has a discoverable example', () => {
  const all = sites.length
  let total = 0
  for (const length of ['empty', 'short', 'busy'] as const) {
    const examples = matchSites(sites, {
      ...initialFilters,
      queue: 'demo',
      length,
    })
    assert.ok(examples.length > 0)
    total += examples.length
    assert.equal(matchSites(sites, { ...initialFilters, length }).length, all)
  }
  assert.equal(total, all)
})

test('counts for known devices and building coordinates stay consistent as filters change', () => {
  const library = groupSites(sites).find((g) => g.building === 'E2')!
  const room = groupSites(
    matchSites(sites, { ...initialFilters, query: '4016' }),
    sites,
  )[0]
  assert.equal(library.devices, 9)
  assert.equal(room.devices, 1)
  assert.equal(library.lat, room.lat)
  assert.equal(library.lng, room.lng)
  assert.deepEqual(groupSites([]), [])
})

test('exact queue lengths include 0 and 100, with separate sources for demo and reported counts', () => {
  const [target, other, unknown] = sites
  const sample = [target, other, unknown]
  for (let n = 0; n <= 100; n++) {
    const counts = new Map([
      [target.id, n],
      [other.id, (n + 1) % 101],
      [unknown.id, (n + 2) % 101],
    ])
    const readings = new Map([
      [other.id, { pending: n }],
      [unknown.id, { pending: null }],
    ])
    const exact = {
      ...initialFilters,
      length: 'exact' as const,
      exact: String(n),
    }
    assert.equal(parseQueueLength(exact.exact), n)
    assert.deepEqual(
      matchSites(sample, { ...exact, queue: 'demo' }, readings, counts),
      [target],
    )
    assert.deepEqual(matchSites(sample, exact, readings, counts), [other])
  }
  for (const invalid of ['', ' ', '-1', '101', '2.6', '1e2', '12x']) {
    assert.equal(parseQueueLength(invalid), null)
  }
})
