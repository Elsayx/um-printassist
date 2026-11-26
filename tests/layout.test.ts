import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  bindingSide,
  computeLayout,
  contentSize,
  defaultSettings,
  imposeSide,
  selectPages,
  supportedNup,
  type Settings,
} from '../src/print/layout.ts'

const target: Settings = {
  ...defaultSettings,
  paper: 'A4',
  orientation: 'portrait',
  duplex: 'long',
  color: 'grayscale',
  nup: 4,
}

test('the 12-page R2 fixture has 3 printed sides across 2 physical sheets, with a blank back', () => {
  const l = computeLayout(target, 12)
  assert.equal(l.error, null)
  assert.deepEqual(l.sheets, [
    { front: [1, 2, 3, 4], back: [5, 6, 7, 8] },
    { front: [9, 10, 11, 12], back: [null, null, null, null] },
  ])
  assert.deepEqual(
    [l.printedSides, l.sheetsPerCopy, l.blankBacks, l.totalSheets],
    [3, 2, 1, 2],
  )
  assert.equal(l.bindingEdge, 'left')
  assert.deepEqual([l.sheetWidthMm, l.sheetHeightMm], [210, 297])
})

test('copies have independent sheet boundaries and no extra sheet for a blank back', () => {
  const l = computeLayout({ ...target, copies: 3 }, 12)
  assert.deepEqual(
    [l.printedSides, l.sheetsPerCopy, l.totalPrintedSides, l.totalSheets],
    [3, 2, 9, 6],
  )
  assert.equal(computeLayout({ ...target, copies: 3 }, 1).totalSheets, 3)
})

test('selection accepts all pages or current page; custom ranges sort and de-duplicate', () => {
  assert.deepEqual(selectPages(target, 3).pages, [1, 2, 3])
  assert.deepEqual(
    selectPages({ ...target, rangeMode: 'current', currentPage: 3 }, 5).pages,
    [3],
  )
  assert.deepEqual(
    selectPages(
      { ...target, rangeMode: 'custom', range: ' 8, 3–5, 1-3, 3 ' },
      8,
    ).pages,
    [1, 2, 3, 4, 5, 8],
  )
  assert.deepEqual(
    selectPages({ ...target, rangeMode: 'custom', range: '4' }, 4).pages,
    [4],
  )
})

test('invalid ranges and copy counts never silently fall back to a printable job', () => {
  for (const range of [
    '',
    '-2',
    '3-1',
    '1,2,',
    '1 3',
    '0',
    '1-6',
    '1.2',
    '2,,3',
    '4-0',
  ]) {
    const l = computeLayout({ ...target, rangeMode: 'custom', range }, 5)
    assert.ok(l.error, range)
    assert.equal(l.totalSheets, 0)
    assert.deepEqual(l.sheets, [])
  }
  for (const copies of [0, 1.5, 100, NaN]) {
    const l = computeLayout({ ...target, copies }, 5)
    assert.ok(l.error)
    assert.equal(l.totalSheets, 0)
  }
  assert.ok(
    computeLayout({ ...target, currentPage: 100, rangeMode: 'current' }, 5)
      .error,
  )
  assert.ok(computeLayout(target, 0).error)
})

test('2×3 grid order follows the selected reading direction, including a partial side', () => {
  const pages = [1, 2, 3, 4, 5]
  assert.deepEqual(imposeSide(pages, 2, 3, 'horizontal'), [1, 2, 3, 4, 5, null])
  assert.deepEqual(imposeSide(pages, 2, 3, 'horizontal-reverse'), [
    2,
    1,
    4,
    3,
    null,
    5,
  ])
  assert.deepEqual(imposeSide(pages, 2, 3, 'vertical'), [1, 4, 2, 5, 3, null])
  assert.deepEqual(imposeSide(pages, 2, 3, 'vertical-reverse'), [
    4,
    1,
    5,
    2,
    null,
    3,
  ])
})

test('every selected page occupies exactly one cell for all grids, directions, sides and orientations', () => {
  const orientations: Settings['orientation'][] = ['portrait', 'landscape']
  const directions: Settings['order'][] = [
    'horizontal',
    'horizontal-reverse',
    'vertical',
    'vertical-reverse',
  ]
  const sidedness: Settings['duplex'][] = ['simplex', 'short', 'long']
  const expected = [2, 5, 6, 7, 9, 12, 13, 14, 15, 16, 17]
  for (const nup of supportedNup)
    for (const orientation of orientations) {
      for (const order of directions)
        for (const duplex of sidedness) {
          const l = computeLayout(
            {
              ...target,
              nup,
              orientation,
              order,
              duplex,
              rangeMode: 'custom',
              range: '12-17,2,5-7,9',
            },
            22,
          )
          assert.equal(l.cols * l.rows, nup)
          assert.ok(
            orientation === 'portrait' ? l.cols <= l.rows : l.cols >= l.rows,
          )
          const sides = l.sheets.flatMap((sheet) =>
            sheet.back ? [sheet.front, sheet.back] : [sheet.front],
          )
          const occupied = sides
            .flat()
            .filter((cell): cell is number => cell !== null)
          assert.deepEqual(
            occupied.sort((a, b) => a - b),
            expected,
          )
          assert.equal(
            l.printedSides,
            sides.filter((side) => side.some((p) => p !== null)).length,
          )
          assert.equal(
            l.sheetsPerCopy,
            Math.ceil(expected.length / (nup * (duplex === 'simplex' ? 1 : 2))),
          )
          assert.ok(sides.every((side) => side.length === nup))
          assert.ok(
            l.sheets.every(
              (sheet) => (sheet.back === null) === (duplex === 'simplex'),
            ),
          )
        }
    }
})

test('binding markers follow physical sheet orientation and upright back-view convention', () => {
  const cases = [
    ['portrait', 'long', 'left', 'right'],
    ['portrait', 'short', 'top', 'bottom'],
    ['landscape', 'long', 'top', 'bottom'],
    ['landscape', 'short', 'left', 'right'],
    ['landscape', 'simplex', null, null],
  ] as const
  for (const [orientation, duplex, front, back] of cases) {
    const l = computeLayout({ ...target, orientation, duplex }, 1)
    assert.equal(bindingSide(l.bindingEdge, 'front'), front)
    assert.equal(bindingSide(l.bindingEdge, 'back'), back)
  }
})

test('paper dimensions, simulated margin, crop and fit preserve source proportions', () => {
  for (const [paper, dims] of [
    ['A3', [420, 297]],
    ['A4', [297, 210]],
    ['Letter', [279.4, 215.9]],
  ] as const) {
    const l = computeLayout({ ...target, paper, orientation: 'landscape' }, 3)
    assert.deepEqual([l.sheetWidthMm, l.sheetHeightMm], dims)
  }
  const l = computeLayout(target, 3)
  const page = { widthMm: 260, heightMm: 120 }
  const fit = contentSize(page, l, 'fit')
  const actual = contentSize(page, l, 'actual')
  const cellWidth = (210 - 12) / 2
  const cellHeight = (297 - 12) / 2
  for (const size of [fit, actual]) {
    assert.ok(
      Math.abs(
        (size.widthPercent * cellWidth) / (size.heightPercent * cellHeight) -
          260 / 120,
      ) < 0.00001,
    )
  }
  assert.equal(fit.crops, false)
  assert.equal(fit.reduced, true)
  assert.ok(fit.widthPercent <= 100 && fit.heightPercent <= 100)
  assert.equal(actual.crops, true)
  assert.ok(actual.widthPercent > 100)
})
