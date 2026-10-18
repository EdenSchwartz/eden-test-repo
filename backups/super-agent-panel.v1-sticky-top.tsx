import { useEffect, useMemo, useState, type ReactNode } from "react"
import { ArrowRight, CalendarClock, ChevronDown, Hand, Lightbulb, Plug, Plus, X } from "lucide-react"
import { AssistantParts } from "@/components/chat/parts"
import { AgentStack, PatternFlow, SuperAgentOrb } from "@/components/super-agents"
import { costSaved, formatHours, sampleRun, schedules, type SuperAgent } from "@/data/super-agents"
import { cn } from "@/lib/utils"

/*
 * Super agent profile, after Strawberry's companion panel. Three fixed parts:
 *   Top (sticky):    name, hero band, description, a facts table (skills · runs · how it works, expandable)
 *   Tabs (scrolls):  Skills · Scheduled · Sample run
 *   Bottom (sticky): Start with: three briefs, one click runs
 * No chat box here: picking the agent already put it in the main composer (concept-home.tsx).
 */
const tabs = [
  { id: "skills", label: "Skills" },
  { id: "scheduled", label: "Scheduled" },
  { id: "sample", label: "Sample run" },
] as const

// ponytail: fake "last used" times for the demo
const lastUsed = ["12 min ago", "2h ago", "yesterday", "3 days ago"]

// Panel width: default, drag range, and the viewer's last choice (per browser)
export const PANEL_DEFAULT = 680
const PANEL_MIN = 480
const panelMax = () => Math.max(PANEL_MIN, Math.min(1100, window.innerWidth * 0.7))
const WIDTH_KEY = "super-agent-panel-width"

export function usePanelWidth() {
  const [width, setWidth] = useState(() => {
    try { return Number(localStorage.getItem(WIDTH_KEY)) || PANEL_DEFAULT } catch { return PANEL_DEFAULT }
  })
  const set = (w: number) => {
    const clamped = Math.round(Math.min(panelMax(), Math.max(PANEL_MIN, w)))
    setWidth(clamped)
    try { localStorage.setItem(WIDTH_KEY, String(clamped)) } catch { /* private mode: just don't remember */ }
  }
  return [width, set] as const
}

