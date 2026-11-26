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
      <span>{title}</span>
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
      <legend>{label}</legend>
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
              {choice.icon}
              {choice.label}
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
    <section className="pa-settings pa-card" aria-label="Print settings">
      <div className="pa-panel-heading">
        <SlidersHorizontal size={19} />
        <h2>Print settings</h2>
      </div>
      <div className="pa-settings-body">
        <Field title="Paper size">
          <select
            value={s.paper}
            onChange={(e) =>
              update('paper', e.target.value as Settings['paper'])
            }
          >
            <option value="A4">A4 · 210 × 297 mm</option>
            <option value="A3">A3 · 297 × 420 mm</option>
            <option value="Letter">US Letter · 215.9 × 279.4 mm</option>
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
        <Field title="Print sides">
          <select
            value={s.duplex}
            onChange={(e) =>
              update('duplex', e.target.value as Settings['duplex'])
            }
          >
            {Object.entries(duplexLabels).map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <div className="pa-field">
          <label htmlFor="copies">Copies</label>
          <div className="pa-stepper">
            <button
              type="button"
              aria-label="Decrease copies"
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
              aria-label="Increase copies"
              disabled={s.copies >= 99 && !copiesError}
              onClick={() => copies(String(Math.min(99, s.copies + 1)))}
            >
              <Plus size={15} />
            </button>
          </div>
          {copiesError && (
            <span role="alert" id="copies-error" className="pa-error-text">
              Enter 1 to 99 copies.
            </span>
          )}
        </div>
      </div>
      <details open className="pa-layout">
        <summary>
          <GalleryHorizontalEnd size={18} />
          Layout &amp; pages
          <ChevronDown className="pa-chevron" size={16} />
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
          <Field title="Page order">
            <select
              value={s.order}
              disabled={s.nup === 1}
              onChange={(e) =>
                update('order', e.target.value as Settings['order'])
              }
            >
              {Object.entries(orderLabels).map(([v, t]) => (
                <option value={v} key={v}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field title="Print pages">
            <select
              value={s.rangeMode}
              onChange={(e) =>
                update('rangeMode', e.target.value as Settings['rangeMode'])
              }
            >
              <option value="all">All pages</option>
              <option value="current">Current source page</option>
              <option value="custom">Custom range</option>
            </select>
          </Field>
          {s.rangeMode === 'custom' && (
            <Field title="Page range">
              <input
                placeholder="e.g. 1–3, 5, 8"
                value={s.range}
                aria-invalid={!!rangeError}
                aria-describedby={rangeError ? 'range-error' : undefined}
                onChange={(e) => update('range', e.target.value)}
              />
            </Field>
          )}
          {s.rangeMode === 'current' && (
            <Field title="Current source page">
              <select
                value={s.currentPage}
                onChange={(e) => update('currentPage', Number(e.target.value))}
              >
                {Array.from({ length: pageCount }, (_, i) => (
                  <option key={i} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {rangeError && (
            <p className="pa-error-text" role="alert" id="range-error">
              {rangeError}
            </p>
          )}
          <Field title="Scaling">
            <select
              value={s.scale}
              onChange={(e) =>
                update('scale', e.target.value as Settings['scale'])
              }
            >
              <option value="fit">{scaleLabels.fit}</option>
              <option value="actual">{scaleLabels.actual}</option>
            </select>
          </Field>
        </div>
      </details>
    </section>
  )
}
