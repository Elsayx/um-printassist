import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function ready(page: Page) {
  await page.goto('./')
  await expect(
    page.getByRole('heading', { name: 'lecture_handout_12p.pdf' }),
  ).toBeVisible()
}
async function setRadio(page: Page, name: string) {
  // Clicking the native label exercises the same hit target as a participant.
  await page.getByRole('radio', { name, exact: true }).locator('..').click()
}
for (const width of [360, 844, 1440]) {
  test(
    'configure, inspect both sides, review and submit at ' + width + 'px',
    async ({ page }) => {
      await page.setViewportSize({ width, height: 850 })
      await ready(page)
      await page.getByLabel('Paper size').selectOption('A4')
      await setRadio(page, 'Portrait')
      await setRadio(page, 'Black & white')
      await page.getByLabel('Print sides').selectOption('long')
      await setRadio(page, '4')
      if (width <= 720)
        await page.getByRole('button', { name: 'See preview' }).click()
      const grid = page.getByTestId('sheet-grid')
      const pages = () =>
        grid
          .locator('[data-source-page]')
          .evaluateAll((nodes) =>
            nodes.map((n) => Number(n.getAttribute('data-source-page'))),
          )
      expect(await pages()).toEqual([1, 2, 3, 4])
      await page.getByRole('button', { name: 'Back', exact: true }).click()
      expect(await pages()).toEqual([5, 6, 7, 8])
      await page.getByRole('button', { name: 'Next sheet' }).click()
      await expect(grid.locator('[data-slot=blank]')).toHaveCount(4)
      await expect(page.getByText('Blank back', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Front', exact: true }).click()
      expect(await pages()).toEqual([9, 10, 11, 12])
      await page
        .getByRole('button', { name: 'Review job', exact: true })
        .click()
      const modal = page.getByRole('dialog')
      await expect(
        modal.getByText('2 physical sheets', { exact: true }),
      ).toBeVisible()
      await expect(
        modal.getByText('2 sheets and 3 printed sides per copy'),
      ).toBeVisible()
      await expect(modal.getByText(/actual printer margins/i)).toBeVisible()
      await modal.getByRole('button', { name: 'Submit simulated job' }).click()
      await expect(
        page.getByRole('heading', { name: 'Confirmed received' }),
      ).toBeVisible()
      await expect(page.getByText('DEMO-1043', { exact: true })).toBeVisible()
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
      expect(overflow).toBe(false)
    },
  )
}
test('interrupted job remains unconfirmed through recheck and reload; reset restores fixtures', async ({
  page,
}) => {
  await ready(page)
  await page.getByRole('link', { name: 'Print jobs', exact: true }).click()
  await page
    .getByRole('button', { name: /lecture_notes.pdf.*DEMO-1042/ })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Unconfirmed', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Check again' }).click()
  await expect(page.getByText(/still unconfirmed/i)).toBeVisible()
  await page.getByRole('button', { name: 'What should I do next?' }).click()
  await expect(
    page.getByRole('link', { name: /ICTO printing guide/ }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: /retry|release|submit/i }),
  ).toHaveCount(0)
  await page.reload()
  await expect(page.getByText(/still unconfirmed/i)).toBeVisible()
  await page.getByRole('button', { name: 'Study controls' }).click()
  await page.getByRole('button', { name: 'Reset scenario' }).click()
  await expect(page.getByLabel('Paper size')).toHaveValue('A3')
  await page.getByRole('link', { name: 'Print jobs', exact: true }).click()
  await page
    .getByRole('button', { name: /lecture_notes.pdf.*DEMO-1042/ })
    .click()
  await expect(page.getByText(/still unconfirmed/i)).toHaveCount(0)
})
test('invalid settings block review and recover without losing other settings', async ({
  page,
}) => {
  await ready(page)
  await page
    .getByRole('combobox', { name: 'Print pages', exact: true })
    .selectOption('custom')
  await page.getByLabel('Page range', { exact: true }).fill('1–13')
  await expect(
    page.getByRole('button', { name: 'Review job', exact: true }),
  ).toBeDisabled()
  await page.getByLabel('Page range', { exact: true }).fill('1-3,3,1')
  await page.getByLabel('Copies', { exact: true }).fill('0')
  await expect(
    page.getByRole('button', { name: 'Review job', exact: true }),
  ).toBeDisabled()
  await page.getByLabel('Copies', { exact: true }).fill('2')
  await page.getByRole('button', { name: 'Review job', exact: true }).click()
  await expect(
    page.getByRole('dialog').getByText('6 physical sheets', { exact: true }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', { name: 'Review job', exact: true }),
  ).toBeFocused()
})
test('workspace, review and recovery pass automated WCAG A/AA checks', async ({
  page,
}) => {
  await ready(page)
  const audit = async () => {
    const a = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(
      a.violations.map((v) => [v.id, v.nodes.map((n) => n.target)]),
    ).toEqual([])
  }
  await audit()
  await page.getByRole('button', { name: 'Review job', exact: true }).click()
  await audit()
  await page.keyboard.press('Escape')
  await page.getByRole('link', { name: 'Print jobs', exact: true }).click()
  await page
    .getByRole('button', { name: /lecture_notes.pdf.*DEMO-1042/ })
    .click()
  await page.getByRole('button', { name: 'What should I do next?' }).click()
  await audit()
})
