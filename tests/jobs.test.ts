import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  seedJobs,
  readJobs,
  newJob,
  checkJob,
  retryJob,
  resolveJobs,
  type Outcome,
} from '../src/jobs/model'

test('a new session has a stable interrupted job; rechecking it returns no receipt or new job', () => {
  const jobs = seedJobs()
  const next = checkJob(jobs, 'DEMO-1042', 1000)
  const checked = checkJob(next, 'DEMO-1042', 2000)
  assert.deepEqual(
    checked.map((job) => job.id),
    jobs.map((job) => job.id),
  )
  assert.equal(checked[0].state, 'unconfirmed')
  assert.equal(checked[0].checks, 2)
  assert.equal(checked[0].checkedAt, 2000)
  assert.equal(jobs[0].checks, 0)
  assert.equal(jobs[0].name, 'lecture_notes.pdf')
  assert.deepEqual(retryJob(checked, 'DEMO-1042', 3000), checked)
  assert.deepEqual(seedJobs(), jobs)
})

test('each simulator outcome starts with submitting, then the exact scheduled reply', () => {
  const outcomes: Outcome[] = ['confirmed', 'pending', 'unconfirmed', 'failed']
  let jobs = seedJobs()
  for (const outcome of outcomes) {
    const job = newJob(jobs, 'report.pdf', 'A4', outcome, 1000)
    jobs = [job, ...jobs]
    assert.equal(job.state, 'submitting')
    const due = job.reply!.due
    assert.equal(resolveJobs(jobs, due - 1)[0].state, 'submitting')
    jobs = resolveJobs(jobs, due)
    assert.equal(jobs[0].state, outcome)
    assert.equal(jobs[0].reply, undefined)
    assert.equal(jobs[0].eventAt, due)
  }
  assert.equal(new Set(jobs.map((job) => job.id)).size, jobs.length)
})

test('only a known failure allows a retry, preserving identity and enabling no second retry in flight', () => {
  const failed = newJob(seedJobs(), 'sample.pdf', 'A4', 'failed', 0)
  const jobs = resolveJobs([failed, ...seedJobs()], failed.reply!.due)
  const retried = retryJob(jobs, failed.id, 1000)
  assert.equal(retried[0].id, failed.id)
  assert.equal(retried[0].state, 'submitting')
  assert.deepEqual(retryJob(retried, failed.id, 1200), retried)
  const done = resolveJobs(retried, retried[0].reply!.due)
  assert.equal(done[0].state, 'confirmed')
  assert.deepEqual(retryJob(done, failed.id, 3000), done)
})

test('tab session can resume interrupted work or recover from bad storage', () => {
  const jobs = seedJobs()
  const pending = newJob(jobs, 'handout.pdf', 'A4', 'pending', 0)
  const saved = [pending, ...jobs]
  assert.deepEqual(readJobs(JSON.stringify(saved)), saved)
  const resumed = resolveJobs(readJobs(JSON.stringify(saved)), 10000)
  assert.equal(resumed[0].state, 'pending')
  assert.equal(checkJob(resumed, pending.id, 12000)[0].state, 'pending')
  for (const invalid of [
    null,
    'broken',
    '{}',
    '[]',
    '[null]',
    JSON.stringify([...jobs, jobs[0]]),
  ]) {
    assert.deepEqual(readJobs(invalid), jobs)
  }
})
