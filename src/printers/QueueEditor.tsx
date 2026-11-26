import { useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { Pencil } from 'lucide-react'
import { parseQueueLength } from './browse'
import './queue-editor.css'

export default function QueueEditor({
  value,
  onSave,
}: {
  value: number
  onSave: (value: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [notice, setNotice] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef(false)
  const id = useId()
  const count = parseQueueLength(draft)
  const invalid = attempted && count === null

  useLayoutEffect(() => {
    if (editing) {
      input.current?.focus({ preventScroll: true })
      input.current?.select()
    } else if (restoreFocus.current) {
      trigger.current?.focus({ preventScroll: true })
      restoreFocus.current = false
    }
  }, [editing])

  function close() {
    restoreFocus.current = true
    setEditing(false)
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (count === null) {
      setAttempted(true)
      input.current?.focus({ preventScroll: true })
      return
    }
    onSave(count)
    setNotice(
      `Demo queue updated to ${count} pending ${count === 1 ? 'job' : 'jobs'}.`,
    )
    close()
  }

  return (
    <div className="pb-queue-editor">
      <span className="pa-sr" role="status">
        {notice}
      </span>
      {editing ? (
        <form
          noValidate
          onSubmit={save}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              close()
            }
          }}
        >
          <label htmlFor={id}>Pending jobs (0–100)</label>
          <div className="pb-queue-actions">
            <input
              id={id}
              ref={input}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-invalid={invalid}
              aria-describedby={invalid ? id + '-error' : undefined}
            />
            <button type="submit" className="pb-queue-save">
              Save count
            </button>
            <button type="button" onClick={close}>
              Cancel
            </button>
          </div>
          {invalid && (
            <p id={id + '-error'} role="alert">
              Enter a whole number from 0 to 100.
            </p>
          )}
        </form>
      ) : (
        <button
          ref={trigger}
          type="button"
          className="pb-queue-edit"
          onClick={() => {
            setNotice('')
            setDraft(String(value))
            setAttempted(false)
            setEditing(true)
          }}
        >
          <Pencil size={14} aria-hidden="true" />
          Edit demo count
        </button>
      )}
    </div>
  )
}
