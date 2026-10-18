import { useEffect, useState } from "react"
import { Check, CornerDownLeft } from "lucide-react"
import { agents, type AgentKind } from "@/components/chat/agents"
import type { AgentSetting, Structure } from "@/data/task-setup"
import type { SuperAgent } from "@/data/super-agents"
import { cn } from "@/lib/utils"

/*
 * Customize a task's structure, as a questionnaire in place of the chat box (pages/chat.tsx),
 * while the live preview fills the right side. Same shell as the question card (components/chat/question-card.tsx).
 *   - One step per agent, in workflow order, with the progress bar ("Agent 2 of 6 · Exploitability").
 *   - Per agent: Enabled (on / off), and its trigger: Automatic | Human approved.
 *   - Every change shows in the preview right away; the agent you're on is highlighted there (onStep).
 *   - Back / Next, then Save changes on the last one (⌘↵). Cancel (Esc) goes back to the question.
 */

export function StructureCard({ sa, value, onChange, onStep, onSave, onCancel }: {
  sa: SuperAgent
  value: Structure
  onChange: (s: Structure) => void
  onStep?: (kind: AgentKind) => void
  onSave: () => void
  onCancel: () => void
}) {
  const kinds = sa.pattern.flat()
  const [i, setI] = useState(0)
  const k = kinds[i]
  const a = value[k]
  const last = i === kinds.length - 1
  const enabled = kinds.filter((x) => value[x].on).length
  const onlyOne = enabled === 1 && a.on // a task needs at least one agent
  const step = sa.pattern.findIndex((s) => s.includes(k))
  const parallel = sa.pattern[step].length > 1
  const { name, icon: Icon, short } = agents[k]
  const label = name.replace(/ agent$/, "")

  const set = (patch: Partial<AgentSetting>) => onChange({ ...value, [k]: { ...a, ...patch } })
  const go = (n: number) => setI(Math.max(0, Math.min(kinds.length - 1, n)))
  const next = () => (last ? onSave() : go(i + 1))

  useEffect(() => { onStep?.(k) }, [k]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); return onCancel() }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); return next() }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === "1" && a.on) set({ approval: false })
      if (e.key === "2" && a.on) set({ approval: true })
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  return (
    <div className="rise-in overflow-hidden rounded-2xl border bg-card shadow-xl shadow-black/10" style={{ "--delay": "0ms", "--hue": sa.hue } as React.CSSProperties}>
      {/* Where you are: one dash per agent (click one to jump there) */}
      <div className="flex items-center gap-3 px-5 pt-3.5">
        <span className="text-xs text-muted-foreground">Agent {i + 1} of {kinds.length} · {label}</span>
        <span className="ml-auto flex items-center gap-1">
          {kinds.map((x, n) => (
            <button
              key={x}
              onClick={() => go(n)}
              aria-label={`${agents[x].name}${value[x].on ? "" : " (off)"}`}
              title={agents[x].name.replace(/ agent$/, "")}
              className="flex h-3 cursor-pointer items-center"
            >
              <span className={cn(
                "h-[3px] w-4 rounded-full transition-colors",
                n === i ? "bg-foreground/60" : n < i ? "bg-[oklch(0.62_0.15_var(--hue))]" : "bg-foreground/15",
                !value[x].on && n !== i && "bg-foreground/10",
              )} />
            </button>
          ))}
        </span>
      </div>

      {/* The agent */}
      <div key={k} className="animate-in duration-200 fade-in-0">
        <div className="flex items-start gap-3 px-5 pt-3">
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg border border-foreground/15 bg-muted transition-opacity", !a.on && "opacity-40")}>
            <Icon className="size-4" />
          </span>
          <div className={cn("min-w-0 flex-1 transition-opacity", !a.on && "opacity-60")}>
            <h3 className="text-[15px] leading-snug font-medium tracking-tight">{label}</h3>
            <p className="text-[13px] text-muted-foreground">
              {short} · Step {step + 1}{parallel ? ", in parallel" : ""}
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-1.5 px-3 pb-3">
          {/* 1. Enabled */}
          <button
            role="switch"
            aria-checked={a.on}
            disabled={onlyOne}
            onClick={() => set({ on: !a.on })}
            title={onlyOne ? "A task needs at least one agent" : undefined}
            className={cn(row, "items-center border-border/70 bg-muted/30 hover:border-foreground/20 hover:bg-muted/60 disabled:cursor-not-allowed")}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Enabled</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">
                {a.on ? `${label} runs as part of ${sa.name}` : `Off: ${sa.name} skips this step`}
              </span>
            </span>
            <Toggle on={a.on} disabled={onlyOne} />
          </button>

          {/* 2. Trigger */}
          <p className={cn("px-1 pt-2 text-xs font-medium text-muted-foreground transition-opacity", !a.on && "opacity-50")}>Trigger</p>
          {([
            [false, "Automatic", "Runs on its own as soon as the previous step is done"],
            [true, "Human approved", "Waits for your approval before it acts"],
          ] as const).map(([approval, title, hint], n) => {
            const picked = a.on && a.approval === approval
            return (
              <button
                key={title}
                role="radio"
                aria-checked={picked}
                disabled={!a.on}
                onClick={() => set({ approval })}
                className={cn(
                  row,
                  "disabled:pointer-events-none disabled:opacity-40",
                  picked
                    ? "border-[oklch(0.62_0.15_var(--hue)/0.6)] bg-[oklch(0.62_0.15_var(--hue)/0.07)]"
                    : "border-border/70 bg-muted/30 hover:border-foreground/20 hover:bg-muted/60",
                )}
              >
                <span className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-medium tabular-nums transition-colors",
                  picked ? "bg-[oklch(0.62_0.15_var(--hue))] text-white" : "border bg-background text-muted-foreground",
                )}>
                  {picked ? <Check className="size-3.5" strokeWidth={3} /> : n + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{hint}</span>
                </span>
              </button>
            )
          })}
          <p className="px-1 pt-1.5 text-xs text-muted-foreground">Not set in stone: you can edit any of this anytime later.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t px-3 py-2.5">
        <button onClick={onCancel} className="h-8 cursor-pointer rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          Cancel
        </button>
        <span className="ml-auto text-xs whitespace-nowrap text-muted-foreground">{enabled} of {kinds.length} agents enabled</span>
        {i > 0 && (
          <button onClick={() => go(i - 1)} className="h-8 cursor-pointer rounded-lg border px-3.5 text-sm font-medium transition-colors hover:bg-accent">
            Back
          </button>
        )}
        <button onClick={next} className="flex h-8 cursor-pointer items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground">
          {last ? "Save changes" : "Next"}
          <span className="flex items-center gap-0.5 text-xs opacity-60">⌘<CornerDownLeft className="size-3" /></span>
        </button>
      </div>
    </div>
  )
}

const row = "flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50"

// On / off switch, in the task's color (the row around it is the button)
const Toggle = ({ on, disabled }: { on: boolean; disabled?: boolean }) => (
  <span className={cn(
    "relative h-5 w-9 shrink-0 rounded-full transition-colors",
    on ? "bg-[oklch(0.62_0.15_var(--hue))]" : "bg-foreground/15",
    disabled && "opacity-50",
  )}>
    <span className={cn("absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform", on && "translate-x-4")} />
  </span>
)
