export default function Progress({ value }: { value: number }) {
  return (
    <div className="w-full h-1.5 bg-bg-secondary overflow-hidden border border-border">
      <div className="h-full bg-team-a" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}
