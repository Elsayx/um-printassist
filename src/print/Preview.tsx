import { t, countLabel, getLanguage } from '../i18n'
import { useEffect, useState, type CSSProperties } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Info,
  Layers,
  ScanLine,
} from 'lucide-react'
import type { SourceDocument } from '../files/documents'
import {
  bindingSide,
  contentSize,
  marginMm,
  orderDescriptions,
  type Layout,
  type Settings,
} from './layout'
import './preview.css'

interface Props {
  doc: SourceDocument
  settings: Settings
  layout: Layout
  onCurrentPage: (page: number) => void
}

const formatDimensions = (w: number, h: number) =>
  `${new Intl.NumberFormat(getLanguage(), { maximumFractionDigits: 1 }).format(w)} × ${new Intl.NumberFormat(getLanguage(), { maximumFractionDigits: 1 }).format(h)} mm`
const plural = countLabel

export default function Preview({
  doc,
  settings,
  layout,
  onCurrentPage,
}: Props) {
  const [mode, setMode] = useState<'sheet' | 'original'>('sheet')
  const [sheetIndex, setSheetIndex] = useState(0)
  const [face, setFace] = useState<'front' | 'back'>('front')
  const sheetMode = mode === 'sheet'
  const safeIndex = Math.min(sheetIndex, Math.max(layout.sheets.length - 1, 0))
  const side = settings.duplex === 'simplex' ? 'front' : face
  const sheet = layout.sheets[safeIndex]
  const cells = sheet?.[side] ?? []
  const emptySide = sheetMode && !!sheet && cells.every((cell) => cell === null)
  const pageNumber = Math.max(
    1,
    Math.min(doc.pages.length, settings.currentPage || 1),
  )
  const original = doc.pages[pageNumber - 1]
  const edge = bindingSide(layout.bindingEdge, side)
  const title = sheetMode ? 'Sheet' : 'Page'
  const index = sheetMode ? safeIndex + 1 : pageNumber
  const length = sheetMode ? layout.sheets.length : doc.pages.length
  const width = sheetMode ? layout.sheetWidthMm : original?.widthMm
  const height = sheetMode ? layout.sheetHeightMm : original?.heightMm
  const ratio = width && height ? width / height : 1
  const prevOrNext = (step: number) => {
    if (sheetMode) setSheetIndex(safeIndex + step)
    else onCurrentPage(pageNumber + step)
  }

  useEffect(() => {
    if (sheetIndex !== safeIndex) setSheetIndex(safeIndex)
  }, [sheetIndex, safeIndex])
  useEffect(() => {
    if (settings.duplex === 'simplex') setFace('front')
  }, [settings.duplex])

  const pages = layout.pages.map((n) => doc.pages[n - 1]).filter(Boolean)
  const mixed = pages.some(
    (p) =>
      Math.abs(p.widthMm - pages[0].widthMm) > 0.25 ||
      Math.abs(p.heightMm - pages[0].heightMm) > 0.25,
  )
  const crops = pages.some((p) => contentSize(p, layout, settings.scale).crops)
  const shrinks =
    mixed && pages.some((p) => contentSize(p, layout, settings.scale).reduced)
  const imageBox =
    doc.pixelSize && original
      ? contentSize(original, layout, settings.scale)
      : null
  const imageWidthMm = imageBox
    ? ((imageBox.widthPercent / 100) * (layout.sheetWidthMm - 2 * marginMm)) /
      layout.cols
    : 0
  const imagePpi =
    doc.pixelSize && imageWidthMm > 0
      ? Math.round((25.4 * doc.pixelSize.width) / imageWidthMm)
      : null
  const gridStyle: CSSProperties = {
    inset: `${(100 * marginMm) / layout.sheetHeightMm}% ${(100 * marginMm) / layout.sheetWidthMm}%`,
    gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
  }
  const numericLabels = cells
    .filter((cell): cell is number => cell !== null)
    .join(', ')

  return (
    <section className="pv-card" aria-label={t("Print preview")}>
      <div className="pv-heading">
        <h2>
          <ScanLine aria-hidden="true" size={20} strokeWidth={1.8} />{t("Print preview")}</h2>
        <div className="pv-tabs" role="group" aria-label={t("Preview mode")}>
          <button
            type="button"
            aria-pressed={sheetMode}
            onClick={() => setMode('sheet')}
          >
            <Layers size={15} aria-hidden="true" />{t("Physical sheet")}</button>
          <button
            type="button"
            aria-pressed={!sheetMode}
            onClick={() => setMode('original')}
          >
            <FileText size={15} aria-hidden="true" />{t("Original")}</button>
        </div>
      </div>
      <div className="pv-workbench">
        <div className="pv-spec">
          <span>
            {sheetMode
              ? settings.paper === 'Letter'
                ? t('US Letter')
                : settings.paper
              : t('Source')}
          </span>
          {width && height ? formatDimensions(width, height) : null}
        </div>
        {sheetMode && layout.error ? (
          <div className="pv-error" role="status">
            <Info size={22} aria-hidden="true" />
            <strong>{t("Preview paused")}</strong>
            <p>{t(layout.error)}</p>
          </div>
        ) : (
          original && (
            <div
              className="pv-paper"
              style={{
                width: `min(100%, ${326 * ratio}px)`,
                aspectRatio: String(ratio),
              }}
            >
              {sheetMode ? (
                <>
                  <div
                    className="pv-grid"
                    style={gridStyle}
                    data-testid="sheet-grid"
                  >
                    {cells.map((page, slot) => {
                      if (page === null)
                        return (
                          <div
                            key={slot}
                            className="pv-tile"
                            data-slot="blank"
                          />
                        )
                      const p = doc.pages[page - 1]
                      const size = contentSize(p, layout, settings.scale)
                      return (
                        <div
                          className={
                            'pv-tile' +
                            (settings.nup > 1 ? ' pv-tile-divided' : '')
                          }
                          key={slot}
                          data-source-page={page}
                        >
                          <img
                            alt={t(`Document page ${page}`)}
                            src={p.thumbnail}
                            className={
                              settings.color === 'grayscale' ? 'pv-gray' : ''
                            }
                            style={{
                              width: `${size.widthPercent}%`,
                              height: `${size.heightPercent}%`,
                            }}
                          />
                          <span className="pv-page-number" aria-hidden="true">
                            {page}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  {emptySide && <span className="pv-blank">{t("Blank back")}</span>}
                  {edge && (
                    <span
                      className={'pv-binding pv-binding-' + edge}
                      title={t(`Binding edge on this view: ${edge}`)}
                    />
                  )}
                </>
              ) : (
                <img
                  className="pv-original"
                  src={original.thumbnail}
                  alt={t(`Original page ${pageNumber} of ${doc.name}`)}
                />
              )}
            </div>
          )
        )}
      </div>
      <div className="pv-tools">
        <div className="pv-navigation">
          <button
            type="button"
            aria-label={t(`Previous ${title.toLowerCase()}`)}
            title={t(`Previous ${title.toLowerCase()}`)}
            disabled={index <= 1 || length === 0}
            onClick={() => prevOrNext(-1)}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <span aria-live="polite" aria-atomic="true">
            {length ? (
              t(title + ' {current} of {total}', { current: index, total: length })
            ) : (
              t('No sheets')
            )}
          </span>
          <button
            type="button"
            aria-label={t(`Next ${title.toLowerCase()}`)}
            title={t(`Next ${title.toLowerCase()}`)}
            disabled={index >= length}
            onClick={() => prevOrNext(1)}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
        {sheetMode &&
          (settings.duplex !== 'simplex' ? (
            <div className="pv-face" role="group" aria-label={t("Sheet side")}>
              <button
                type="button"
                disabled={!sheet}
                aria-pressed={side === 'front'}
                onClick={() => setFace('front')}
              >{t("Front")}</button>
              <button
                type="button"
                disabled={!sheet}
                aria-pressed={side === 'back'}
                onClick={() => setFace('back')}
              >{t("Back")}</button>
            </div>
          ) : (
            <span className="pv-simplex">{t("Front only")}</span>
          ))}
      </div>
      {sheetMode && !layout.error ? (
        <>
          <div className="pv-output" role="status">
            <strong>{plural(layout.totalSheets, 'physical sheet')}</strong>
            <span>
              {plural(layout.totalPrintedSides, 'printed side')} ·{' '}
              {settings.copies === 1 ? t('1 copy') : t(`${settings.copies} copies`)}
            </span>
            {settings.copies > 1 && (
              <span>{t('{sheets} per copy', { sheets: plural(layout.sheetsPerCopy, 'sheet') })}</span>
            )}
            <span className="pv-sr">{t('Sheet {sheet}, {side}. {content}', { sheet: safeIndex + 1, side: t(side === 'front' ? 'Front' : 'Back'), content: emptySide ? t('Blank back') : t('Pages {pages}.', { pages: numericLabels }) })}</span>
          </div>
          <div className="pv-legend">
            <p>
              <span className="pv-key" aria-hidden="true">
                1
              </span>{t("Numbers label source pages in the preview.")}</p>
            {settings.nup > 1 && <p>{t(orderDescriptions[settings.order])}.</p>}
            {edge && (
              <p>
                <span className="pv-binding-key" aria-hidden="true" />{t('Flip at the {edge} edge of the front. Both sides are shown upright.', { edge: t(layout.bindingEdge) })}</p>
            )}
            <p>{t('Dashed line shows a simulated {margin} mm margin. Actual printer output may vary.', { margin: marginMm })}</p>
            {settings.color === 'grayscale' && (
              <p>{t("Grayscale is approximate. Toner and printer settings can change the result.")}</p>
            )}
            {imagePpi !== null && (
              <p>{t('Estimated image resolution at this size: {ppi} pixels per inch.', { ppi: imagePpi })}{imageWidthMm > original.widthMm + 0.1
                  ? t(' Enlarging the image can soften detail.')
                  : ''}
              </p>
            )}
            {mixed && (
              <p className="pv-caution">{t("Selected pages have different source sizes.")}{shrinks
                  ? t(' Some pages are reduced to fit.')
                  : t(' All use the same output paper.')}
              </p>
            )}
            {crops && (
              <p className="pv-caution">{t("Some content extends beyond its printable area at actual size and will be cropped in this layout.")}</p>
            )}
          </div>
        </>
      ) : (
        !sheetMode && (
          <div className="pv-source-meta">
            <strong>{doc.name}</strong>
            <span>{t("Original document · ")}{plural(doc.pages.length, 'page')}</span>
          </div>
        )
      )}
    </section>
  )
}
