import { useCallback, useEffect, useRef, useState } from 'react'
import {
  checkJob,
  newJob,
  readJobs,
  resolveJobs,
  retryJob,
  seedJobs,
  type Job,
  type Outcome,
} from './model'

const STORAGE_KEY = 'um-printassist.jobs.v1'

function loadJobs(): Job[] {
  try {
    return resolveJobs(
      readJobs(window.sessionStorage.getItem(STORAGE_KEY)),
      Date.now(),
    )
  } catch {
    return seedJobs()
  }
}

export function useJobs() {
  const [jobs, setJobs] = useState(loadJobs)
  const current = useRef(jobs)

  const update = useCallback((next: Job[]) => {
    current.current = next
    setJobs(next)
    // Browsers that restrict storage can still use the in-memory simulator.
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* memory only */
    }
  }, [])

  useEffect(() => {
    const due = jobs.reduce(
      (next, job) => (job.reply ? Math.min(next, job.reply.due) : next),
      Infinity,
    )
    if (!Number.isFinite(due)) return
    const timer = window.setTimeout(
      () => update(resolveJobs(current.current, Date.now())),
      Math.max(0, due - Date.now()),
    )
    return () => window.clearTimeout(timer)
  }, [jobs, update])

  const submit = useCallback(
    (name: string, summary: string, outcome: Outcome = 'confirmed') => {
      const list = current.current
      const inFlight = list.find(
        (job) =>
          job.state === 'submitting' &&
          job.name === name &&
          job.summary === summary,
      )
      if (inFlight) return inFlight.id
      const job = newJob(list, name, summary, outcome, Date.now())
      update([job, ...list])
      return job.id
    },
    [update],
  )
  const reset = useCallback(() => update(seedJobs()), [update])
  const check = useCallback(
    (id: string) => update(checkJob(current.current, id, Date.now())),
    [update],
  )
  const retry = useCallback(
    (id: string) => update(retryJob(current.current, id, Date.now())),
    [update],
  )
  return { jobs, submit, reset, check, retry }
}
