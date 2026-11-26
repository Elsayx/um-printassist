import { expect, test } from '@playwright/test'

test('a student can set a demo printer queue to integers from 0 through 100, cancel an edit, and switch back to campus information', async ({
  page,
}) => {
  await page.goto('./#printers/E2')
  const mode = page.getByRole('combobox', { name: 'Queue data' })
  const edit = page.getByRole('button', { name: 'Edit demo count' })
  await expect(edit).toHaveCount(0)
  await mode.selectOption('demo')
  const pending = page
    .locator('.pb-detail dl > div')
    .filter({ has: page.getByText('Pending jobs', { exact: true }) })
    .locator('dd')
    .first()
  const input = page.getByRole('textbox', { name: 'Pending jobs (0–100)' })
  const save = page.getByRole('button', { name: 'Save count' })

  await edit.click()
  await expect(input).toBeFocused()
  for (const invalid of ['-1', '101', '9.5', '', '1e2']) {
    await input.fill(invalid)
    await save.click()
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByRole('alert')).toContainText(
      'whole number from 0 to 100',
    )
  }
  for (const valid of [0, 100, 53]) {
    await input.fill(String(valid))
    await input.press('Enter')
    await expect(pending).toContainText(
      new RegExp('^' + valid + '\\s*·\\s*simulated'),
    )
    await expect(edit).toBeFocused()
    await edit.click()
    await expect(input).toHaveValue(String(valid))
  }
  await input.fill('95')
  await input.press('Escape')
  await expect(pending).toContainText(/^53\s*·\s*simulated/)
  await expect(edit).toBeFocused()
  await mode.selectOption('actual')
  await expect(edit).toHaveCount(0)
  await expect(pending).toHaveText('Live count unavailable')
  await mode.selectOption('demo')
  await expect(pending).toContainText(/^53\s*·\s*simulated/)
})

test('the exact filter uses edited demo counts and accepts and rejects the boundaries', async ({
  page,
}) => {
  await page.goto('./#printers/E6')
  const mode = page.getByRole('combobox', { name: 'Queue data' })
  await mode.selectOption('demo')
  await page.getByRole('button', { name: 'Edit demo count' }).click()
  await page.getByRole('textbox', { name: 'Pending jobs (0–100)' }).fill('100')
  await page.getByRole('button', { name: 'Save count' }).click()
  await page
    .getByRole('combobox', { name: 'Demo queue length' })
    .selectOption('exact')
  const exact = page.getByRole('textbox', { name: 'Exact count (0–100)' })
  await exact.fill('100')
  await expect(
    page.getByText('1 listing in 1 building', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('100 · simulated', { exact: true })).toBeVisible()
  await exact.fill('101')
  await expect(exact).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#exact-pending-error')).toBeVisible()
  await exact.fill('0')
  await expect(exact).toHaveAttribute('aria-invalid', 'false')
  await expect(page.locator('#exact-pending-error')).toHaveCount(0)
  await expect(page.getByText('0 · simulated', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(exact).toHaveCount(0)
  await expect(mode).toHaveValue('actual')
})
