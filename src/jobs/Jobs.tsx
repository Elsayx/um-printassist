import { useEffect, useRef, useState, type RefObject } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileText,
  HelpCircle,
  LoaderCircle,
  RefreshCw,
  Send,
  Unplug,
  XCircle,
} from 'lucide-react'
import type { Job, JobState } from './model'
import './jobs.css'

const status = {
  confirmed: {
    label: 'Confirmed received',
    Icon: CheckCircle2,
    event: 'Receipt confirmed',
    body: 'The simulated service received this job. Release at a printer is a separate step.',
  },
  pending: {
    label: 'Pending',
    Icon: Clock3,
    event: 'Request is processing',
    body: 'The simulated service is processing the request. It hasn’t confirmed receipt for release yet.',
  },
  unconfirmed: {
    label: 'Unconfirmed',
    Icon: Unplug,
    event: 'Connection interrupted',
    body: 'The connection dropped before a receipt came back. The job may have reached the service.',
  },
  failed: {
    label: 'Failed',
    Icon: XCircle,
    event: 'Submission rejected',
    body: 'The simulated service rejected this attempt. It is safe to retry this job once.',
  },
  submitting: {
    label: 'Submitting',
    Icon: LoaderCircle,
    event: 'Waiting for a response',
    body: 'Sending your settings to the simulated queue. Keep this page open to see the response.',
  },
} satisfies Record<JobState, object>

const dateTime = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})
const clockTime = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
})

function Time({ value, short = false }: { value: number; short?: boolean }) {
  return (
    <time dateTime={new Date(value).toISOString()}>
      {(short ? clockTime : dateTime).format(value)}
    </time>
  )
}

function StateLabel({ state }: { state: JobState }) {
  const { Icon, label } = status[state]
  return (
    <span className={'job-chip job-tone-' + state}>
      <Icon size={15} aria-hidden="true" />
      {label}
    </span>
  )
}

export interface JobsProps {
  jobs: Job[]
  selected: string | null
  onSelect: (id: string | null) => void
  onCheck: (id: string) => void
  onRetry: (id: string) => void
  onWorkspace: () => void
}

function RecoveryHelp({ job }: { job: Job }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="job-help">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="job-recovery-help"
        onClick={() => setOpen(!open)}
        className="job-help-toggle"
      >
        <HelpCircle size={18} aria-hidden="true" />
        <span>What should I do next?</span>
        <ChevronDown
          size={17}
          aria-hidden="true"
          className={open ? 'job-turn' : ''}
        />
      </button>
      {open && (
        <div id="job-recovery-help" className="job-help-body">
          <p>
            For a real campus job, check your printing queue for{' '}
            <strong>{job.name}</strong>. If you still can’t identify it, ask the
            ICTO Help Desk before sending another copy.
          </p>
          <a
            href="https://icto.um.edu.mo/printing/follow-you-student-printing/"
            target="_blank"
            rel="noreferrer"
          >
            ICTO printing guide <ExternalLink size={14} aria-hidden="true" />
            <span className="job-sr">
              {' '}
              (opens in a new tab; internet required)
            </span>
          </a>
        </div>
      )}
    </div>
  )
}

