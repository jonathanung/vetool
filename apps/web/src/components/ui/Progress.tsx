export default function Progress({ value }: { value: number }) {
  return (
    <div className="w-full h-2 rounded-xl bg-[var(--muted)] overflow-hidden">
      <div className="h-2 bg-[var(--accent)]" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
} 