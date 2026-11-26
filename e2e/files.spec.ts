import { expect, test, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const fixture = (name: string) =>
  fileURLToPath(new URL('./fixtures/' + name, import.meta.url))
const sample = (name: string) =>
  fileURLToPath(new URL('../public/samples/' + name, import.meta.url))

async function chooseFile(page: Page) {
  await page.getByRole('button', { name: 'Change file' }).click()
  return page.getByRole('dialog', { name: 'Choose a document' })
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await expect(
    page.getByRole('heading', { name: 'lecture_handout_12p.pdf' }),
  ).toBeVisible()
})

test('sample slides, uploaded PDF, JPEG and PNG show distinct source previews', async ({
  page,
}) => {
  const preview = page.getByRole('region', { name: 'Print preview' })
  const picker = await chooseFile(page)
  await picker.getByRole('button', { name: /Lecture slides/ }).click()
  await expect(
    page.getByRole('heading', { name: 'slides_16x9.pdf' }),
  ).toBeVisible()
  await expect(page.getByText(/4 source pages/)).toBeVisible()
  await preview.getByRole('button', { name: 'Original', exact: true }).click()
  const slide = preview.getByRole('img', {
    name: 'Original page 1 of slides_16x9.pdf',
  })
  await expect
    .poll(() =>
      slide.evaluate(
        (el) =>
          (el as HTMLImageElement).naturalWidth /
          (el as HTMLImageElement).naturalHeight,
      ),
    )
    .toBeCloseTo(16 / 9, 2)

  await chooseFile(page)
  const input = picker.getByLabel('Select a local file')
  await input.setInputFiles(sample('group_report.pdf'))
  await expect(
    page.getByRole('heading', { name: 'group_report.pdf' }),
  ).toBeVisible()
  await expect(page.getByText(/3 source pages/)).toBeVisible()
  await expect(
    preview.getByRole('img', { name: 'Document page 1' }),
  ).toBeVisible()

  await chooseFile(page)
  await input.setInputFiles(sample('sample_image.png'))
  await expect(
    page.getByRole('heading', { name: 'sample_image.png' }),
  ).toBeVisible()
  await expect(page.getByText(/1100 × 740 px/)).toBeVisible()

  const jpeg = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 100
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#244BB9'
    ctx.fillRect(0, 0, 200, 100)
    return canvas.toDataURL('image/jpeg').split(',')[1]
  })
  await chooseFile(page)
  await input.setInputFiles({
    name: 'local-photo.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from(jpeg, 'base64'),
  })
  await expect(
    page.getByRole('heading', { name: 'local-photo.jpg' }),
  ).toBeVisible()
  await expect(page.getByText(/200 × 100 px/)).toBeVisible()
  await preview.getByRole('button', { name: 'Original', exact: true }).click()
  const photo = preview.getByRole('img', {
    name: 'Original page 1 of local-photo.jpg',
  })
  await expect
    .poll(() => photo.evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBe(200)
})

test('invalid files show actionable errors and another choice recovers within the picker', async ({
  page,
}) => {
  const dialog = await chooseFile(page)
  const input = dialog.getByLabel('Select a local file')
  const error = dialog.getByRole('alert')
  const cases: [
    string | { name: string; mimeType: string; buffer: Buffer },
    RegExp,
  ][] = [
    [fixture('password-protected.pdf'), /password-protected.*unlocked/i],
    [fixture('51-pages.pdf'), /50 PDF pages.*smaller page range/i],
    [sample('malformed.pdf'), /damaged or unreadable/i],
    [
      {
        name: 'empty.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.alloc(0),
      },
      /file is empty/i,
    ],
    [
      {
        name: 'outline.pptx',
        mimeType: 'application/octet-stream',
        buffer: Buffer.from('example'),
      },
      /cannot be verified.*export it as a PDF/i,
    ],
    [
      {
        name: 'renamed.png',
        mimeType: 'image/png',
        buffer: Buffer.from('example'),
      },
      /contents do not match.*re-export/i,
    ],
    [
      {
        name: 'archive.zip',
        mimeType: 'application/zip',
        buffer: Buffer.from('example'),
      },
      /choose a PDF, JPEG or PNG/i,
    ],
  ]
  for (const [file, reason] of cases) {
    await input.setInputFiles(file)
    await expect(error).toHaveText(reason)
  }
  // Construct the large fixture in-browser to avoid sending 20 MB through Playwright's transport.
  await input.evaluate((el) => {
    const transfer = new DataTransfer()
    transfer.items.add(
      new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'large.pdf', {
        type: 'application/pdf',
      }),
    )
    ;(el as HTMLInputElement).files = transfer.files
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await expect(error).toHaveText(/20 MB preview limit.*smaller file/i)
  await input.setInputFiles(sample('lecture_notes.pdf'))
  await expect(dialog).toBeHidden()
  await expect(
    page.getByRole('heading', { name: 'lecture_notes.pdf' }),
  ).toBeVisible()
  await expect(page.getByText(/2 source pages/)).toBeVisible()
})
