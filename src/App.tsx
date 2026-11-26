import {
  useEffect,
  useMemo,
  useRef,
  useState,
  lazy,
  Suspense,
  type MouseEvent,
} from 'react'
import {
  ArrowUpRight,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  FileImage,
  FileStack,
  FileText,
  FlaskConical,
  FolderOpen,
  Info,
  Layers,
  ListOrdered,
  MapPin,
  LoaderCircle,
  PanelsTopLeft,
  Printer,
  RotateCcw,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import SettingsPanel, {
  duplexLabels,
  orderLabels,
  scaleLabels,
  type Update,
} from './SettingsPanel'
import Dialog from './Dialog'
import Preview from './print/Preview'
import {
  computeLayout,
  contentSize,
  defaultSettings,
  marginMm,
  type Settings,
} from './print/layout'
import type { SourceDocument } from './files/documents'
import Jobs from './jobs/Jobs'
import { useJobs } from './jobs/useJobs'

import { initialFilters } from './printers/browse'
const PrinterBrowser = lazy(() => import('./printers/PrinterBrowser'))

const handout = 'lecture_handout_12p.pdf'
const samples = [
  {
    name: handout,
    title: 'Lecture handout',
    details: '12 portrait pages · PDF',
  },
  {
    name: 'slides_16x9.pdf',
    title: 'Lecture slides',
    details: 'Widescreen slides · PDF',
  },
  {
    name: 'group_report.pdf',
    title: 'Group report',
    details: 'Multi-page document · PDF',
  },
  {
    name: 'mixed_sizes.pdf',
    title: 'Mixed paper sizes',
    details: 'Different source dimensions · PDF',
  },
  {
    name: 'sample_image.png',
    title: 'Sample image',
    details: 'Single image · PNG',
  },
]
type Outcome = 'confirmed' | 'pending' | 'unconfirmed' | 'failed'
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
function currentView() {
  const hash = window.location.hash.slice(1)
  if (hash === 'printers' || hash.startsWith('printers/'))
    return { tab: 'printers', id: hash.split('/')[1] || null }
  return hash === 'jobs' || hash.startsWith('jobs/')
    ? { tab: 'jobs', id: hash.split('/')[1] || null }
    : { tab: 'workspace', id: null }
}

export default function App() {
  const [route, setRoute] = useState(currentView)
  const [browseFilters, setBrowseFilters] = useState({ ...initialFilters })
  const [studentTotal, setStudentTotal] = useState(0)
  const [dialog, setDialog] = useState<
    'files' | 'review' | 'help' | 'study' | null
  >(null)
  const [doc, setDoc] = useState<SourceDocument | null>(null)
  const [settings, setSettings] = useState<Settings>({ ...defaultSettings })
  const [copiesError, setCopiesError] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState('')
  const [loadCount, setLoadCount] = useState(0)
  const [outcome, setOutcome] = useState<Outcome>('confirmed')
  const [mobilePanel, setMobilePanel] = useState<'settings' | 'preview'>(
    'settings',
  )
  const sequence = useRef(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const lastSubmitted = useRef(false)
  const jobStore = useJobs()
  useEffect(() => {
    let lastTab = currentView().tab
    const listener = () => {
      const next = currentView()
      const stayingInMap = next.tab === 'printers' && lastTab === 'printers'
      lastTab = next.tab
      setRoute(next)
      setDialog(null)
      requestAnimationFrame(() => {
        if (stayingInMap) return
        if (next.tab !== 'jobs') mainRef.current?.focus({ preventScroll: true })
        window.scrollTo(0, 0)
      })
    }
    window.addEventListener('hashchange', listener)
    return () => window.removeEventListener('hashchange', listener)
  }, [])
  function navigate(
    tab: 'workspace' | 'jobs' | 'printers',
    id: string | null = null,
  ) {
    const target = tab + (id ? '/' + id : '')
    if (window.location.hash === '#' + target) {
      window.scrollTo(0, 0)
      return
    }
    window.location.hash = target
  }
  async function openDocument(input: string | File, reset = false) {
    const token = ++sequence.current
    setError('')
    setLoading(typeof input === 'string' ? input : input.name)
    try {
      const { loadFile, loadSample } = await import('./files/documents')
      if (token !== sequence.current) return
      const result =
        typeof input === 'string'
          ? await loadSample(input)
          : await loadFile(input)
      if (token !== sequence.current) return
      setDoc(result)
      setMobilePanel('settings')
      setLoadCount((v) => v + 1)
      setCopiesError(false)
      setSettings((s) => ({
        ...(reset ? defaultSettings : s),
        currentPage: 1,
        rangeMode: 'all',
        range: '',
      }))
      if (!reset) setDialog((active) => (active === 'files' ? null : active))
    } catch (e) {
      if (token === sequence.current)
        setError(
          e instanceof Error
            ? e.message
            : 'This file could not be opened. Try a different file.',
        )
    } finally {
      if (token === sequence.current) setLoading('')
    }
  }
  useEffect(() => {
    if (route.tab === 'workspace' && sequence.current === 0) {
      void openDocument(handout, true)
    }
  }, [route.tab])
  useEffect(() => {
    document.title =
      (route.tab === 'jobs'
        ? 'Print jobs'
        : route.tab === 'printers'
          ? 'Find a printer'
          : 'Print workspace') + ' · PrintAssist'
  }, [route.tab])
  const layout = useMemo(
    () =>
      computeLayout(
        copiesError ? { ...settings, copies: 0 } : settings,
        doc?.pages.length || 0,
      ),
    [settings, doc, copiesError],
  )
  const update: Update = (key, value) => {
    setSettings((s) => ({ ...s, [key]: value }))
  }
  const invalid = Boolean(
    loading || !doc || layout.error || copiesError || error,
  )
  const warnings = [...(doc?.warnings || [])]
  if (doc?.pixelSize && !layout.error) {
    const cellWidth = (layout.sheetWidthMm - 2 * marginMm) / layout.cols
    const printedWidth =
      (cellWidth *
        contentSize(doc.pages[0], layout, settings.scale).widthPercent) /
      100
    const ppi = Math.round((doc.pixelSize.width * 25.4) / printedWidth)
    warnings.push(
      'Effective image resolution: ' +
        ppi +
        ' pixels per inch at this size.' +
        (ppi < 150 ? ' Fine detail may look soft.' : ''),
    )
  }
  const total = layout.totalSheets
  const totalLabel = total + ' physical ' + (total === 1 ? 'sheet' : 'sheets')
  const pageText =
    settings.rangeMode === 'all'
      ? 'All pages'
      : settings.rangeMode === 'current'
        ? 'Page ' + settings.currentPage
        : layout.pages.join(', ')
  const summary: string[][] = [
    ['Paper', settings.paper === 'Letter' ? 'US Letter' : settings.paper],
    ['Orientation', cap(settings.orientation)],
    ['Color', settings.color === 'color' ? 'Color' : 'Black & white'],
    ['Print sides', duplexLabels[settings.duplex]],
    ['Pages per printed side', String(settings.nup)],
    [
      'Page order',
      settings.nup === 1 ? 'Single page' : orderLabels[settings.order],
    ],
    ['Source pages', pageText],
    ['Scaling', scaleLabels[settings.scale]],
    ['Copies', String(settings.copies)],
  ]
  function openDialog(
    name: Exclude<typeof dialog, null>,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    event.currentTarget.focus({ preventScroll: true })
    setDialog(name)
  }
  const review = (event: MouseEvent<HTMLButtonElement>) => {
    if (!invalid) {
      lastSubmitted.current = false
      openDialog('review', event)
    }
  }
  function submit() {
    if (!doc || invalid || lastSubmitted.current) return
    lastSubmitted.current = true
    const id = jobStore.submit(
      doc.name,
      summary.map(([k, v]) => k + ': ' + v).join(' · ') + ' · ' + totalLabel,
      outcome,
    )
    setDialog(null)
    navigate('jobs', id)
  }
  function reset() {
    jobStore.reset()
    setStudentTotal(0)
    setBrowseFilters({ ...initialFilters })
    setOutcome('confirmed')
    setDialog(null)
    setDoc(null)
    setSettings({ ...defaultSettings })
    navigate('workspace')
    void openDocument(handout, true)
  }
  const close = () => {
    if (dialog === 'files') {
      sequence.current++
      setLoading('')
      if (doc) setError('')
    }
    setDialog(null)
  }
  const showFiles = (event: MouseEvent<HTMLButtonElement>) => {
    setError('')
    openDialog('files', event)
  }
  return (
    <div className="pa-app">
      <a
        className="pa-skip"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault()
          mainRef.current?.focus()
        }}
      >
        Skip to content
      </a>
      <header className="pa-top">
        <div className="pa-top-inner">
          <a
            className="pa-brand"
            href="#workspace"
            aria-label="PrintAssist workspace"
          >
            <span className="pa-brand-icon">
              <Printer size={23} strokeWidth={2.1} />
            </span>
            Print<span>Assist</span>
          </a>
          <nav aria-label="Main navigation" className="pa-nav">
            <a
              href="#workspace"
              aria-current={route.tab === 'workspace' ? 'page' : undefined}
            >
              <PanelsTopLeft size={16} />
              Workspace
            </a>
            <a
              href="#jobs"
              aria-current={route.tab === 'jobs' ? 'page' : undefined}
            >
              <ListOrdered size={17} />
              Print jobs
            </a>
            <a
              href="#printers"
              aria-current={route.tab === 'printers' ? 'page' : undefined}
            >
              <MapPin size={17} />
              Find printers
            </a>
          </nav>
          <div className="pa-top-tools">
            <span className="pa-sim">
              <FlaskConical size={14} />
              Print simulator
            </span>
            <button
              className="pa-icon-button"
              aria-label="Help"
              title="Help"
              onClick={(e) => openDialog('help', e)}
            >
              <CircleHelp size={21} />
            </button>
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} ref={mainRef} className="pa-main">
        {route.tab === 'workspace' ? (
          <>
            <section className="pa-hero">
              <div className="pa-hero-copy">
                <h1>Print workspace</h1>
                <p>
                  Choose your settings and check each sheet before you submit.
                </p>
              </div>
              <div className="pa-hero-art" aria-hidden="true">
                <span className="pa-register r1" />
                <span className="pa-register r2" />
                <img
                  src={import.meta.env.BASE_URL + 'printer-studio.png'}
                  alt=""
                />
              </div>
            </section>
            <section className="pa-filebar" aria-label="Selected document">
              <span className="pa-file-icon">
                {doc?.kind === 'image' ? (
                  <FileImage size={24} />
                ) : (
                  <FileText size={24} />
                )}
              </span>
              <div className="pa-file-label">
                <h2>
                  {loading
                    ? 'Opening document…'
                    : doc?.name || 'Choose a document'}
                </h2>
                <p>
                  {loading ? (
                    <span role="status">{loading}</span>
                  ) : doc ? (
                    <>
                      {doc.kind === 'pdf' ? 'PDF document' : 'Image'}
                      <i /> {doc.pages.length}{' '}
                      {doc.pages.length === 1 ? 'source page' : 'source pages'}
                    </>
                  ) : (
                    'PDF, JPG or PNG'
                  )}
                </p>
              </div>
              <button className="pa-secondary" onClick={showFiles}>
                <FolderOpen size={17} />
                <span>Change file</span>
              </button>
            </section>
            {error && dialog !== 'files' && (
              <div role="alert" className="pa-alert">
                {error}
                <button className="pa-small-link" onClick={showFiles}>
                  Choose a file
                </button>
              </div>
            )}
            {doc && !loading ? (
              <div className={'pa-columns pa-mobile-' + mobilePanel}>
                <div
                  className="pa-mobile-switch"
                  role="group"
                  aria-label="Workspace view"
                >
                  <button
                    aria-pressed={mobilePanel === 'settings'}
                    onClick={() => setMobilePanel('settings')}
                  >
                    Print settings
                  </button>
                  <button
                    aria-pressed={mobilePanel === 'preview'}
                    onClick={() => setMobilePanel('preview')}
                  >
                    Print preview
                  </button>
                </div>
                <SettingsPanel
                  key={loadCount}
                  s={settings}
                  update={update}
                  pageCount={doc.pages.length}
                  rangeError={copiesError ? null : layout.error}
                  copiesError={copiesError}
                  setCopiesError={setCopiesError}
                />
                <div className="pa-right">
                  <Preview
                    key={loadCount}
                    doc={doc}
                    settings={settings}
                    layout={layout}
                    onCurrentPage={(n) => update('currentPage', n)}
                  />
                  {warnings.map((w) => (
                    <div className="pa-soft-note" key={w}>
                      <Info size={16} />
                      <span>{w}</span>
                    </div>
                  ))}
                  <div className="pa-total">
                    <div>
                      <span className="pa-small-label">Estimated output</span>
                      <strong>{invalid ? 'Check settings' : totalLabel}</strong>
                      {!invalid && (
                        <p>
                          {layout.printedSides} printed{' '}
                          {layout.printedSides === 1 ? 'side' : 'sides'} per
                          copy · {settings.copies}{' '}
                          {settings.copies === 1 ? 'copy' : 'copies'}
                        </p>
                      )}
                    </div>
                    <button
                      className="pa-primary"
                      disabled={invalid}
                      onClick={review}
                    >
                      Review job
                      <ArrowRight size={17} />
                    </button>
                  </div>
                  <p className="pa-no-printer">
                    <ShieldCheck size={15} />
                    Simulated print job. No file is sent to a printer.
                  </p>
                </div>
              </div>
            ) : (
              loading && (
                <div className="pa-wait" role="status">
                  <LoaderCircle className="pa-spin" />
                  Preparing the preview…
                </div>
              )
            )}
          </>
        ) : route.tab === 'printers' ? (
          <Suspense
            fallback={
              <div role="status" className="pa-wait">
                Opening campus map…
              </div>
            }
          >
            <PrinterBrowser
              studentTotal={studentTotal}
              onStudentTotal={setStudentTotal}
              filters={browseFilters}
              onFilters={setBrowseFilters}
              selected={route.id}
              onSelect={(code) => navigate('printers', code)}
            />
          </Suspense>
        ) : (
          <Jobs
            jobs={jobStore.jobs}
            selected={route.id}
            onSelect={(id) => navigate('jobs', id)}
            onCheck={jobStore.check}
            onRetry={jobStore.retry}
            onWorkspace={() => navigate('workspace')}
          />
        )}
      </main>
      <footer className="pa-footer">
        <span>
          <Printer size={14} />
          UM PrintAssist · Course prototype
        </span>
        <button onClick={(e) => openDialog('study', e)}>Study controls</button>
      </footer>
      {route.tab === 'workspace' && doc && !loading && (
        <div className="pa-mobile-review">
          <div>
            <span>{invalid ? 'Check settings' : totalLabel}</span>
            <button
              className="pa-mobile-jump"
              onClick={() => {
                setMobilePanel(
                  mobilePanel === 'settings' ? 'preview' : 'settings',
                )
                requestAnimationFrame(() =>
                  document
                    .querySelector('.pa-mobile-switch')
                    ?.scrollIntoView({ block: 'start' }),
                )
              }}
            >
              {mobilePanel === 'settings' ? 'See preview' : 'Edit settings'}
            </button>
          </div>
          <button onClick={review} disabled={invalid} className="pa-primary">
            Review job
            <ArrowRight size={16} />
          </button>
        </div>
      )}
      {dialog === 'files' && (
        <Dialog title="Choose a document" close={close}>
          <div className="pa-dialog-body">
            <p className="pa-intro">
              Open a file from your device or choose a sample.
            </p>
            <input
              hidden
              type="file"
              ref={fileRef}
              aria-label="Select a local file"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void openDocument(f)
                e.target.value = ''
              }}
            />
            <button
              className="pa-upload"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={20} />
              <span>
                <strong>Browse device</strong>
                <small>PDF, JPG or PNG · up to 20 MB</small>
              </span>
              <ChevronRight size={17} />
            </button>
            {error && (
              <p className="pa-alert" role="alert">
                {error}
              </p>
            )}
            <h3>Sample documents</h3>
            <div className="pa-samples">
              {samples.map((f) => (
                <button key={f.name} onClick={() => void openDocument(f.name)}>
                  <span className="pa-sample-icon">
                    {f.name.endsWith('.png') ? (
                      <FileImage size={19} />
                    ) : (
                      <FileText size={19} />
                    )}
                  </span>
                  <span>
                    <strong>{f.title}</strong>
                    <small>{f.details}</small>
                  </span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
            {loading && (
              <p className="pa-soft-note" role="status">
                <LoaderCircle size={16} className="pa-spin" />
                Opening {loading}…
              </p>
            )}
            <p className="pa-muted-note">
              <ShieldCheck size={15} />
              Your document stays in this browser.
            </p>
          </div>
        </Dialog>
      )}
      {dialog === 'review' && doc && (
        <Dialog title="Review print job" close={close}>
          <div className="pa-dialog-body">
            <div className="pa-review-file">
              <FileText size={21} />
              <strong>{doc.name}</strong>
            </div>
            <div className="pa-review-count">
              <Layers size={22} />
              <div>
                <b>{totalLabel}</b>
                <small>
                  {layout.sheetsPerCopy}{' '}
                  {layout.sheetsPerCopy === 1 ? 'sheet' : 'sheets'} and{' '}
                  {layout.printedSides} printed{' '}
                  {layout.printedSides === 1 ? 'side' : 'sides'} per copy
                </small>
              </div>
            </div>
            <dl className="pa-review-list">
              {summary.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="pa-warning">
              <Info size={18} />
              <div>
                <b>What is still unverified?</b>
                <p>
                  The preview uses a simulated 6 mm margin. Actual printer
                  margins, duplex alignment, color and cost are unverified.
                </p>
                {settings.scale === 'actual' && (
                  <p>Actual size can crop content outside its cell.</p>
                )}
                {warnings.map((w) => (
                  <p key={w}>{w}</p>
                ))}
              </div>
            </div>
            <div className="pa-dialog-actions">
              <button className="pa-secondary" onClick={close}>
                Edit settings
              </button>
              <button className="pa-primary" onClick={submit}>
                Submit simulated job
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </Dialog>
      )}
      {dialog === 'help' && (
        <Dialog title="PrintAssist help" close={close}>
          <div className="pa-dialog-body pa-help">
            <h3>
              <FileStack size={19} />
              Check your output
            </h3>
            <p>
              Use Physical sheet to inspect each front and back. The numbers
              identify source pages. Open Original to inspect a page at its
              source dimensions.
            </p>
            <h3>
              <ListOrdered size={19} />
              Find a submitted job
            </h3>
            <p>
              Open Print jobs and match the file name and job ID. If receipt is
              unconfirmed, check again before making another submission.
            </p>
            <h3>
              <BookOpen size={19} />
              Printing on campus
            </h3>
            <p>
              UM Follow-You Printing holds jobs for release at a printer. This
              simulator cannot check that queue or release a job.
            </p>
            <a
              href="https://icto.um.edu.mo/printing/follow-you-student-printing/"
              target="_blank"
              rel="noreferrer"
            >
              ICTO student printing guide <ArrowUpRight size={15} />
            </a>
          </div>
        </Dialog>
      )}
      {dialog === 'study' && (
        <Dialog title="Study controls" close={close}>
          <div className="pa-dialog-body">
            <p className="pa-intro">
              Facilitator controls for this browser session.
            </p>
            <label className="pa-field">
              <span>Outcome for new simulated jobs</span>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as Outcome)}
              >
                <option value="confirmed">
                  Confirmed received (standard task)
                </option>
                <option value="unconfirmed">Unconfirmed</option>
                <option value="pending">Pending</option>
                <option value="failed">Known failure</option>
              </select>
            </label>
            <div className="pa-study-reset">
              <h3>Reset for a participant</h3>
              <p>
                Clears this session’s jobs and settings and restores the handout
                and the interrupted lecture-notes job.
              </p>
              <button className="pa-secondary" onClick={reset}>
                <RotateCcw size={16} />
                Reset scenario
              </button>
            </div>
            <div className="pa-dialog-actions">
              <button className="pa-primary" onClick={close}>
                <Check size={16} />
                Done
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}
