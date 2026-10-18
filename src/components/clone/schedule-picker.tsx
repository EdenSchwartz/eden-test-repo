import { CornerDownLeft } from "lucide-react"
import { scheduleLabel, weekDays, type Schedule } from "@/data/clone-flow"
import { cn } from "@/lib/utils"

/*
 * Opens inside the "On a schedule" option of the Runs question (components/clone/question-card.tsx).
 * Starts on a sensible default (weekdays at 09:00), so one click continues; nothing here blocks the flow.
 * Picking a different option collapses it, and the schedule is remembered if you come back.
 */

const freqs: { id: Schedule["freq"]; label: string }[] = [
  { id: "weekdays", label: "Weekdays" },
  { id: "daily", label: "Every day" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
]
const times = ["02:00", "08:00", "09:00", "13:00", "18:00"]

export function SchedulePicker({ value, onChange, onConfirm }: {
  value: Schedule
  onChange: (s: Schedule) => void
  onConfirm: () => void
}) {
  const set = (patch: Partial<Schedule>) => onChange({ ...value, ...patch })
  const toggleDay = (d: string) => set({ days: value.days.includes(d) ? value.days.filter((x) => x !== d) : [...value.days, d] })

  return (
    <div className="rise-in space-y-3 pt-1 pr-3 pb-3 pl-[3.25rem]" style={{ "--delay": "0ms" } as React.CSSProperties}>
      <Field label="Repeats">
        <div role="radiogroup" aria-label="Repeats" className="inline-flex rounded-lg border bg-background/60 p-0.5">
          {freqs.map((f) => (
            <button
              key={f.id}
              role="radio"
              aria-checked={value.freq === f.id}
              onClick={() => set({ freq: f.id })}
              className={cn(
                "h-7 cursor-pointer rounded-md px-2.5 text-xs font-medium transition-colors",
                value.freq === f.id ? "bg-card text-foreground shadow-sm ring-1 ring-foreground/10" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Field>

      {value.freq === "weekly" && (
        <Field label="On">
          <div className="flex flex-wrap gap-1">
            {weekDays.map((d) => (
              <Chip key={d} on={value.days.includes(d)} onClick={() => toggleDay(d)}>{d}</Chip>
            ))}
          </div>
        </Field>
      )}

      <Field label="At">
        <div className="flex flex-wrap items-center gap-1">
          {times.map((t) => <Chip key={t} on={value.time === t} onClick={() => set({ time: t })}>{t}</Chip>)}
          <input
            type="time"
            value={value.time}
            onChange={(e) => e.target.value && set({ time: e.target.value })}
            aria-label="Custom time"
            className="h-7 rounded-md border bg-background/60 px-2 text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:[color-scheme:dark]"
          />
        </div>
      </Field>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <p className="mr-auto text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{scheduleLabel(value)}</span> · your timezone
        </p>
        <button
          onClick={onConfirm}
          disabled={value.freq === "weekly" && value.days.length === 0}
          className="flex h-8 cursor-pointer items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground disabled:cursor-default disabled:opacity-40"
        >
          Use this schedule
          <span className="flex items-center gap-0.5 text-xs opacity-60">⌘<CornerDownLeft className="size-3" /></span>
        </button>
      </div>
    </div>
  )
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-3">
    <span className="w-14 shrink-0 pt-1.5 text-xs text-muted-foreground">{label}</span>
    <div className="min-w-0 flex-1">{children}</div>
  </div>
)

const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) => (
  <button
    onClick={onClick}
    aria-pressed={on}
    className={cn(
      "h-7 cursor-pointer rounded-md border px-2.5 text-xs font-medium tabular-nums transition-colors",
      on ? "border-[oklch(0.72_0.13_var(--hue))] bg-[oklch(0.6_0.14_var(--hue)/0.18)] text-foreground" : "bg-background/60 text-muted-foreground hover:text-foreground",
    )}
  >
    {children}
  </button>
)
