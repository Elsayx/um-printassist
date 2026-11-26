import { t } from './i18n'
import { useEffect, useState, type ReactNode } from 'react'
import {
  ChevronDown,
  GalleryHorizontalEnd,
  Minus,
  Plus,
  RectangleHorizontal,
  RectangleVertical,
  SlidersHorizontal,
} from 'lucide-react'
import type { Settings } from './print/layout'

export const orderLabels: Record<Settings['order'], string> = {
  horizontal: 'Rows · left to right',
  'horizontal-reverse': 'Rows · right to left',
  vertical: 'Columns · top to bottom',
  'vertical-reverse': 'Columns · top to bottom, right first',
}
export const duplexLabels: Record<Settings['duplex'], string> = {
  simplex: 'One-sided',
  long: 'Two-sided · long edge',
  short: 'Two-sided · short edge',
}
export const scaleLabels = {
  fit: 'Fit to printable area',
  actual: 'Actual size',
}
export type Update = <K extends keyof Settings>(
  key: K,
  value: Settings[K],
) => void
function Field({ title, children }: { title: string; children: ReactNode }) {
  return (
    <label className="pa-field">
      <span>{t(title)}</span>
      {children}
    </label>
  )
}
function Segments<T extends string | number>({
  label,
  value,
  choices,
  change,
  className = '',
}: {
  label: string
  value: T
  choices: { value: T; label: string; icon?: ReactNode }[]
  change: (v: T) => void
  className?: string
}) {
  return (
    <fieldset className={'pa-field pa-group ' + className}>
      <legend>{t(label)}</legend>
      <div className="pa-segments">
        {choices.map((choice) => (
          <label key={choice.value}>
            <input
              type="radio"
              name={label}
              value={choice.value}
              checked={choice.value === value}
              onChange={() => change(choice.value)}
            />
            <span>
              {choice.icon && <i className="pa-choice-icon" aria-hidden="true">{choice.icon}</i>}
              {t(choice.label)}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
export default function SettingsPanel({
  s,
  update,
  pageCount,
  rangeError,
  copiesError,
  setCopiesError,
}: {
  s: Settings
  update: Update
  pageCount: number
  rangeError: string | null
  copiesError: boolean
  setCopiesError: (v: boolean) => void
}) {
  const [copyText, setCopyText] = useState(String(s.copies))
  useEffect(() => {
    setCopyText(String(s.copies))
  }, [s.copies])
  const copies = (text: string) => {
    setCopyText(text)
    const valid = /^[1-9]\d?$/.test(text)
    setCopiesError(!valid)
    if (valid) update('copies', Number(text))
  }
  return (
    <section className="pa-settings pa-card" aria-label={t("Print settings")}>
      <div className="pa-panel-heading">
        <SlidersHorizontal size={19} />
        <h2>{t("Print settings")}</h2>
      </div>
      <div className="pa-settings-body">
        <Field title={t("Paper size")}>
          <select
            value={s.paper}
            onChange={(e) =>
              update('paper', e.target.value as Settings['paper'])
            }
          >
            <option value="A4">{t("A4 · 210 × 297 mm")}</option>
            <option value="A3">{t("A3 · 297 × 420 mm")}</option>
            <option value="Letter">{t("US Letter · 215.9 × 279.4 mm")}</option>
          </select>
        </Field>
        <Segments
          label="Orientation"
          value={s.orientation}
          change={(v) => update('orientation', v)}
          choices={[
            {
              value: 'portrait',
              label: 'Portrait',
              icon: <RectangleVertical size={16} />,
            },
            {
              value: 'landscape',
              label: 'Landscape',
              icon: <RectangleHorizontal size={16} />,
            },
          ]}
        />
        <Segments
          label="Color mode"
          value={s.color}
          change={(v) => update('color', v)}
          choices={[
            {
              value: 'color',
              label: 'Color',
              icon: <i className="pa-color-dot" />,
            },
            {
              value: 'grayscale',
              label: 'Black & white',
              icon: <i className="pa-gray-dot" />,
            },
          ]}
        />
        <Field title={t("Print sides")}>
          <select
            value={s.duplex}
            aria-describedby="duplex-hint"
            onChange={(e) =>
              update('duplex', e.target.value as Settings['duplex'])
            }
          >
            {Object.entries(duplexLabels).map(([v, text]) => (
              <option key={v} value={v}>
                {t(text)}
              </option>
            ))}
          </select>
        </Field>
        <p className="pa-field-hint" id="duplex-hint">
          {s.duplex === 'simplex'
            ? t('Prints on the front of each sheet only.')
            : s.duplex === 'long'
              ? t('Turn each sheet along its long edge, like a book.')
              : t('Turn each sheet along its short edge, like a notepad.')}
        </p>
        <div className="pa-field">
          <label htmlFor="copies">{t("Copies")}</label>
          <div className="pa-stepper">
            <button
              type="button"
              aria-label={t("Decrease copies")}
              disabled={s.copies <= 1 && !copiesError}
              onClick={() => copies(String(Math.max(1, s.copies - 1)))}
            >
              <Minus size={15} />
            </button>
            <input
              id="copies"
              value={copyText}
              inputMode="numeric"
              pattern="[0-9]*"
              aria-invalid={copiesError}
              aria-describedby={copiesError ? 'copies-error' : undefined}
              onChange={(e) => copies(e.target.value)}
            />
            <button
              type="button"
              aria-label={t("Increase copies")}
              disabled={s.copies >= 99 && !copiesError}
              onClick={() => copies(String(Math.min(99, s.copies + 1)))}
            >
              <Plus size={15} />
            </button>
          </div>
          {copiesError && (
            <span role="alert" id="copies-error" className="pa-error-text">{t("Enter 1 to 99 copies.")}</span>
          )}
        </div>
      </div>
      <details open className="pa-layout">
        <summary>
          <GalleryHorizontalEnd size={18} />{t("Layout & pages")}<ChevronDown className="pa-chevron" size={16} />
        </summary>
        <div className="pa-settings-body">
          <Segments
            label="Pages per printed side"
            className="pa-nup"
            value={s.nup}
            change={(v) => update('nup', v)}
            choices={([1, 2, 4, 6, 9, 16] as const).map((v) => ({
              value: v,
              label: String(v),
            }))}
          />
          <Field title={t("Page order")}>
            <select
              value={s.order}
              disabled={s.nup === 1}
              aria-describedby={s.nup === 1 ? 'page-order-hint' : undefined}
              onChange={(e) =>
                update('order', e.target.value as Settings['order'])
              }
            >
              {Object.entries(orderLabels).map(([v, text]) => (
                <option value={v} key={v}>
                  {t(text)}
                </option>
              ))}
            </select>
          </Field>
          {s.nup === 1 && (
            <p className="pa-field-hint" id="page-order-hint">{t("Choose 2 or more pages per side to change their reading order.")}</p>
          )}
          <Field title={t("Print pages")}>
            <select
              value={s.rangeMode}
              onChange={(e) =>
                update('rangeMode', e.target.value as Settings['rangeMode'])
              }
            >
              <option value="all">{t("All pages")}</option>
              <option value="current">{t("Current source page")}</option>
              <option value="custom">{t("Custom range")}</option>
            </select>
          </Field>
          {s.rangeMode === 'custom' && (
            <Field title={t("Page range")}>
              <input
                placeholder={t("e.g. 1–3, 5, 8")}
                value={s.range}
                aria-invalid={!!rangeError}
                aria-describedby={rangeError ? 'range-error page-range-hint' : 'page-range-hint'}
                onChange={(e) => update('range', e.target.value)}
              />
            </Field>
          )}
          {s.rangeMode === 'custom' && (
            <p className="pa-field-hint" id="page-range-hint">{t("Use commas for separate pages and a dash for a range, such as 1–3, 5.")}</p>
          )}
          {s.rangeMode === 'current' && (
            <Field title={t("Current source page")}>
              <select
                value={s.currentPage}
                onChange={(e) => update('currentPage', Number(e.target.value))}
              >
                {Array.from({ length: pageCount }, (_, i) => (
                  <option key={i} value={i + 1}>
                    {t(i + 1)}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {rangeError && (
            <p className="pa-error-text" role="alert" id="range-error">
              {t(rangeError)}
            </p>
          )}
          <Field title={t("Scaling")}>
            <select
              value={s.scale}
              onChange={(e) =>
                update('scale', e.target.value as Settings['scale'])
              }
            >
              <option value="fit">{t(scaleLabels.fit)}</option>
              <option value="actual">{t(scaleLabels.actual)}</option>
            </select>
          </Field>
        </div>
      </details>
    </section>
  )
}
