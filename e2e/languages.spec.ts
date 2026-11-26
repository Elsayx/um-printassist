import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const locales = [
  { code: 'en', workspace: 'Print workspace', help: 'Help', guide: 'From document to print job', paper: 'Paper size', review: 'Review job', range: 'Page range' },
  { code: 'zh-Hant', workspace: '列印工作區', help: '說明', guide: '從文件到列印工作', paper: '紙張尺寸', review: '檢查列印工作', range: '頁面範圍' },
  { code: 'pt-PT', workspace: 'Área de impressão', help: 'Ajuda', guide: 'Do documento ao trabalho de impressão', paper: 'Tamanho do papel', review: 'Rever trabalho', range: 'Intervalo de páginas' },
]
const selector = 'Language / 語言 / Idioma'

for (const locale of locales) {
  test(locale.code + ': guide, validation, review, responsive layout and accessibility', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('heading', { name: 'lecture_handout_12p.pdf' }).waitFor()
    await page.getByLabel(selector).selectOption(locale.code)
    await expect(page.locator('html')).toHaveAttribute('lang', locale.code)
    await expect(page.getByRole('heading', { name: locale.workspace, exact: true })).toBeVisible()
    await page.getByRole('button', { name: locale.help, exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: locale.guide })).toBeVisible()
    await expect(dialog.locator('.pa-help-steps > li')).toHaveCount(4)
    await expect(dialog.locator('.pa-mini-sheet i')).toHaveCount(8)
    await page.setViewportSize({ width: 320, height: 850 })
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    await page.keyboard.press('Escape')
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
    await page.getByLabel(locale.paper).selectOption('A4')
    await page.locator('select').filter({ has: page.locator('option[value="custom"]') }).selectOption('custom')
    await page.getByLabel(locale.range, { exact: true }).fill('1-99')
    await expect(page.getByRole('button', { name: locale.review, exact: true })).toBeDisabled()
    const error = await page.locator('#range-error').textContent()
    if (locale.code !== 'en') expect(error).not.toContain('This document')
    await page.getByLabel(locale.range, { exact: true }).fill('1-3')
    await page.getByRole('button', { name: locale.review, exact: true }).click()
    await expect(page.getByRole('dialog').locator('.pa-review-list')).toBeVisible()
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    expect(audit.violations.map(violation => violation.id)).toEqual([])
  })
}

test('language changes retain draft settings, selected file and job IDs; preference survives reload', async ({ page }) => {
  await page.goto('./')
  await page.getByLabel('Paper size').selectOption('Letter')
  await page.getByLabel('Copies', { exact: true }).fill('3')
  await page.getByLabel(selector).selectOption('zh-Hant')
  await expect(page.getByLabel('紙張尺寸')).toHaveValue('Letter')
  await expect(page.getByLabel('份數', { exact: true })).toHaveValue('3')
  await page.getByRole('link', { name: '列印工作', exact: true }).click()
  await page.getByRole('button', { name: /lecture_notes.pdf.*DEMO-1042/ }).click()
  await page.getByLabel(selector).selectOption('pt-PT')
  await expect(page.getByText('DEMO-1042', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Receção não confirmada', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Verificar novamente' }).click()
  await expect(page.getByText(/A receção continua por confirmar/)).toBeVisible()
  await page.getByRole('link', { name: 'Área de impressão', exact: true }).click()
  await expect(page.getByLabel('Tamanho do papel')).toHaveValue('Letter')
  await expect(page.getByLabel('Cópias', { exact: true })).toHaveValue('3')
  await expect(page.getByRole('heading', { name: 'lecture_handout_12p.pdf' })).toBeVisible()
  await page.reload()
  await expect(page.getByLabel(selector)).toHaveValue('pt-PT')
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT')
})

test('printer search accepts translated building names and keeps original room codes', async ({ page }) => {
  await page.goto('./#printers')
  await page.getByLabel(selector).selectOption('zh-Hant')
  await page.getByRole('searchbox', { name: '搜尋印表機' }).fill('圖書館')
  await page.locator('.pb-buildings').getByRole('button', { name: /E2.*伍宜孫圖書館/ }).click()
  await expect(page.getByRole('heading', { name: '伍宜孫圖書館' })).toBeVisible()
  await page.getByLabel(selector).selectOption('pt-PT')
  await page.getByRole('searchbox', { name: 'Pesquisar impressoras' }).fill('biblioteca')
  await expect(page.getByRole('heading', { name: 'Biblioteca Wu Yee Sun' })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Pesquisar impressoras' }).fill('g111i')
  await page.locator('.pb-buildings').getByRole('button', { name: /E6.*Edifício Central de Ensino/ }).click()
  await expect(page.getByRole('button', { name: /sala G111i/ }).first()).toBeVisible()
})
