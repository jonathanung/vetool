"use client"
import { useEffect, useRef } from 'react'

export default function Dialog({ open, onClose, children }: { open: boolean; onClose: ()=>void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} onClose={onClose} className="bg-card text-text border border-border p-0 shadow-bento-lg">
      <div className="p-5">{children}</div>
    </dialog>
  )
}
