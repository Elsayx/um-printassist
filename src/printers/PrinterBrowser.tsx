import { t, countLabel, getLanguage } from '../i18n'
import { useLanguage } from '../i18n/useLanguage'
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
import StudentScenario from './StudentScenario'
import { sites, type PrinterSite } from './directory'
import {
  distributeStudents,
  groupSites,
  initialFilters,
  matchSites,
  paymentNames,
  type BrowseFilters,
} from './browse'
import { usePrinterStatus } from './status'
import type { StationReading } from './status'
import './browse.css'

type Props = {
  selected: string | null
  onSelect: (code: string | null) => void
  studentTotal: number
  onStudentTotal: (total: number) => void
  filters: BrowseFilters
  onFilters: (next: BrowseFilters) => void
}
const plural = countLabel
const methodLabel = (site: PrinterSite) =>
  site.method === 'quota'
    ? t('Follow-You · Printing quota')
    : t(paymentNames[site.method])

// Add translated place names without changing the directory's existing search rules.
const normalizeSearch = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim()
function matchLocalizedSites(directory: PrinterSite[], filters: BrowseFilters) {
  const original = new Set(matchSites(directory, filters).map(site => site.id))
  if (!filters.query.trim() || getLanguage() === 'en') return directory.filter(site => original.has(site.id))
  const query = normalizeSearch(filters.query)
  return matchSites(directory, { ...filters, query: '' }).filter(site =>
    original.has(site.id) || normalizeSearch(t(site.buildingName) + ' ' + t(site.location)).includes(query),
  )
}