export function SuperAgentPanel({ sa, onClose, onLaunch, onResize, onResizing }: {
  sa: SuperAgent
  onClose: () => void
  onLaunch: (prompt: string, sa: SuperAgent) => void
  onResize: (width: number) => void // width comes from --panel-w, set by the page so it can reflow beside the panel
  onResizing?: (dragging: boolean) => void
}) {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("skills")
  const [flowOpen, setFlowOpen] = useState(false)
  const sample = useMemo(() => sampleRun(sa), [sa])
  const agentSchedules = schedules[sa.id] ?? []
  const missing = sa.tools.filter((t) => !t.connected)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <aside
      aria-label={`${sa.name} profile`}
      className="fixed top-[4.25rem] right-3 bottom-3 z-50 flex w-[calc(100%-1.5rem)] animate-in flex-col overflow-hidden rounded-2xl border bg-card text-[13px] shadow-2xl shadow-black/30 duration-300 ease-snappy slide-in-from-right-6 fade-in-0 sm:w-(--panel-w)"
    >
      {/* Resize: drag the left edge; double-click resets */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        title="Drag to resize · double-click to reset"
        onDoubleClick={() => onResize(PANEL_DEFAULT)}
        onPointerDown={(e) => {
          e.preventDefault()
          e.currentTarget.setPointerCapture(e.pointerId)
          onResizing?.(true)
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) onResize(window.innerWidth - e.clientX - 12)
        }}
        onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); onResizing?.(false) }}
        className="group/resize absolute inset-y-0 left-0 z-10 hidden w-2 cursor-col-resize items-center justify-center sm:flex"
      >
        <span className="h-10 w-1 rounded-full bg-foreground/0 transition-colors group-hover/resize:bg-foreground/30 group-active/resize:bg-foreground/50" />
      </div>
      {/* ---------- Top (sticky) ---------- */}
      <div className="shrink-0">
        <div className="flex h-12 items-center gap-2 px-4">
          <SuperAgentOrb sa={sa} size="sm" className="size-5 rounded-[5px] [&_svg]:size-3" />
          <span className="flex-1 font-medium">{sa.name}</span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex size-7 cursor-pointer items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Hero band in the agent's hue, like Strawberry's companion banner */}
        <div
          className="relative mx-3 flex h-28 items-end justify-between overflow-hidden rounded-xl px-5 pb-4"
          style={{
            background: `radial-gradient(ellipse at 85% 30%, oklch(0.6 0.14 ${sa.hue} / 0.45), transparent 60%), radial-gradient(circle, oklch(0.8 0.08 ${sa.hue} / 0.18) 1px, transparent 1.5px) 0 0 / 10px 10px`,
          }}
        >
          <div>
            <p className="text-xs text-muted-foreground">Super agent · {sa.category}</p>
            <h2 className="text-2xl font-semibold tracking-tight">{sa.name}</h2>
          </div>
          <SuperAgentOrb sa={sa} size="lg" className="mb-1 shadow-xl shadow-black/30" />
        </div>

        <p className="px-5 pt-3 leading-relaxed text-muted-foreground">{sa.about}</p>

        {/* Facts table: label column + value, like Strawberry's Skills / Routines rows */}
        <div className="mx-3 mt-3 divide-y rounded-xl border">
          <Fact label="Skills">
            <div className="flex flex-wrap gap-1.5">
              {sa.skills.map((s) => (
                <span key={s.name} title={s.detail} className="inline-flex items-center gap-1.5 rounded-md border bg-background/40 px-2 py-1 text-xs">
                  <Lightbulb className="size-3 text-muted-foreground" /> {s.name}
                </span>
              ))}
            </div>
          </Fact>
          <Fact label="Runs">
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span><span className="font-medium">{sa.runsThisMonth}</span> this month</span>
              <span className="text-muted-foreground">~{formatHours(sa.savings.hours)} · ≈${costSaved(sa).toLocaleString()} saved per run</span>
            </span>
          </Fact>
          <div>
            <button
              onClick={() => setFlowOpen((o) => !o)}
              aria-expanded={flowOpen}
              className="flex w-full cursor-pointer items-center gap-4 px-4 py-2.5 text-left transition-colors hover:bg-accent/50"
            >
              <span className="w-24 shrink-0 text-muted-foreground">How it works</span>
              <span className="flex flex-1 items-center gap-2 text-muted-foreground">
                <AgentStack kinds={sa.pattern.flat()} size="xs" />
                {sa.pattern.length} steps
              </span>
              <ChevronDown className={cn("size-4 text-muted-foreground transition-transform duration-200", flowOpen && "rotate-180")} />
            </button>
            {flowOpen && (
              <div className="animate-in overflow-x-auto px-4 pt-2 pb-4 fade-in-0 slide-in-from-top-1">
                <PatternFlow sa={sa} className="min-w-max" />
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div role="tablist" className="mt-3 flex gap-5 border-b px-5">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "-mb-px cursor-pointer border-b-2 py-2.5 transition-colors",
                tab === t.id ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              {t.id === "scheduled" && agentSchedules.length > 0 && <span className="ml-1.5 text-xs text-muted-foreground">{agentSchedules.length}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- Tab content (scrolls) ---------- */}
      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {tab === "skills" && (
          <div className="space-y-5">
            <div className="overflow-hidden rounded-xl border">
              <div className="grid grid-cols-[1fr_auto] gap-4 border-b bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                <span>Skill</span><span>Last used</span>
              </div>
              {sa.skills.map((s, i) => (
                <div key={s.name} className="grid grid-cols-[1fr_auto] items-center gap-4 border-b px-4 py-3 last:border-b-0">
                  <span className="min-w-0">
                    <span className="block font-medium">{s.name}</span>
                    <span className="block text-xs text-muted-foreground">{s.detail}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{lastUsed[i % lastUsed.length]}</span>
                </div>
              ))}
            </div>

            {/* Trust: what it won't do without you, and anything it can't reach */}
            <div className="space-y-2">
              <h3 className="text-xs text-muted-foreground">Before it acts</h3>
              <p className="flex items-start gap-2">
                <Hand className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                <span>Asks you first to <span className="text-muted-foreground">{sa.autonomy.approval.map((a) => a.charAt(0).toLowerCase() + a.slice(1)).join(" · ")}</span></span>
              </p>
              {missing.length > 0 && (
                <p className="flex items-start gap-2 text-muted-foreground">
                  <Plug className="mt-0.5 size-3.5 shrink-0" />
                  <span className="flex-1">{missing.map((t) => t.name).join(", ")} not connected. It runs without it and tells you what it skipped.</span>
                  {/* ponytail: inert in the demo; wire to the connectors page */}
                  <button className="shrink-0 cursor-pointer text-xs font-medium text-foreground hover:underline">Connect</button>
                </p>
              )}
            </div>
          </div>
        )}

        {tab === "scheduled" && (
          <div className="space-y-3">
            {agentSchedules.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center">
                <CalendarClock className="size-5 text-muted-foreground" />
                <p className="font-medium">No schedules yet</p>
                <p className="max-w-xs text-muted-foreground">Run {sa.name} on a schedule or when something happens, like a new finding or a deploy.</p>
              </div>
            ) : (
              <div className="divide-y overflow-hidden rounded-xl border">
                {agentSchedules.map((s) => (
                  <div key={s.name} className="flex items-center gap-3 px-4 py-3">
                    <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{s.name}</span>
                      <span className="block text-xs text-muted-foreground">{s.trigger} · last run {s.lastRun}: {s.outcome}</span>
                    </span>
                    {/* ponytail: visual only */}
                    <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", s.enabled ? "bg-primary" : "bg-muted")}>
                      <span className={cn("absolute top-0.5 size-4 rounded-full bg-background shadow transition-[left]", s.enabled ? "left-[18px]" : "left-0.5")} />
                    </span>
                  </div>
                ))}
              </div>
            )}
            {/* ponytail: inert; would open the schedule builder on the Scheduled page */}
            <button className="flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent">
              <Plus className="size-3.5" /> New schedule
            </button>
          </div>
        )}

        {tab === "sample" && (
          <div className="space-y-3 text-sm [&_.rise-in]:animate-none">
            <p className="text-xs text-muted-foreground">A finished run from 2 days ago: what you get back, sub-agents and all.</p>
            <AssistantParts parts={sample} />
          </div>
        )}
      </div>

      {/* ---------- Bottom (sticky): Start with ---------- */}
      <div className="shrink-0 space-y-2 border-t bg-card px-4 pt-3 pb-4">
        <h3 className="text-xs text-muted-foreground">Start with</h3>
        <div className="grid gap-1.5">
          {sa.briefs.slice(0, 3).map((b) => (
            <button
              key={b}
              onClick={() => onLaunch(b, sa)}
              className="group flex cursor-pointer items-center gap-3 rounded-xl border bg-background/40 px-3 py-2 text-left transition-colors hover:border-foreground/25 hover:bg-accent"
            >
              <span className="min-w-0 flex-1 truncate">{b}</span>
              <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-4 px-4 py-2.5">
      <span className="w-24 shrink-0 pt-0.5 text-muted-foreground">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
