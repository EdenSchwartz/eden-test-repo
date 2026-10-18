import { useEnabled } from "@/lib/enabled"
import { cn } from "@/lib/utils"

// Enabled / Disabled for one agent or sub agent (key: see lib/enabled.ts). Small enough for a card's footer.
export function EnableSwitch({ id, name, className }: { id: string; name: string; className?: string }) {
  const { isEnabled, setEnabled } = useEnabled()
  const on = isEnabled(id)
  return <Switch on={on} onChange={(v) => setEnabled(id, v)} label={`${on ? "Disable" : "Enable"} ${name}`} title={on ? "Enabled" : "Disabled"} className={className} />
}

// The switch itself (also the triggers' on/off, components/tasks/triggers.tsx)
export function Switch({ on, onChange, label, title, disabled, className }: {
  on: boolean
  onChange: (on: boolean) => void
  label: string
  title?: string
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onChange(!on) }}
      className={cn(
        "relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
        on ? "bg-blue" : "bg-muted-foreground/30",
        className,
      )}
    >
      <span className={cn("size-3 rounded-full bg-white shadow-sm transition-transform", on ? "translate-x-3.5" : "translate-x-0.5")} />
    </button>
  )
}
