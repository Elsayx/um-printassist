import test from 'node:test'
import assert from 'node:assert/strict'
import { sites } from '../src/printers/directory'
import { groupSites, initialFilters, matchSites } from '../src/printers/browse'

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
