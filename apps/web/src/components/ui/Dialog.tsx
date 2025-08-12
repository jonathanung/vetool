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
    <dialog ref={ref} onClose={onClose} className="rounded-2xl bg-[var(--card)] text-[var(--text)] backdrop:bg-black/30">
      <div className="p-4">{children}</div>
    </dialog>
  )
} 