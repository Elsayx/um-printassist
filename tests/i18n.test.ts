import { test } from 'node:test'
import assert from 'node:assert/strict'
import { t, setLanguage, getLanguage, countLabel, translateSummary, subscribeLanguage } from '../src/i18n/index'
import { messages } from '../src/i18n/messages'

test('switching language updates messages and counts without translating filenames or IDs', () => {
  setLanguage('zh-Hant')
  assert.equal(t('Print workspace'), '列印工作區')
  assert.equal(countLabel(2, 'physical sheet'), '2 張紙')
  assert.equal(t('lecture_handout_12p.pdf'), 'lecture_handout_12p.pdf')
  assert.equal(t('DEMO-1042'), 'DEMO-1042')
  assert.equal(t('This document has 12 pages. Choose pages from 1 to 12.'), '此文件共有 12 頁。請選擇第 1 至 12 頁。')
  setLanguage('pt-PT')
  assert.equal(t('Print workspace'), 'Área de impressão')
  assert.equal(countLabel(1, 'copy'), '1 cópia')
  assert.equal(countLabel(2, 'copy'), '2 cópias')
  assert.equal(t('Sheet {current} of {total}', { current: 2, total: 3 }), 'Folha 2 de 3')
  assert.equal(t('Sheet 2 of 3'), 'Folha 2 de 3')
  assert.equal(translateSummary('Paper: A4 · Orientation: Portrait · 1 copy'), 'Papel: A4 · Orientação: Vertical · 1 cópia')
  setLanguage('en')
  assert.equal(t('Sheet {current} of {total}', { current: 2, total: 3 }), 'Sheet 2 of 3')
  assert.equal(countLabel(2, 'physical sheet'), '2 physical sheets')
})

test('language listeners can unsubscribe and repeated selections do not notify again', () => {
  setLanguage('en')
  let changes = 0
  const stop = subscribeLanguage(() => changes++)
  setLanguage('zh-Hant')
  setLanguage('zh-Hant')
  assert.equal(changes, 1)
  stop()
  setLanguage('en')
  assert.equal(changes, 1)
  assert.equal(getLanguage(), 'en')
})

test('both translations preserve every interpolation variable', () => {
  const tokens = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()
  for (const [source, translations] of Object.entries(messages)) {
    for (const translation of translations) {
      assert.ok(translation.trim(), source)
      assert.deepEqual(tokens(translation), tokens(source), source)
    }
  }
})
