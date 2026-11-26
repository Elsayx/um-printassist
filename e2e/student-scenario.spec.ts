import { expect, test, type Page } from '@playwright/test'

const studentSuffix = /, (\d+) simulated students?$/

const totalInput = (page: Page) =>
  page.getByRole('textbox', { name: 'Total simulated students' })
const queueMode = (page: Page) =>
  page.getByRole('combobox', { name: 'Queue data' })
const summary = (page: Page) =>
  page.getByRole('status').filter({ hasText: 'campus-wide' })
const markers = (page: Page) =>
  page
    .getByRole('region', { name: 'Campus heatmap' })
    .getByRole('button', { name: studentSuffix })

async function markerCounts(page: Page) {
  const labels = await markers(page).evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute('aria-label')!),
  )
  return Object.fromEntries(
    labels.map((label) => [
      label.split(',')[0],
      Number(studentSuffix.exec(label)![1]),
    ]),
  ) as Record<string, number>
}

async function simulate(page: Page) {
  await page.goto('./#printers')
  await queueMode(page).selectOption('demo')
}

async function applyTotal(page: Page, total: number) {
  await totalInput(page).fill(String(total))
  await page.getByRole('button', { name: 'Apply total' }).click()
  await expect(summary(page)).toContainText(
    total + (total === 1 ? ' student' : ' students') + ' campus-wide',
  )
  await expect(markers(page).first()).toBeVisible()
  await expect
    .poll(async () => {
      const counts = Object.values(await markerCounts(page))
      return counts.reduce((sum, count) => sum + count, 0)
    })
    .toBe(total)
}

test('the map and room queues conserve the campus total, including both endpoints', async ({
  page,
}) => {
  await simulate(page)
  for (const total of [0, 1, 37, 100]) {
    await applyTotal(page, total)
    await expect(markers(page).nth(1)).toBeVisible()
  }

  const all = await markerCounts(page)
  await markers(page).filter({ hasText: 'E6' }).click()
  const locations = page.getByRole('region', {
    name: 'Matching printer locations',
  })
  const roomHeadings = locations.getByRole('heading', { level: 3 })
  await expect(roomHeadings.filter({ hasText: '2093' })).toBeVisible()
  const roomHeaders = await roomHeadings.allTextContents()
  const roomsTotal = roomHeaders.reduce((total, room) => {
    const pending = /(\d+) pending/.exec(room)
    expect(pending).toBeTruthy()
    return total + Number(pending![1])
  }, 0)
  expect(roomsTotal).toBe(all.E6)

  const search = page.getByRole('searchbox', { name: 'Search printers' })
  await search.fill('E6')
  await expect.poll(() => markerCounts(page)).toEqual({ E6: all.E6 })
  await expect(summary(page)).toContainText(
    all.E6 + ' student' + (all.E6 === 1 ? '' : 's') + ' in matching listings',
  )
  const room = roomHeaders.find((header) => header.includes('2093'))!
  const pending = Number(/(\d+) pending/.exec(room)![1])
  await search.fill('2093')
  await expect.poll(() => markerCounts(page)).toEqual({ E6: pending })
  await expect(
    locations.getByText(pending + ' · simulated', { exact: true }),
  ).toBeVisible()

  await search.fill('zzzzzz')
  await expect(markers(page)).toHaveCount(0)
  await expect(summary(page)).toContainText('100 students campus-wide')
  await expect(summary(page)).toContainText('0 students in matching listings')
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await expect.poll(() => markerCounts(page)).toEqual(all)
  await expect(totalInput(page)).toHaveValue('100')
})

test('editing an invalid total leaves the current scenario intact', async ({
  page,
}) => {
  await simulate(page)
  await applyTotal(page, 37)
  const input = totalInput(page)
  const applied = await markerCounts(page)
  for (const invalid of ['', '-1', '101', '1.5', '1e2']) {
    await input.fill(invalid)
    await input.press('Enter')
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByRole('alert')).toHaveText(
      'Enter a whole number from 0 to 100.',
    )
    await expect(summary(page)).toContainText('37 students campus-wide')
    await expect.poll(() => markerCounts(page)).toEqual(applied)
  }
  await input.fill('4')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(summary(page)).toContainText('37 students campus-wide')
  await input.press('Enter')
  await expect(summary(page)).toContainText('4 students campus-wide')
})

test('the total is accessible with mobile filters closed and survives a switch to campus information', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await simulate(page)
  await expect(page.getByRole('button', { name: /^Filters/ })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  await expect(totalInput(page)).toBeVisible()
  await applyTotal(page, 100)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  const before = await markerCounts(page)
  await queueMode(page).selectOption('actual')
  await expect(totalInput(page)).toHaveCount(0)
  await expect(markers(page)).toHaveCount(0)
  await queueMode(page).selectOption('demo')
  await expect(totalInput(page)).toHaveValue('100')
  await expect.poll(() => markerCounts(page)).toEqual(before)
})
