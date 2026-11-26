import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Clock3,
  CreditCard,
  Headphones,
  Info,
  Layers3,
  List,
  MapPin,
  Printer,
  Search,
  SlidersHorizontal,
  Timer,
  WifiOff,
  X,
} from 'lucide-react'
import CampusMap from './CampusMap'
import QueueEditor from './QueueEditor'
import { sites, type PrinterSite } from './directory'
import {
  demoPending,
  groupSites,
  initialFilters,
  matchSites,
  paymentNames,
  parseQueueLength,
  type BrowseFilters,
} from './browse'
import { usePrinterStatus } from './status'
import type { StationReading } from './status'
import './browse.css'

type Props = {
  selected: string | null
  onSelect: (code: string | null) => void
  demoCounts: ReadonlyMap<string, number>
  onDemoCounts: (next: ReadonlyMap<string, number>) => void
  filters: BrowseFilters
  onFilters: (next: BrowseFilters) => void
}
const plural = (n: number, s: string) => n + ' ' + s + (n === 1 ? '' : 's')
const methodLabel = (site: PrinterSite) =>
  site.method === 'quota'
    ? 'Follow-You · Printing quota'
    : paymentNames[site.method]

function SiteCard({
  site,
  demo,
  simulatedCount,
  onEditCount,
  reading,
  open,
  onToggle,
}: {
  site: PrinterSite
  demo: boolean
  simulatedCount: number
  onEditCount: (value: number) => void
  reading?: StationReading
  open: boolean
  onToggle: () => void
}) {
  const count = demo ? simulatedCount : reading?.pending
  return (
    <article className={'pb-site' + (open ? ' is-open' : '')}>
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={'site-' + site.id}
          onClick={onToggle}
        >
          <span>
            <strong>{site.location}</strong>
            <small>
              <CreditCard size={13} />
              {methodLabel(site)}
              {count != null
                ? ' · ' + count + (demo ? ' pending (demo)' : ' pending')
                : ''}
            </small>
          </span>
          <ChevronDown size={17} className="pb-fold-icon" />
        </button>
      </h3>
      {open && (
        <div className="pb-detail" id={'site-' + site.id}>
          <dl>
            <div>
              <dt>
                <Timer />
                Pending jobs
              </dt>
              <dd>
                {demo ? (
                  <>
                    <b>{count}</b> · simulated
                  </>
                ) : (
                  (count ?? 'Live count unavailable')
                )}
              </dd>
              {demo && (
                <dd>
                  <QueueEditor value={simulatedCount} onSave={onEditCount} />
                </dd>
              )}
            </div>
            {!demo && reading && (
              <div>
                <dt>
                  <Printer />
                  Reported device status
                </dt>
                <dd>
                  {reading.availability === 'unknown'
                    ? 'Not reported'
                    : reading.availability === 'available'
                      ? 'Available'
                      : 'Unavailable'}
                </dd>
              </div>
            )}
            {!demo && reading && (
              <div>
                <dt>
                  <Clock3 />
                  Status observed
                </dt>
                <dd>
                  <time dateTime={new Date(reading.observedAt).toISOString()}>
                    {new Intl.DateTimeFormat('en-GB', {
                      timeZone: 'Asia/Macau',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(reading.observedAt)}{' '}
                    (Macao)
                  </time>
                </dd>
              </div>
            )}
            <div>
              <dt>
                <Clock3 />
                Service availability
              </dt>
              <dd>{site.service}</dd>
            </div>
            <div>
              <dt>
                <Headphones />
                Support hours
              </dt>
              <dd>{site.support}</dd>
            </div>
            <div>
              <dt>
                <CreditCard />
                Payment
              </dt>
              <dd>{site.methodDetail || paymentNames[site.method]}</dd>
            </div>
            {site.units !== undefined && (
              <div>
                <dt>
                  <Printer />
                  Listed devices
                </dt>
                <dd>{site.units}</dd>
              </div>
            )}
          </dl>
          {site.access && (
            <p className="pb-access">
              <Info size={15} />
              {site.access}
            </p>
          )}
          <div className="pb-sources">
            <strong>Sources</strong>
            {site.sources.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                {source.label}
                <ArrowUpRight size={13} />
                <span className="pa-sr"> (opens in a new tab)</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}

export default function PrinterBrowser({
  selected,
  onSelect,
  filters,
  onFilters,
  demoCounts,
  onDemoCounts,
}: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null | undefined>(undefined)
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map')
  const resultsRef = useRef<HTMLHeadingElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [editNotice, setEditNotice] = useState('')
  const invalidExact =
    filters.length === 'exact' &&
    filters.exact !== '' &&
    parseQueueLength(filters.exact) === null
  const status = usePrinterStatus()
  const readings = status.enabled ? status.byId : undefined
  const hasReportedQueue =
    readings &&
    [...readings.values()].some((reading) => reading.pending !== null)
  const filtered = useMemo(
    () => matchSites(sites, filters, readings, demoCounts),
    [filters, readings, demoCounts],
  )
  const groups = useMemo(() => groupSites(filtered, sites), [filtered])
  const selectedGroup = groups.find((g) => g.building === selected)
  const activeFilters =
    Number(filters.method !== 'all') +
    Number(filters.hours !== 'all') +
    Number(filters.queue === 'demo') +
    Number(filters.length !== 'all')
  const hasFilters = !!filters.query || !!activeFilters
  const focusedEntry =
    selectedGroup?.entries.find((e) => e.id === expanded)?.id ??
    (expanded === null ? null : selectedGroup?.entries[0]?.id)
  const lastSelected = useRef(selected)
  useEffect(() => {
    setExpanded(undefined)
    // Follow Back/Forward between a building and the full register.
    if (selected) setMobileView('list')
    if (selected !== lastSelected.current) {
      lastSelected.current = selected
      if (!document.activeElement?.closest('.pb-toolbar'))
        requestAnimationFrame(() =>
          resultsRef.current?.focus({ preventScroll: true }),
        )
    }
  }, [selected])
  function setFilter<K extends keyof BrowseFilters>(
    key: K,
    value: BrowseFilters[K],
  ) {
    const next = { ...filters, [key]: value }
    setEditNotice('')
    if (key === 'queue') {
      next.length = 'all'
      next.exact = ''
    }
    onFilters(next)
    if (
      selected &&
      !matchSites(sites, next, readings, demoCounts).some(
        (item) => item.building === selected,
      )
    )
      onSelect(null)
  }
  function saveDemoCount(site: PrinterSite, value: number) {
    const next = new Map(demoCounts).set(site.id, value)
    onDemoCounts(next)
    const matches = matchSites(sites, filters, readings, next)
    if (!matches.some((item) => item.id === site.id)) {
      setEditNotice(
        `${site.building} · ${site.location}: saved ${value} pending jobs. This listing is outside the current filter.`,
      )
      if (!matches.some((item) => item.building === selected)) onSelect(null)
      else
        requestAnimationFrame(() =>
          resultsRef.current?.focus({ preventScroll: true }),
        )
    } else setEditNotice('')
  }
  function reset() {
    setEditNotice('')
    onFilters({ ...initialFilters })
    onSelect(null)
    searchRef.current?.focus({ preventScroll: true })
  }
  function selectBuilding(code: string) {
    setMobileView('list')
    onSelect(code)
    if (window.matchMedia('(max-width: 800px)').matches)
      requestAnimationFrame(() =>
        document.getElementById('pb-list')?.scrollIntoView({ block: 'start' }),
      )
  }
  return (
    <section className="pb-page" aria-labelledby="pb-title">
      <header className="pb-header">
        <div>
          <h1 id="pb-title">Find a printer</h1>
          <p>
            Explore campus locations, check service hours and choose how to pay.
          </p>
        </div>
        <a
          className="pb-emap"
          href="https://map.um.edu.mo/"
          target="_blank"
          rel="noreferrer"
        >
          <MapPin size={15} />
          Official UM eMap
          <ArrowUpRight size={14} />
          <span className="pa-sr"> (opens in a new tab)</span>
        </a>
      </header>
      <section className="pb-toolbar" aria-label="Search and filter printers">
        <div className="pb-searchrow">
          <label className="pb-search">
            <Search size={18} />
            <span className="pa-sr">Search printers</span>
            <input
              type="search"
              ref={searchRef}
              value={filters.query}
              placeholder="Building, floor or room"
              onChange={(e) => setFilter('query', e.target.value)}
            />
          </label>
          <button
            type="button"
            className="pb-filter-button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            aria-controls="pb-filter-controls"
          >
            <SlidersHorizontal size={16} />
            Filters{activeFilters > 0 ? ' (' + activeFilters + ')' : ''}
          </button>
        </div>
        <div
          className={'pb-controls' + (filtersOpen ? ' pb-controls-open' : '')}
          id="pb-filter-controls"
        >
          <label>
            Payment method
            <select
              value={filters.method}
              onChange={(e) =>
                setFilter('method', e.target.value as BrowseFilters['method'])
              }
            >
              <option value="all">All methods</option>
              <option value="quota">Printing quota</option>
              <option value="macaupass">Macau Pass</option>
              <option value="unknown">Payment unlisted</option>
            </select>
          </label>
          <label>
            Service hours
            <select
              value={filters.hours}
              onChange={(e) =>
                setFilter('hours', e.target.value as BrowseFilters['hours'])
              }
            >
              <option value="all">All schedules</option>
              <option value="24h">24-hour service</option>
              <option value="scheduled">Location schedule</option>
              <option value="unknown">Hours unlisted</option>
            </select>
          </label>
          <label>
            Queue data
            <select
              value={filters.queue}
              onChange={(e) =>
                setFilter('queue', e.target.value as BrowseFilters['queue'])
              }
            >
              <option value="actual">Campus information</option>
              <option value="demo">Simulated counts</option>
            </select>
          </label>
          {(filters.queue === 'demo' ||
            hasReportedQueue ||
            (status.enabled && filters.length !== 'all')) && (
            <label>
              {filters.queue === 'demo'
                ? 'Demo queue length'
                : 'Reported queue length'}
              <select
                value={filters.length}
                onChange={(e) =>
                  setFilter('length', e.target.value as BrowseFilters['length'])
                }
              >
                <option value="all">Any length</option>
                <option value="empty">0 jobs</option>
                <option value="short">1–3 jobs</option>
                <option value="busy">4+ jobs</option>
                <option value="exact">Exact count…</option>
              </select>
            </label>
          )}
          {filters.length === 'exact' && (
            <label htmlFor="exact-pending-count">
              Exact count (0–100)
              <input
                id="exact-pending-count"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="0–100"
                value={filters.exact}
                aria-invalid={invalidExact}
                aria-describedby={
                  invalidExact ? 'exact-pending-error' : undefined
                }
                onChange={(e) => setFilter('exact', e.target.value)}
              />
            </label>
          )}
        </div>
        {invalidExact && (
          <p className="pb-filter-error" role="status" id="exact-pending-error">
            Enter a whole number from 0 to 100 to apply the exact filter.
          </p>
        )}
      </section>
      {editNotice && (
        <p className="pb-edit-notice" role="status">
          {editNotice}
        </p>
      )}
      {filters.queue === 'demo' && (
        <p className="pb-demo-flag">
          <Info size={15} />
          <span>Simulated queue counts · for demonstration only</span>
        </p>
      )}
      <div className="pb-statusline">
        <span role="status" aria-live="polite">
          {plural(filtered.length, 'listing')} in{' '}
          {plural(groups.length, 'building')}
        </span>
        {hasFilters && (
          <button onClick={reset}>
            <X size={13} />
            Clear filters
          </button>
        )}
      </div>
      <div className="pb-mobile-switch" role="group" aria-label="Browse view">
        <button
          aria-pressed={mobileView === 'map'}
          onClick={() => setMobileView('map')}
        >
          <Layers3 size={16} />
          Map
        </button>
        <button
          aria-pressed={mobileView === 'list'}
          onClick={() => setMobileView('list')}
        >
          <List size={16} />
          Locations
        </button>
      </div>
      <div className={'pb-grid pb-show-' + mobileView}>
        <div className="pb-mapcol">
          <CampusMap
            groups={groups}
            selected={selectedGroup?.building ?? null}
            onSelect={selectBuilding}
          />
        </div>
        <section
          className="pb-list"
          id="pb-list"
          aria-label="Matching printer locations"
        >
          {selectedGroup ? (
            <>
              <div className="pb-list-head pb-selected-head">
                <button
                  type="button"
                  className="pb-back"
                  onClick={() => onSelect(null)}
                >
                  <ArrowLeft size={15} />
                  All locations
                </button>
                <span className="pb-building-code">
                  {selectedGroup.building}
                </span>
                <h2 tabIndex={-1} ref={resultsRef}>
                  {selectedGroup.buildingName}
                </h2>
                <p>
                  {plural(selectedGroup.count, 'matching listing')}
                  {selectedGroup.devices !== null
                    ? ' · ' + plural(selectedGroup.devices, 'listed device')
                    : ''}
                </p>
              </div>
              <div className="pb-entries">
                {selectedGroup.entries.map((site) => (
                  <SiteCard
                    key={site.id}
                    site={site}
                    reading={readings?.get(site.id)}
                    open={focusedEntry === site.id}
                    demo={filters.queue === 'demo'}
                    simulatedCount={demoPending(site.id, demoCounts)}
                    onEditCount={(value) => saveDemoCount(site, value)}
                    onToggle={() =>
                      setExpanded(focusedEntry === site.id ? null : site.id)
                    }
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="pb-list-head">
                <h2 tabIndex={-1} ref={resultsRef}>
                  Printer locations
                </h2>
                <p>Select a building for rooms and printer details.</p>
              </div>
              {groups.length > 0 ? (
                <ul className="pb-buildings">
                  {groups.map((group) => (
                    <li key={group.building}>
                      <button
                        type="button"
                        onClick={() => selectBuilding(group.building)}
                        aria-label={
                          group.building +
                          ' ' +
                          group.buildingName +
                          ', ' +
                          plural(group.count, 'location')
                        }
                      >
                        <span className="pb-code">{group.building}</span>
                        <span className="pb-building-text">
                          <strong>{group.buildingName}</strong>
                          <small>
                            {plural(group.count, 'listing')} ·{' '}
                            {[
                              ...new Set(
                                group.entries.map(
                                  (entry) => paymentNames[entry.method],
                                ),
                              ),
                            ].join(' / ')}
                          </small>
                        </span>
                        <ChevronRight size={17} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="pb-empty">
                  <Search size={23} />
                  <h3>No matching locations</h3>
                  <p>Try a building code such as E6, or change a filter.</p>
                </div>
              )}
            </>
          )}
        </section>
      </div>
      {groups.length === 0 && mobileView === 'map' && (
        <p className="pb-empty-mobile">
          No locations match this search. Change a filter or clear the search.
        </p>
      )}
      <p
        className={
          'pb-data-note' + (filters.queue === 'demo' ? ' pb-demo' : '')
        }
      >
        {filters.queue === 'demo' ? <Info size={17} /> : <WifiOff size={17} />}
        <span>
          {filters.queue === 'demo' ? (
            <>
              <strong>Demo queues.</strong> Counts are fictional examples for
              this prototype.
            </>
          ) : status.byId.size > 0 ? (
            <>
              <strong>Recent operator readings.</strong> Counts and device
              status appear where reported. Check the observation time in
              printer details.
            </>
          ) : (
            <>
              <strong>
                Live queue counts and device status are unavailable.
              </strong>{' '}
              Listed hours describe scheduled access. Select simulated counts to
              try queue filtering.
            </>
          )}
        </span>
      </p>
    </section>
  )
}
