import { expect, test } from '@playwright/test'

test('map heat follows filters, supports keyboard navigation and works on a narrow screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 830 })
  await page.goto('./#printers')
  const map = page.getByRole('region', { name: 'Campus heatmap' })
  await expect(map).toBeVisible()
  const marker = (building: string) =>
    map.getByRole('button', { name: new RegExp('^' + building + ', ') })
  await expect(marker('E6')).toBeVisible()
  await expect(marker('S9')).toBeVisible()
  const canvas = map.locator('canvas')
  const initialHeat = await canvas.evaluate((el) => el.toDataURL())
  const layer = map.getByRole('button', { name: 'Heat layer' })
  await layer.click()
  await expect(layer).toHaveAttribute('aria-pressed', 'false')
  await expect(canvas).toBeHidden()
  await layer.click()
  await expect(canvas).toBeVisible()
  const surface = map.getByRole('group', { name: /^Campus map/ })
  const reset = map.getByRole('button', { name: 'Reset map view' })
  const zoomOut = map.getByRole('button', { name: 'Zoom out' })
  await expect(zoomOut).toBeDisabled()
  const original = await map.locator('.cm-base').getAttribute('style')
  await surface.focus()
  await page.keyboard.press('+')
  await expect(zoomOut).toBeEnabled()
  await page.keyboard.press('ArrowRight')
  await expect(map.locator('.cm-base')).not.toHaveAttribute('style', original!)
  await reset.click()
  await expect(map.locator('.cm-base')).toHaveAttribute('style', original!)
  const search = page.getByRole('searchbox', { name: 'Search printers' })
  await search.fill('4016')
  await expect(marker('E2')).toHaveAccessibleName(/1 matching listing$/)
  await expect(marker('S9')).toHaveCount(0)
  await expect
    .poll(() => canvas.evaluate((el) => el.toDataURL()))
    .not.toBe(initialHeat)
  await marker('E2').click()
  await expect(page).toHaveURL(/printers\/E2/i)
})

test('map badges and heat follow the simulated campus total', async ({ page }) => {
  await page.goto('./#printers')
  const map = page.getByRole('region', { name: 'Campus heatmap' })
  const mode = page.getByRole('combobox', { name: 'Queue data' })
  await mode.selectOption('demo')
  const pins = map.locator('.cm-marker')
  const input = page.getByRole('textbox', { name: 'Total simulated students' })
  const canvas = map.locator('canvas')
  const heat = () => canvas.evaluate(el => {
    const pixels = el.getContext('2d')!.getImageData(0, 0, el.width, el.height).data
    let opacity = 0
    for (let i = 3; i < pixels.length; i += 4) opacity += pixels[i]
    return opacity
  })
  const badges = () => map.locator('.cm-pin > span').evaluateAll(
    els => els.reduce((sum, el) => sum + Number(el.textContent), 0),
  )
  await expect(map.getByText('Student density')).toBeVisible()
  let previousHeat = 0
  for (const total of [0, 1, 100]) {
    await input.fill(String(total))
    await input.press('Enter')
    await expect.poll(badges).toBe(total)
    if (total === 0) {
      await expect(pins.first()).toHaveAccessibleName(/0 simulated students$/)
      await expect.poll(heat).toBe(0)
    } else {
      await expect.poll(heat).toBeGreaterThan(previousHeat)
      previousHeat = await heat()
    }
  }
  const e6 = map.getByRole('button', { name: /^E6, / })
  const unfiltered = await e6.getAttribute('aria-label')
  await page.getByRole('searchbox', { name: 'Search printers' }).fill('E6')
  await expect(pins).toHaveCount(1)
  await expect(e6).toHaveAttribute('aria-label', unfiltered!)
  await mode.selectOption('actual')
  await expect(e6).toHaveAccessibleName(/matching listings?$/)
  await expect(map.getByText('Listing density')).toBeVisible()
})
