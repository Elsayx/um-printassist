import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Users } from 'lucide-react'
import { parseStudentTotal } from './browse'
import './student-scenario.css'

export default function StudentScenario({
  total,
  onApply,
}: {
  total: number
  onApply: (value: number) => void
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(String(total))
  const [attempted, setAttempted] = useState(false)
  useEffect(() => {
    setDraft(String(total))
    setAttempted(false)
  }, [total])

  const value = parseStudentTotal(draft)
  const invalid = attempted && value === null

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (value === null) {
      setAttempted(true)
      input.current?.focus()
      return
    }
    onApply(value)
    setDraft(String(value))
    setAttempted(false)
  }

  return (
    <form
      className="pb-student-scenario"
      noValidate
      onSubmit={apply}
      aria-label="Campus usage simulation"
    >
      <div className="pb-scenario-copy">
        <label htmlFor={id}>
          <Users size={17} aria-hidden="true" />
          Total simulated students
        </label>
        <p id={id + '-hint'}>
          Enter 0–100 students. Each adds one pending job to a campus printer
          queue.
        </p>
      </div>
      <div className="pb-scenario-actions">
        <input
          id={id}
          ref={input}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-invalid={invalid}
          aria-describedby={id + '-hint' + (invalid ? ' ' + id + '-error' : '')}
        />
        <button type="submit">Apply total</button>
      </div>
      {invalid && (
        <p id={id + '-error'} role="alert" className="pb-scenario-message">
          Enter a whole number from 0 to 100.
        </p>
      )}
      {value !== total && (
        <p className="pb-scenario-current">
          Showing {total} {total === 1 ? 'student' : 'students'} until you apply
          the new total.
        </p>
      )}
    </form>
  )
}