function SiteCard({
  site,
  demo,
  simulatedCount,
  reading,
  open,
  onToggle,
}: {
  site: PrinterSite
  demo: boolean
  simulatedCount: number
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
            <strong>{t(site.location)}</strong>
            <small>
              <CreditCard size={13} />
              {methodLabel(site)}
              {count != null
                ? ' · ' + t(demo ? '{count} pending (demo)' : '{count} pending', { count })
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
                <Timer />{t("Pending jobs")}</dt>
              <dd>
                {demo ? (
                  <>
                    <b>{count}</b>{t(" · simulated")}</>
                ) : (
                  (count ?? t('Live count unavailable'))
                )}
              </dd>
            </div>
            {!demo && reading && (
              <div>
                <dt>
                  <Printer />{t("Reported device status")}</dt>
                <dd>
                  {reading.availability === 'unknown'
                    ? t('Not reported')
                    : reading.availability === 'available'
                      ? t('Available')
                      : t('Unavailable')}
                </dd>
              </div>
            )}
            {!demo && reading && (
              <div>
                <dt>
                  <Clock3 />{t("Status observed")}</dt>
                <dd>
                  <time dateTime={new Date(reading.observedAt).toISOString()}>
                    {new Intl.DateTimeFormat(getLanguage() === 'en' ? 'en-GB' : getLanguage(), {
                      timeZone: 'Asia/Macau',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(reading.observedAt)}{' '}{t("(Macao)")}</time>
                </dd>
              </div>
            )}
            <div>
              <dt>
                <Clock3 />{t("Service availability")}</dt>
              <dd>{t(site.service)}</dd>
            </div>
            <div>
              <dt>
                <Headphones />{t("Support hours")}</dt>
              <dd>{t(site.support)}</dd>
            </div>
            <div>
              <dt>
                <CreditCard />{t("Payment")}</dt>
              <dd>{t(site.methodDetail || paymentNames[site.method])}</dd>
            </div>
            {site.units !== undefined && (
              <div>
                <dt>
                  <Printer />{t("Listed devices")}</dt>
                <dd>{site.units}</dd>
              </div>
            )}
          </dl>
          {site.access && (
            <p className="pb-access">
              <Info size={15} />
              {t(site.access)}
            </p>
          )}
          <div className="pb-sources">
            <strong>{t("Sources")}</strong>
            {site.sources.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                {t(source.label)}
                <ArrowUpRight size={13} />
                <span className="pa-sr">{t(" (opens in a new tab)")}</span>
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
  studentTotal,
  onStudentTotal,
}: Props) {
  const language = useLanguage()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null | undefined>(undefined)
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map')
  const resultsRef = useRef<HTMLHeadingElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const status = usePrinterStatus()
  const simulated = filters.queue === 'demo'
  const allocation = useMemo(
    () => distributeStudents(sites, studentTotal),
    [studentTotal],
  )
  const filtered = useMemo(() => matchLocalizedSites(sites, filters), [filters, language])
  const groups = useMemo(
    () =>
      groupSites(filtered, sites).map((group) => ({
        ...group,
        students: group.entries.reduce(
          (sum, site) => sum + (allocation.get(site.id) ?? 0),
          0,
        ),
      })),
    [filtered, allocation],
  )
  const visibleStudents = groups.reduce((sum, group) => sum + group.students, 0)
  const selectedGroup = groups.find((group) => group.building === selected)
  const activeFilters =
    Number(filters.method !== 'all') + Number(filters.hours !== 'all')
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
    onFilters(next)
    if (
      selected &&
      !matchLocalizedSites(sites, next).some((item) => item.building === selected)
    )
      onSelect(null)
  }
  function reset() {
    onFilters({ ...initialFilters, queue: filters.queue })
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
          <p className="pa-eyebrow">{t("Campus directory")}</p>
          <h1 id="pb-title">{t("Find a printer")}</h1>
          <p>{t("Explore campus locations, check service hours and choose how to pay.")}</p>
        </div>
        <div className="pb-header-tools">
          <label className="pb-data-mode">{t("Queue data")}<select
              value={filters.queue}
              onChange={(e) =>
                setFilter('queue', e.target.value as BrowseFilters['queue'])
              }
            >
              <option value="actual">{t("Campus information")}</option>
              <option value="demo">{t("Simulated students")}</option>
            </select>
          </label>
          <a
            className="pb-emap"
            href="https://map.um.edu.mo/"
            target="_blank"
            rel="noreferrer"
          >
            <MapPin size={15} />{t("Official UM eMap")}<ArrowUpRight size={14} />
            <span className="pa-sr">{t(" (opens in a new tab)")}</span>
          </a>
        </div>
      </header>
      {simulated && (
        <StudentScenario total={studentTotal} onApply={onStudentTotal} />
      )}
      <section className="pb-toolbar" aria-label={t("Search and filter printers")}>
        <div className="pb-searchrow">
          <label className="pb-search">
            <Search size={18} />
            <span className="pa-sr">{t("Search printers")}</span>
            <input
              type="search"
              ref={searchRef}
              value={filters.query}
              placeholder={t("Building, floor or room")}
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
            <SlidersHorizontal size={16} />{t("Filters")}{activeFilters > 0 ? t(' (' + activeFilters + ')') : ''}
          </button>
        </div>
        <div
          className={'pb-controls' + (filtersOpen ? ' pb-controls-open' : '')}
          id="pb-filter-controls"
        >
          <label>{t("Payment method")}<select
              value={filters.method}
              onChange={(e) =>
                setFilter('method', e.target.value as BrowseFilters['method'])
              }
            >
              <option value="all">{t("All methods")}</option>
              <option value="quota">{t("Printing quota")}</option>
              <option value="macaupass">{t("Macau Pass")}</option>
              <option value="unknown">{t("Payment unlisted")}</option>
            </select>
          </label>
          <label>{t("Service hours")}<select
              value={filters.hours}
              onChange={(e) =>
                setFilter('hours', e.target.value as BrowseFilters['hours'])
              }
            >
              <option value="all">{t("All schedules")}</option>
              <option value="24h">{t("24-hour service")}</option>
              <option value="scheduled">{t("Location schedule")}</option>
              <option value="unknown">{t("Hours unlisted")}</option>
            </select>
          </label>
        </div>
      </section>
      <div className="pb-statusline">
        <span role="status" aria-live="polite">
          {plural(filtered.length, 'listing')}{t(" in")}{' '}
          {plural(groups.length, 'building')}
          {simulated && (
            <>
              {' '}
              · <strong>{plural(studentTotal, 'student')}{t(" campus-wide")}</strong>
              {filtered.length !== sites.length && (
                <>
                  {' '}
                  · {plural(visibleStudents, 'student')}{t(" in matching listings")}</>
              )}
            </>
          )}
        </span>
        {hasFilters && (
          <button onClick={reset}>
            <X size={13} />{t("Clear filters")}</button>
        )}
      </div>
      <div className="pb-mobile-switch" role="group" aria-label={t("Browse view")}>
        <button
          aria-pressed={mobileView === 'map'}
          onClick={() => setMobileView('map')}
        >
          <Layers3 size={16} />{t("Map")}</button>
        <button
          aria-pressed={mobileView === 'list'}
          onClick={() => setMobileView('list')}
        >
          <List size={16} />{t("Locations")}</button>
      </div>
      <div className={'pb-grid pb-show-' + mobileView}>
        <div className="pb-mapcol">
          <CampusMap
            simulated={simulated}
            groups={groups}
            selected={selectedGroup?.building ?? null}
            onSelect={selectBuilding}
          />
        </div>
        <section
          className="pb-list"
          id="pb-list"
          aria-label={t("Matching printer locations")}
        >
          {selectedGroup ? (
            <>
              <div className="pb-list-head pb-selected-head">
                <button
                  type="button"
                  className="pb-back"
                  onClick={() => onSelect(null)}
                >
                  <ArrowLeft size={15} />{t("All locations")}</button>
                <span className="pb-building-code">
                  {selectedGroup.building}
                </span>
                <h2 tabIndex={-1} ref={resultsRef}>
                  {t(selectedGroup.buildingName)}
                </h2>
                <p>
                  {plural(selectedGroup.count, 'matching listing')}
                  {simulated &&
                    ' · ' + plural(selectedGroup.students, 'simulated student')}
                  {selectedGroup.devices !== null
                    ? t(' · ' + plural(selectedGroup.devices, 'listed device'))
                    : ''}
                </p>
              </div>
              <div className="pb-entries">
                {selectedGroup.entries.map((site) => (
                  <SiteCard
                    key={site.id}
                    site={site}
                    reading={status.byId.get(site.id)}
                    open={focusedEntry === site.id}
                    demo={simulated}
                    simulatedCount={allocation.get(site.id) ?? 0}
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
                <h2 tabIndex={-1} ref={resultsRef}>{t("Printer locations")}</h2>
                <p>{t("Select a building for rooms and printer details.")}</p>
              </div>
              {groups.length > 0 ? (
                <ul className="pb-buildings">
                  {groups.map((group) => (
                    <li key={group.building}>
                      <button
                        type="button"
                        onClick={() => selectBuilding(group.building)}
                        aria-label={
                          t(group.building +
                          ' ' +
                          t(group.buildingName) +
                          ', ' +
                          plural(group.count, 'location') +
                          (simulated
                            ? ', ' + plural(group.students, 'simulated student')
                            : ''))
                        }
                      >
                        <span className="pb-code">{group.building}</span>
                        <span className="pb-building-text">
                          <strong>{t(group.buildingName)}</strong>
                          <small>
                            {simulated && (
                              <>
                                <strong>
                                  {plural(group.students, 'student')}
                                </strong>{' '}
                                ·{' '}
                              </>
                            )}
                            {plural(group.count, 'listing')} ·{' '}
                            {[
                              ...new Set(
                                group.entries.map(
                                  (entry) => t(paymentNames[entry.method]),
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
                  <h3>{t("No matching locations")}</h3>
                  <p>{t("Try a building code such as E6, or change a filter.")}</p>
                </div>
              )}
            </>
          )}
        </section>
      </div>
      {groups.length === 0 && mobileView === 'map' && (
        <p className="pb-empty-mobile">{t("No locations match this search. Change a filter or clear the search.")}</p>
      )}
      <p className="pb-data-note">
        {simulated ? <Info size={17} /> : <WifiOff size={17} />}
        <span>
          {simulated ? (
            <>
              <strong>{t("Student simulation.")}</strong>{t(" Counts describe this scenario only. Actual demand on campus may differ.")}</>
          ) : status.byId.size > 0 ? (
            <>
              <strong>{t("Recent operator readings.")}</strong>{t(" Counts and device status appear where reported. Check the observation time in printer details.")}</>
          ) : (
            <>
              <strong>{t("Live queue counts and device status are unavailable.")}</strong>{' '}{t("Listed hours describe scheduled access. Choose Simulated students to explore campus demand.")}</>
          )}
        </span>
      </p>
    </section>
  )
}
