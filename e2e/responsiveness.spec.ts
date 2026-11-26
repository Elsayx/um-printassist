import { expect, test, type Page } from '@playwright/test'
import { seedJobs } from '../src/jobs/model'

async function ready(page: Page) {
  await page.goto('./')
  await page.getByRole('heading', { name: 'lecture_handout_12p.pdf' }).waitFor()
}
async function expectInteractive(page: Page) {
  await expect(page.locator('dialog[open]')).toHaveCount(0)
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
  await page.evaluate(() => scrollTo(0, 0))
  await page.mouse.move(5, 300)
  await page.mouse.wheel(0, 400)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Help', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
}

test('native dialog closure releases scrolling and allows reopening without a reload', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 })
  await ready(page)
  await page.getByRole('button', { name: 'Help', exact: true }).click()
  // Covers a native close (browser/platform or method=dialog), outside React's buttons.
  await page.getByRole('dialog').evaluate((dialog: HTMLDialogElement) => dialog.close())
  await expectInteractive(page)
})

for (const width of [390, 1280]) {
  test(`repeated dismissals and navigation leave no stale page lock at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 600 })
    await ready(page)
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    for (let i = 0; i < 6; i++) {
      await page.getByRole('button', { name: 'Help', exact: true }).click()
      if (i % 3 === 0) await page.getByRole('button', { name: 'Close dialog' }).click()
      else if (i % 3 === 1) await page.keyboard.press('Escape')
      else await page.mouse.click(2, 2)
      await expect(page.locator('dialog[open]')).toHaveCount(0)
    }
    await page.getByRole('button', { name: 'Change file' }).click()
    await page.evaluate(() => { location.hash = 'jobs' })
    await expect(page.getByRole('heading', { name: 'Print jobs', exact: true })).toBeVisible()
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
    await page.getByRole('link', { name: 'Workspace', exact: true }).click()
    await expectInteractive(page)
    expect(errors).toEqual([])
  })
}

test('workspace, jobs and map remain clickable after idle time and a resume notification', async ({ page }) => {
  await ready(page)
  await page.clock.install()
  for (const tab of ['Workspace', 'Print jobs', 'Find printers']) {
    await page.getByRole('link', { name: tab, exact: true }).click()
    await page.clock.fastForward('05:00')
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await page.getByRole('button', { name: 'Help', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
  }
})

test('a completed stored job with stale reply metadata does not start an idle update loop', async ({ page }) => {
  const stored = seedJobs()
  stored[1].reply = { outcome: 'confirmed', due: 1 }
  await page.addInitScript(jobs => {
    sessionStorage.setItem('um-printassist.jobs.v1', JSON.stringify(jobs))
    const original = window.setTimeout.bind(window)
    Reflect.set(window, '__immediateTimers', 0)
    window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: unknown[]) => {
      if (delay === 0) {
        const count = Reflect.get(window, '__immediateTimers') + 1
        Reflect.set(window, '__immediateTimers', count)
        // Bound the broken behavior in this regression test to protect the test PC.
        if (count >= 8) return 0
      }
      return original(handler, delay, ...args)
    }) as typeof window.setTimeout
  }, stored)
  await page.goto('./#jobs')
  await expect(page.getByRole('heading', { name: 'Print jobs', exact: true })).toBeVisible()
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 100)))
  expect(await page.evaluate(() => Reflect.get(window, '__immediateTimers'))).toBeLessThanOrEqual(1)
  await page.getByRole('button', { name: 'Help', exact: true }).click()
  await page.keyboard.press('Escape')
})
