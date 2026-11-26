import { t } from './i18n'
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
export default function Dialog({
  title,
  children,
  close,
}: {
  title: string
  children: ReactNode
  close: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const dismiss = useRef(close)
  useLayoutEffect(() => {
    dismiss.current = close
  }, [close])
  useLayoutEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const dialog = ref.current!
    const body = document.body
    const overflow = body.style.getPropertyValue('overflow')
    const priority = body.style.getPropertyPriority('overflow')
    let locked = false
    const unlock = () => {
      if (!locked) return
      locked = false
      if (overflow) body.style.setProperty('overflow', overflow, priority)
      else body.style.removeProperty('overflow')
    }
    // Native dismissal must clear React's dialog state as well. Remove this
    // listener before cleanup so a queued close event cannot dismiss a newer dialog.
    const closed = () => {
      unlock()
      dismiss.current()
    }
    dialog.addEventListener('close', closed)
    dialog.showModal()
    body.style.setProperty('overflow', 'hidden')
    locked = true
    return () => {
      dialog.removeEventListener('close', closed)
      // A layout cleanup closes the native modal before React detaches its DOM
      // node, releasing the top layer and the browser's background inertness.
      try {
        if (dialog.open) dialog.close()
      } finally {
        unlock()
        if (previous?.isConnected) previous.focus({ preventScroll: true })
      }
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className="pa-dialog"
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const b = e.currentTarget.getBoundingClientRect()
          if (
            e.clientX < b.left ||
            e.clientX > b.right ||
            e.clientY < b.top ||
            e.clientY > b.bottom
          )
            close()
        }
      }}
    >
      <div className="pa-dialog-head">
        <h2 id="dialog-title">{t(title)}</h2>
        <button
          type="button"
          aria-label={t("Close dialog")}
          className="pa-icon-button"
          onClick={close}
        >
          <X size={19} />
        </button>
      </div>
      {children}
    </dialog>
  )
}
