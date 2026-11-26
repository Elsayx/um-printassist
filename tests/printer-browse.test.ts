import test from 'node:test'
import assert from 'node:assert/strict'
import { sites } from '../src/printers/directory'
import {
  groupSites,
  initialFilters,
  matchSites,
  distributeStudents,
  parseStudentTotal,
} from '../src/printers/browse'

test('rooms, exact building codes and conventional floor names resolve to the same public listings', () => {
  const run = (query: string) =>
    matchSites(sites, { ...initialFilters, query }).map((s) => s.id)
  assert.deepEqual(run('E6-G111i'), run('E6 ground floor'))
  assert.deepEqual(run('E2 4th floor'), run('library 4/F'))
  assert.ok(run('E2').every((id) => id.startsWith('e2-')))
  assert.ok(run('E6 floor 2').includes('e6-2093'))
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

test('all 101 campus totals allocate one job per student and adding a student never moves an existing job', () => {
  let previous = distributeStudents(sites, 0)
  assert.equal(previous.size, sites.length)
  for (let total = 0; total <= 100; total++) {
    const counts = distributeStudents(sites, total)
    assert.equal(parseStudentTotal(String(total)), total)
    assert.equal(
      [...counts.values()].reduce((sum, count) => sum + count, 0),
      total,
    )
    for (const site of sites) {
      const count = counts.get(site.id)!
      assert.ok(Number.isInteger(count) && count >= 0)
      assert.ok(count >= previous.get(site.id)!)
    }
    assert.deepEqual(distributeStudents([...sites].reverse(), total), counts)
    previous = counts
  }
  for (const invalid of ['', ' ', '-1', '101', '2.6', '1e2', '12x']) {
    assert.equal(parseStudentTotal(invalid), null)
  }
  for (const invalid of [-1, 101, 0.1, Infinity, NaN]) {
    assert.throws(() => distributeStudents(sites, invalid), RangeError)
  }
})

test('both data modes keep the same locations; location filters select a subset of the campus allocation', () => {
  const counts = distributeStudents(sites, 83)
  const filters = { ...initialFilters, query: 'library' }
  const matches = matchSites(sites, filters)
  assert.deepEqual(matches, matchSites(sites, { ...filters, queue: 'demo' }))
  assert.ok(matches.length > 0 && matches.length < sites.length)
  const visible = matches.reduce((sum, site) => sum + counts.get(site.id)!, 0)
  const hidden = sites
    .filter((site) => !matches.includes(site))
    .reduce((sum, site) => sum + counts.get(site.id)!, 0)
  assert.equal(visible + hidden, 83)
  assert.ok(visible > 0 && hidden > 0)
})

test('known device capacity weights an assignment while an unknown capacity still receives students', () => {
  const large = { ...sites[0], id: 'large', units: 8 }
  const uncounted = { ...sites[1], id: 'unknown', units: undefined }
  const counts = distributeStudents([large, uncounted], 100)
  assert.ok(counts.get(uncounted.id)! > 0)
  assert.ok(counts.get(large.id)! > counts.get(uncounted.id)!)
  assert.equal(distributeStudents([uncounted], 100).get(uncounted.id), 100)
  assert.equal(distributeStudents([], 0).size, 0)
  assert.throws(() => distributeStudents([], 1), RangeError)
})
