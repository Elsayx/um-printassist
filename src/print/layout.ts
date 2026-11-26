export const paperSizes = {
  A4: [210, 297],
  A3: [297, 420],
  Letter: [215.9, 279.4],
} as const

export const supportedNup = [1, 2, 4, 6, 9, 16] as const
export const marginMm = 6

export interface Settings {
  paper: keyof typeof paperSizes
  orientation: 'portrait' | 'landscape'
  duplex: 'simplex' | 'long' | 'short'
  nup: (typeof supportedNup)[number]
  order: 'horizontal' | 'horizontal-reverse' | 'vertical' | 'vertical-reverse'
  rangeMode: 'all' | 'current' | 'custom'
  range: string
  currentPage: number
  copies: number
  color: 'color' | 'grayscale'
  scale: 'fit' | 'actual'
}

export const defaultSettings: Settings = {
  paper: 'A3',
  orientation: 'landscape',
  duplex: 'simplex',
  nup: 1,
  order: 'horizontal',
  rangeMode: 'all',
  range: '',
  currentPage: 1,
  copies: 1,
  color: 'color',
  scale: 'fit',
}

export interface PhysicalSheet {
  front: (number | null)[]
  back: (number | null)[] | null
}

export interface Layout {
  error: string | null
  pages: number[]
  sheets: PhysicalSheet[]
  rows: number
  cols: number
  sheetWidthMm: number
  sheetHeightMm: number
  bindingEdge: 'left' | 'top' | null
  sheetsPerCopy: number
  printedSides: number
  totalSheets: number
  totalPrintedSides: number
  blankBacks: number
}

export function selectPages(
  settings: Settings,
  pageCount: number,
): { pages: number[]; error: string | null } {
  const reject = (error: string) => ({ pages: [], error })
  if (!Number.isSafeInteger(pageCount) || pageCount <= 0)
    return reject('Choose a document with at least one page.')
  if (settings.rangeMode === 'all') {
    return {
      pages: Array.from({ length: pageCount }, (_, i) => i + 1),
      error: null,
    }
  }
  if (settings.rangeMode === 'current') {
    if (
      !Number.isInteger(settings.currentPage) ||
      settings.currentPage < 1 ||
      settings.currentPage > pageCount
    ) {
      return reject(`Choose a source page from 1 to ${pageCount}.`)
    }
    return { pages: [settings.currentPage], error: null }
  }
  if (!settings.range.trim())
    return reject('Enter a page number or range, such as 1–3, 5.')
  const selected = new Set<number>()
  for (const part of settings.range.split(',')) {
    const match = /^(\d+)(?:\s*[-–]\s*(\d+))?$/.exec(part.trim())
    if (!match)
      return reject(
        'Use page numbers and ranges separated by commas, such as 1–3, 5.',
      )
    const start = Number(match[1])
    const end = Number(match[2] ?? match[1])
    if (start < 1 || end < 1 || start > pageCount || end > pageCount) {
      return reject(
        `This document has ${pageCount} ${pageCount === 1 ? 'page' : 'pages'}. Choose pages from 1 to ${pageCount}.`,
      )
    }
    if (start > end)
      return reject(`Put the smaller page first. Try ${end}–${start}.`)
    for (let page = start; page <= end; page++) selected.add(page)
  }
  return { pages: [...selected].sort((a, b) => a - b), error: null }
}

const portraitGrid: Record<Settings['nup'], readonly [number, number]> = {
  1: [1, 1],
  2: [1, 2],
  4: [2, 2],
  6: [2, 3],
  9: [3, 3],
  16: [4, 4],
}

// Tiles are stored in screen order (left to right across successive rows).
// Reversed horizontal starts at top right. Reversed vertical runs down the
// rightmost column first, following the conventional N-up column ordering.
export function imposeSide(
  pages: number[],
  cols: number,
  rows: number,
  order: Settings['order'],
) {
  const cells: (number | null)[] = Array(cols * rows).fill(null)
  const vertical = order.startsWith('vertical')
  const rightFirst = order.endsWith('reverse')
  pages.forEach((page, i) => {
    const row = vertical ? i % rows : Math.floor(i / cols)
    const col = vertical ? Math.floor(i / rows) : i % cols
    cells[row * cols + (rightFirst ? cols - 1 - col : col)] = page
  })
  return cells
}

export const orderDescriptions: Record<Settings['order'], string> = {
  horizontal: 'Across each row, left to right',
  'horizontal-reverse': 'Across each row, right to left',
  vertical: 'Down each column, left to right',
  'vertical-reverse': 'Down each column, right to left',
}

export function computeLayout(settings: Settings, pageCount: number): Layout {
  const [short, long] = paperSizes[settings.paper]
  const portrait = settings.orientation === 'portrait'
  const [a, b] = portraitGrid[settings.nup]
  const [cols, rows] = portrait ? [a, b] : [b, a]
  const { pages, error } = selectPages(settings, pageCount)
  const double = settings.duplex !== 'simplex'
  const edge = double
    ? (settings.duplex === 'long') === portrait
      ? 'left'
      : 'top'
    : null
  const layout: Layout = {
    error,
    pages,
    sheets: [],
    cols,
    rows,
    bindingEdge: edge,
    sheetWidthMm: portrait ? short : long,
    sheetHeightMm: portrait ? long : short,
    sheetsPerCopy: 0,
    printedSides: 0,
    totalSheets: 0,
    totalPrintedSides: 0,
    blankBacks: 0,
  }
  if (error) return layout
  if (
    !Number.isInteger(settings.copies) ||
    settings.copies < 1 ||
    settings.copies > 99
  ) {
    layout.error = 'Choose a whole number of copies from 1 to 99.'
    return layout
  }
  const perSide = settings.nup
  const perSheet = double ? perSide * 2 : perSide
  for (let i = 0; i < pages.length; i += perSheet) {
    const side = (offset: number) =>
      imposeSide(
        pages.slice(offset, offset + perSide),
        cols,
        rows,
        settings.order,
      )
    layout.sheets.push({
      front: side(i),
      back: double ? side(i + perSide) : null,
    })
  }
  layout.printedSides = Math.ceil(pages.length / perSide)
  layout.sheetsPerCopy = layout.sheets.length
  layout.totalSheets = layout.sheetsPerCopy * settings.copies
  layout.totalPrintedSides = layout.printedSides * settings.copies
  layout.blankBacks = double
    ? layout.sheetsPerCopy * 2 - layout.printedSides
    : 0
  return layout
}

export function bindingSide(
  edge: Layout['bindingEdge'],
  side: 'front' | 'back',
) {
  if (!edge || side === 'front') return edge
  return edge === 'left' ? 'right' : 'bottom'
}

// An image spans the same physical width and height it specifies in the source
// document. Cell clipping is a separate drawing concern for actual size.
export function contentSize(
  page: { widthMm: number; heightMm: number },
  layout: Layout,
  scale: Settings['scale'],
) {
  const width = (layout.sheetWidthMm - 2 * marginMm) / layout.cols
  const height = (layout.sheetHeightMm - 2 * marginMm) / layout.rows
  const fit = Math.min(width / page.widthMm, height / page.heightMm)
  const factor = scale === 'fit' ? fit : 1
  return {
    widthPercent: (100 * page.widthMm * factor) / width,
    heightPercent: (100 * page.heightMm * factor) / height,
    crops:
      scale === 'actual' &&
      (page.widthMm - width > 0.05 || page.heightMm - height > 0.05),
    reduced: scale === 'fit' && fit < 0.999,
  }
}