function JobDetail({
  job,
  heading,
  onSelect,
  onCheck,
  onRetry,
  onWorkspace,
}: Pick<JobsProps, 'onSelect' | 'onCheck' | 'onRetry' | 'onWorkspace'> & {
  job: Job
  heading: RefObject<HTMLHeadingElement | null>
}) {
  const { Icon, label, event, body } = status[job.state]
  const recheckable = job.state === 'unconfirmed' || job.state === 'pending'
  return (
    <>
      <button type="button" className="job-back" onClick={() => onSelect(null)}>
        <ArrowLeft size={17} aria-hidden="true" />
        All print jobs
      </button>
      <div className="job-heading">
        <h1 ref={heading} tabIndex={-1} id="job-title">
          Job details
        </h1>
      </div>
      <div className="job-detail-grid">
        <article className="job-card">
          <header className="job-file">
            <span className="job-file-ico">
              <FileText size={23} aria-hidden="true" />
            </span>
            <div>
              <h2>{job.name}</h2>
              <span className="job-id">{job.id}</span>
            </div>
          </header>
          <div className="job-card-body">
            <div className={'job-statebox job-tone-' + job.state}>
              <Icon size={22} aria-hidden="true" />
              <div role="status">
                <h3>{label}</h3>
                <p>{body}</p>
              </div>
            </div>
            <dl className="job-facts">
              <div>
                <dt>Submission attempt</dt>
                <dd>
                  <Time value={job.submittedAt} />
                </dd>
              </div>
              <div>
                <dt>Last known event</dt>
                <dd>
                  {event} · <Time value={job.eventAt} short />
                </dd>
              </div>
              <div>
                <dt>Print settings</dt>
                <dd>{job.summary}</dd>
              </div>
            </dl>
          </div>
        </article>
        <section className="job-card job-next" aria-label="Next steps">
          <h2>Next steps</h2>
          {recheckable && (
            <>
              <p>
                {job.state === 'unconfirmed'
                  ? 'Check for a receipt before trying again. Resending now could create a duplicate.'
                  : 'Give the service time to respond. You can check this job again without submitting another copy.'}
              </p>
              <button
                type="button"
                className="job-primary"
                onClick={() => onCheck(job.id)}
              >
                <RefreshCw size={17} aria-hidden="true" />
                Check again
              </button>
              <p
                role="status"
                aria-atomic="true"
                className="job-check-feedback"
              >
                {job.checkedAt !== null && (
                  <>
                    Check {job.checks} · <Time value={job.checkedAt} short />.{' '}
                    {job.state === 'unconfirmed'
                      ? 'Still unconfirmed. No receipt has arrived.'
                      : 'Still pending. No release confirmation yet.'}
                  </>
                )}
              </p>
              <RecoveryHelp job={job} />
            </>
          )}
          {job.state === 'confirmed' && (
            <>
              <p>
                In a real Follow-You queue, you would identify the document at a
                printer and release it there. This simulation ends at receipt
                and sends nothing to a printer.
              </p>
              <button
                type="button"
                className="job-primary"
                onClick={onWorkspace}
              >
                Back to workspace
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </>
          )}
          {job.state === 'failed' && (
            <>
              <p>
                Retry this failed attempt to request a new simulated receipt for
                the same job ID.
              </p>
              <button
                type="button"
                className="job-primary"
                onClick={() => {
                  heading.current?.focus()
                  onRetry(job.id)
                }}
              >
                <Send size={17} aria-hidden="true" />
                Retry submission
              </button>
            </>
          )}
          {job.state === 'submitting' && (
            <p>
              The job status will update automatically when the simulated
              service responds.
            </p>
          )}
        </section>
      </div>
    </>
  )
}

export default function Jobs({
  jobs,
  selected,
  onSelect,
  onCheck,
  onRetry,
  onWorkspace,
}: JobsProps) {
  const heading = useRef<HTMLHeadingElement>(null)
  const previous = useRef<string | null>(null)
  const rowButtons = useRef(new Map<string, HTMLButtonElement>())
  useEffect(() => {
    if (
      !selected &&
      previous.current &&
      rowButtons.current.has(previous.current)
    ) {
      rowButtons.current.get(previous.current)?.focus()
    } else {
      heading.current?.focus({ preventScroll: true })
    }
    previous.current = selected
  }, [selected])
  const job = jobs.find((item) => item.id === selected)
  return (
    <section className="jobs-screen" aria-labelledby="job-title">
      {selected && job ? (
        <JobDetail
          key={job.id}
          job={job}
          heading={heading}
          onCheck={onCheck}
          onRetry={onRetry}
          onSelect={onSelect}
          onWorkspace={onWorkspace}
        />
      ) : selected ? (
        <>
          <h1 ref={heading} tabIndex={-1} id="job-title">
            Job unavailable
          </h1>
          <p>This job is no longer in this session.</p>
          <button
            className="job-primary"
            type="button"
            onClick={() => onSelect(null)}
          >
            All print jobs
          </button>
        </>
      ) : (
        <>
          <div className="job-heading">
            <h1 ref={heading} tabIndex={-1} id="job-title">
              Print jobs
            </h1>
            <p>Check the status of a simulated submission.</p>
          </div>
          <div className="job-card job-list">
            <header>
              <h2>Recent jobs</h2>
              <span>
                {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
              </span>
            </header>
            <ul>
              {jobs.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    ref={(element) => {
                      if (element) rowButtons.current.set(entry.id, element)
                      else rowButtons.current.delete(entry.id)
                    }}
                    className="job-row"
                    onClick={() => onSelect(entry.id)}
                  >
                    <span className="job-file-ico">
                      <FileText size={22} aria-hidden="true" />
                    </span>
                    <span className="job-row-name">
                      <strong>{entry.name}</strong>
                      <span>
                        <span className="job-id">{entry.id}</span>
                        <span className="job-sep" aria-hidden="true">
                          {' '}
                          ·{' '}
                        </span>
                        <Time value={entry.submittedAt} />
                      </span>
                    </span>
                    <StateLabel state={entry.state} />
                    <ChevronRight
                      size={18}
                      aria-hidden="true"
                      className="job-row-arrow"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  )
}
