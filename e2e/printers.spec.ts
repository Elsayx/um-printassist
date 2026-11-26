import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function enterFinder(page: Page) {
  await page.goto('./')
  await page.getByRole('link', { name: 'Find printers', exact: true }).click()
  await expect(page).toHaveURL(/#printers$/)
  await expect(
    page.getByRole('heading', { name: 'Find a printer', exact: true }),
  ).toBeVisible()
}

async function openFilters(page: Page) {
  const select = page.getByRole('combobox', { name: 'Payment method' })
  if (!(await select.isVisible()))
    await page.getByRole('button', { name: /^Filters/ }).click()
}

test('the printer finder shares navigation with the print workspace and preserves the draft', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('./')
  await page
    .getByRole('combobox', { name: 'Paper size' })
    .selectOption('Letter')
  await page.getByRole('link', { name: 'Find printers', exact: true }).click()
  const search = page.getByRole('searchbox', { name: 'Search printers' })
  await search.fill('g111i')
  await page.getByRole('button', { name: 'Locations', exact: true }).click()
  await expect(
    page
      .getByRole('button', { name: /E6.*Central Teaching.*location/i })
      .first(),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Workspace', exact: true })
    .click()
  await expect(page.getByRole('combobox', { name: 'Paper size' })).toHaveValue(
    'Letter',
  )
})

test('search and payment or service filters combine, including an empty result that can be cleared', async ({
  page,
}) => {
  await enterFinder(page)
  const search = page.getByRole('searchbox', { name: 'Search printers' })
  await search.fill('library')
  await openFilters(page)
  const payment = page.getByRole('combobox', { name: 'Payment method' })
  await payment.selectOption('macaupass')
  const e2 = page
    .getByRole('button', { name: /E2.*library.*location/i })
    .first()
  await expect(e2).toBeVisible()
  const hours = page.getByRole('combobox', { name: 'Service hours' })
  await hours.selectOption('24h')
  await expect(e2).toHaveCount(0)
  await search.fill('nonexistent room xyz')
  await page
    .getByRole('button', { name: 'Clear filters', exact: true })
    .last()
    .click()
  await expect(search).toHaveValue('')
  await expect(payment).toHaveValue('all')
  await expect(hours).toHaveValue('all')
  await expect(e2).toBeVisible()
})

test('campus information stays separate from simulated student queues', async ({
  page,
}) => {
  await enterFinder(page)
  const mode = page.getByRole('combobox', { name: 'Queue data' })
  const total = page.getByRole('textbox', { name: 'Total simulated students' })
  await expect(mode).toHaveValue('actual')
  await expect(total).toHaveCount(0)
  await mode.selectOption('demo')
  await total.fill('0')
  await page.getByRole('button', { name: 'Apply total' }).click()
  const locations = page.getByRole('region', {
    name: 'Matching printer locations',
  })
  await locations.getByRole('button').first().click()
  await expect(locations.getByText(/^0\s*·\s*simulated$/i)).toBeVisible()
  await mode.selectOption('actual')
  await expect(
    locations.getByText('Live count unavailable', { exact: true }),
  ).toBeVisible()
  await expect(total).toHaveCount(0)
})

test('the printer finder and station details pass automated accessibility checks', async ({
  page,
}) => {
  await page.goto('./#printers/E2')
  await expect(
    page.getByRole('heading', { name: /Wu Yee Sun Library/ }),
  ).toBeVisible()
  const accessibility = await new AxeBuilder({ page })
    .include('.pb-page')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(
    accessibility.violations.map((violation) => [
      violation.id,
      violation.nodes.map((node) => node.target),
    ]),
  ).toEqual([])
})

test('building selection opens room, hours, payment, queue and sources for the matching station', async ({
  page,
}) => {
  await enterFinder(page)
  const search = page.getByRole('searchbox', { name: 'Search printers' })
  await search.fill('4016')
  const locations = page.getByRole('region', {
    name: 'Matching printer locations',
  })
  await locations
    .getByRole('button', { name: /^E2.*library.*location/i })
    .click()
  await expect(
    locations.getByRole('heading', { level: 2, name: /library/i }),
  ).toBeVisible()
  await expect(
    locations.getByRole('button', { name: /4016/i }),
  ).toHaveAttribute('aria-expanded', 'true')
  await expect(
    locations.getByText('Live count unavailable', { exact: true }),
  ).toBeVisible()
  await expect(locations.getByText('Payment', { exact: true })).toBeVisible()
  await expect(
    locations.getByText('Service availability', { exact: true }),
  ).toBeVisible()
  await expect(
    locations.getByText('Support hours', { exact: true }),
  ).toBeVisible()
  await expect(locations.getByText(/08:00/).first()).toBeVisible()
  const sourceLinks = locations.getByRole('link')
  expect(await sourceLinks.count()).toBeGreaterThan(0)
  for (const link of await sourceLinks.all()) {
    const address = await link.getAttribute('href')
    expect(new URL(address!).hostname).toMatch(/(^|\.)um\.edu\.mo$/)
  }
  await page.getByRole('button', { name: 'All locations' }).click()
  await expect(
    locations.getByRole('heading', { name: 'Printer locations' }),
  ).toBeVisible()
  await expect(search).toHaveValue('4016')
})

test('keyboard map controls, search and filtering keep markers and station lists in sync', async ({
  page,
}) => {
  await enterFinder(page)
  const map = page.getByRole('region', { name: 'Campus heatmap' })
  const surface = map.getByRole('group', {
    name: /Campus map\. Use arrow keys/,
  })
  await surface.focus()
  await page.keyboard.press('=')
  await expect(map.getByRole('button', { name: 'Zoom out' })).toBeEnabled()
  await page.keyboard.press('Home')
  await expect(map.getByRole('button', { name: 'Zoom out' })).toBeDisabled()
  const heat = map.getByRole('button', { name: 'Heat layer' })
  await heat.focus()
  await page.keyboard.press('Space')
  await expect(heat).toHaveAttribute('aria-pressed', 'false')
  const search = page.getByRole('searchbox', { name: 'Search printers' })
  await search.focus()
  await page.keyboard.type('2093')
  const e6 = map.getByRole('button', { name: /^E6,.*1 matching listing$/ })
  await expect(e6).toBeVisible()
  await expect(map.getByRole('button', { name: /^E2,/ })).toHaveCount(0)
  await e6.focus()
  await page.keyboard.press('Enter')
  await expect(
    page.getByRole('heading', {
      name: 'Central Teaching Building',
      exact: true,
    }),
  ).toBeFocused()
  await expect(e6).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: /2093/ })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await page.getByRole('button', { name: 'All locations', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(
    page.getByRole('heading', { name: 'Printer locations', exact: true }),
  ).toBeFocused()
})
