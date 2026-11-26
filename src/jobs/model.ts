/** A job records only the simulator's evidence. Release/printing are never observed. */
export type Outcome = 'confirmed' | 'pending' | 'unconfirmed' | 'failed'
export type JobState = 'submitting' | Outcome
export interface Job {
  id: string
  name: string
  summary: string
  state: JobState
  submittedAt: number
  eventAt: number
  checkedAt: number | null
  checks: number
  /** A scheduled simulator reply; meaningful only while submitting. */
  reply?: { outcome: Outcome; due: number }
}

const REPLY_DELAY = 850

export function seedJobs(): Job[] {
  // Fixed synthetic timestamps and IDs keep both formal tasks reproducible.
  const base = Date.UTC(2026, 10, 23, 2, 15)
  return [
    {
      id: 'DEMO-1042',
      name: 'lecture_notes.pdf',
      summary: 'A4 · Portrait · One-sided · 1 copy',
      state: 'unconfirmed',
      submittedAt: base,
      eventAt: base + 1000,
      checkedAt: null,
      checks: 0,
    },
    {
      id: 'DEMO-1041',
      name: 'group_report.pdf',
      summary: 'A4 · Portrait · Two-sided, long edge · 1 copy',
      state: 'confirmed',
      submittedAt: base - 900000,
      eventAt: base - 899000,
      checkedAt: null,
      checks: 0,
    },
  ]
}

export function newJob(
  jobs: Job[],
  name: string,
  summary: string,
  outcome: Outcome,
  now: number,
): Job {
  const highest = jobs.reduce(
    (max, job) => Math.max(max, Number(job.id.slice(5))),
    1042,
  )
  return {
    id: 'DEMO-' + (highest + 1),
    name,
    summary,
    state: 'submitting',
    submittedAt: now,
    eventAt: now,
    checkedAt: null,
    checks: 0,
    reply: { outcome, due: now + REPLY_DELAY },
  }
}

export function resolveJobs(jobs: Job[], now: number): Job[] {
  return jobs.map((job) => {
    if (job.state !== 'submitting' || !job.reply || job.reply.due > now)
      return job
    const { reply, ...record } = job
    return { ...record, state: reply.outcome, eventAt: reply.due }
  })
}

export function checkJob(jobs: Job[], id: string, now: number): Job[] {
  // Checking an uncertain submission never dispatches a new one.
  return jobs.map((job) =>
    job.id === id && (job.state === 'unconfirmed' || job.state === 'pending')
      ? { ...job, checkedAt: now, checks: job.checks + 1 }
      : job,
  )
}

export function retryJob(jobs: Job[], id: string, now: number): Job[] {
  return jobs.map((job) =>
    job.id === id && job.state === 'failed'
      ? {
          ...job,
          state: 'submitting',
          eventAt: now,
          checkedAt: null,
          checks: 0,
          reply: { outcome: 'confirmed', due: now + REPLY_DELAY },
        }
      : job,
  )
}

const outcomes: Outcome[] = ['confirmed', 'pending', 'unconfirmed', 'failed']

export function readJobs(serialized: string | null): Job[] {
  if (!serialized) return seedJobs()
  try {
    const entries: unknown = JSON.parse(serialized)
    if (
      !Array.isArray(entries) ||
      !entries.some((item) => item?.id === 'DEMO-1042')
    )
      return seedJobs()
    const ids = new Set<string>()
    for (const item of entries) {
      if (
        !item ||
        typeof item !== 'object' ||
        !/^DEMO-\d{4,9}$/.test(item.id) ||
        ids.has(item.id) ||
        typeof item.name !== 'string' ||
        typeof item.summary !== 'string' ||
        !Number.isFinite(item.submittedAt) ||
        !Number.isFinite(item.eventAt) ||
        !(item.checkedAt === null || Number.isFinite(item.checkedAt)) ||
        !Number.isInteger(item.checks) ||
        item.checks < 0 ||
        !(
          outcomes.includes(item.state) ||
          (item.state === 'submitting' &&
            item.reply &&
            outcomes.includes(item.reply.outcome) &&
            Number.isFinite(item.reply.due))
        )
      )
        return seedJobs()
      ids.add(item.id)
    }
    return entries
  } catch {
    return seedJobs()
  }
}
