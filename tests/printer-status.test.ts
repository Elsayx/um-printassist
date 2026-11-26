import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  freshPrinterStatus,
  parsePrinterStatus,
  resolveStatusEndpoint,
} from '../src/printers/status'

const now = Date.UTC(2026, 10, 26, 7, 0)
const id = 'e6-g111i-quota'
const time = (offset: number) => new Date(now + offset).toISOString()
const good = { id, pending: 0, availability: 'available', observedAt: time(0) }

test('an explicit zero and unknown values remain independent from hardware state', () => {
  const second = {
    id: 'e2-1f-macau',
    pending: null,
    availability: 'unavailable',
    observedAt: time(-400),
  }
  const third = {
    id: 'e6-2093',
    pending: 3,
    availability: 'unknown',
    observedAt: time(-30),
  }
  const readings = parsePrinterStatus({ readings: [good, second, third] }, now)
  assert.equal(readings.size, 3)
  assert.deepEqual(readings.get(id), {
    pending: 0,
    availability: 'available',
    observedAt: now,
  })
  assert.equal(readings.get(second.id)?.pending, null)
  assert.equal(readings.get(third.id)?.availability, 'unknown')
})

test('malformed records and an unknown station never create an apparent zero or availability', () => {
  for (const payload of [null, [], { readings: {} }, { readings: null }]) {
    assert.equal(parsePrinterStatus(payload, now).size, 0)
  }
  const malformed = [
    null,
    [],
    {},
    { ...good, id: 'fictional' },
    { ...good, pending: -1 },
    { ...good, pending: 0.4 },
    { ...good, pending: '2' },
    { ...good, pending: undefined },
    { ...good, availability: null },
    { ...good, availability: 'online' },
    { ...good, observedAt: 0 },
    { ...good, observedAt: '01/01/2026' },
    { ...good, observedAt: '2026-11-26T07:00:00' },
  ]
  assert.equal(parsePrinterStatus({ readings: malformed }, now).size, 0)
})

test('future and expired observations are excluded; valid duplicate IDs keep the newest time', () => {
  assert.equal(
    parsePrinterStatus({ readings: [{ ...good, observedAt: time(1) }] }, now)
      .size,
    0,
  )
  const age = 900_000
  const earliest = { ...good, observedAt: time(-age) }
  const atBoundary = parsePrinterStatus({ readings: [earliest] }, now)
  assert.equal(atBoundary.size, 1)
  assert.equal(freshPrinterStatus(atBoundary, now + 1).size, 0)
  assert.equal(parsePrinterStatus({ readings: [earliest] }, now + 1).size, 0)
  const latest = parsePrinterStatus(
    { readings: [good, { ...earliest, pending: 12 }] },
    now,
  )
  assert.equal(latest.get(id)?.pending, 0)
})

test('the unconfigured feed stays off; configured URLs use public HTTP(S) without credentials', () => {
  const base = 'https://example.org/demo/'
  for (const invalid of [
    undefined,
    ' ',
    'file:///tmp/private',
    'https://alice:password@example.org',
    'https://',
  ]) {
    assert.equal(resolveStatusEndpoint(invalid, base), undefined)
  }
  assert.equal(resolveStatusEndpoint('status.json', base), base + 'status.json')
})
