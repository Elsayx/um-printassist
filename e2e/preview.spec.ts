import { expect, test } from '@playwright/test'

// The dimension checks inspect the rendered paper and visible thumbnails,
// independently of the layout engine's reported sheet count.
test('mixed-size PDF retains source geometry, and duplex preview follows the selected sheet', async ({
  page,
}) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Change file' }).click()
  await page.getByRole('button', { name: /Mixed paper sizes/ }).click()
  const mobilePanel = async (name: 'Print preview' | 'Print settings') => {
    const button = page.getByRole('button', { name, exact: true })
    if (await button.isVisible()) await button.click()
  }
  const preview = page.getByRole('region', {
    name: 'Print preview',
    exact: true,
  })
  await expect(
    page.getByRole('heading', { name: 'mixed_sizes.pdf' }),
  ).toBeVisible()
  await mobilePanel('Print preview')
  await preview.getByRole('button', { name: 'Original', exact: true }).click()
  const paper = preview.locator('.pv-paper')
  const ratio = () =>
    paper.evaluate((el) => {
      const rect = el.getBoundingClientRect()
      return rect.width / rect.height
    })
  await expect.poll(ratio).toBeCloseTo(210 / 297, 2)
  await preview.getByRole('button', { name: 'Next page' }).click()
  await expect.poll(ratio).toBeCloseTo(420 / 297, 2)
  await expect(
    preview.getByRole('img', { name: 'Original page 2 of mixed_sizes.pdf' }),
  ).toBeVisible()

  await preview
    .getByRole('button', { name: 'Physical sheet', exact: true })
    .click()
  await mobilePanel('Print settings')
  await page.getByLabel('Paper size').selectOption('A4')
  await page.getByRole('radio', { name: 'Portrait', exact: true }).check()
  await page.getByLabel('Print sides').selectOption('long')
  await mobilePanel('Print preview')
  await expect.poll(ratio).toBeCloseTo(210 / 297, 2)
  await preview.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(
    preview.getByRole('img', { name: 'Document page 2' }),
  ).toBeVisible()
  const thumb = preview.locator('[data-source-page="2"] img')
  await expect
    .poll(() =>
      thumb.evaluate((el: HTMLImageElement) => {
        const { width, height } = el.getBoundingClientRect()
        return Math.abs(width / height - el.naturalWidth / el.naturalHeight)
      }),
    )
    .toBeLessThan(0.01)
  await expect(preview.locator('.pv-binding-right')).toBeVisible()
  await preview.getByRole('button', { name: 'Next sheet' }).click()
  await expect(preview.getByText('Blank back', { exact: true })).toBeVisible()

  await mobilePanel('Print settings')
  await page.getByRole('radio', { name: '4', exact: true }).check()
  await mobilePanel('Print preview')
  await expect(
    preview.getByRole('button', { name: 'Previous sheet' }),
  ).toBeDisabled()
  await preview.getByRole('button', { name: 'Front', exact: true }).click()
  await expect(preview.locator('[data-source-page]')).toHaveCount(3)
  await mobilePanel('Print settings')
  await page.getByLabel('Scaling').selectOption('actual')
  await mobilePanel('Print preview')
  await expect(preview.getByText(/will be cropped/)).toBeVisible()
  await expect(preview.locator('.pv-paper')).toBeVisible()
})
