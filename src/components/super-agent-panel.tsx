import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { Bell, CalendarClock, Check, ChevronRight, FileText, Hand, MessageSquare, Plug, ShieldAlert, ShieldCheck, SlidersHorizontal, TriangleAlert, X, Zap } from "lucide-react"
import { PatternFlow, SuperAgentOrb } from "@/components/super-agents"
import { TriggersSection } from "@/components/tasks/triggers"
import { AssistantParts } from "@/components/chat/parts"
import { agents } from "@/components/chat/agents"
import { MessageResponse } from "@/components/ai-elements/message"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { navigateWithReveal } from "@/components/new-chat-fab"
import { blockers, getSuperAgent, type SuperAgent } from "@/data/super-agents"
import { StatusBadge } from "@/components/chat/primitives"
import type { Conversation } from "@/data/conversations"
import { useConversations } from "@/lib/conversations"
import { useNav } from "@/lib/nav"
import { timeAgo } from "@/lib/time"
import { cn } from "@/lib/utils"

/*
 * Super agent profile, after Strawberry's companion panel. Three fixed parts:
 *   Top (sticky):    identity only: hero band (name) and description
 *   Tabs (scrolls):  Overview (how it works · example output · permissions) · Skills · Schedule (your tasks only)
 *   Bottom (sticky): Use template / Use task (or press Enter): a conversation with it; Customize: make your own task (or edit yours)
 * No chat box here: picking the agent already put it in the main composer (concept-home.tsx).
 */
const tabs = [
  { id: "overview", label: "Overview" },
  { id: "skills", label: "Skills" },
  { id: "schedule", label: "Activity" }, // only on your customized copies: when it runs, Run now, and every run (each one a conversation)
] as const

// A skill's SKILL.md, built from the agent's own data (what it reaches, what it may do alone vs. with approval).
// ponytail: generated, not hand-written per skill; give skills a real `body` field when the content matters
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
export function skillMd(sa: SuperAgent, skill: SuperAgent["skills"][number]) {
  return [
    "---",
    `name: ${slug(skill.name)}`,
    `description: ${skill.detail}. Used by ${sa.name}.`,
    "---",
    "",
    `# ${skill.name}`,
    "",
    `${skill.detail}.`,
    "",
    "## When to use",
    "",
    `When ${sa.name} is briefed with a task like:`,
    "",
    ...sa.briefs.map((b) => `- "${b}"`),
    "",
    "## Tools",
    "",
    ...sa.tools.map((t) => `- ${t.name}${t.connected ? "" : " (not connected: skip the steps that need it and say so)"}`),
    "",
    "## Guardrails",
    "",
    "Do on your own:",
    "",
    ...sa.autonomy.auto.map((a) => `- ${a}`),
    "",
    "Ask for approval first:",
    "",
    ...sa.autonomy.approval.map((a) => `- ${a}`),
    "",
  ].join("\n")
}

// Panel width: default (grows with the screen), drag range, and the viewer's last choice (per browser)
const PANEL_MIN = 480
const panelDefault = () => Math.round(Math.min(960, Math.max(680, window.innerWidth * 0.38)))
const panelMax = () => Math.max(PANEL_MIN, Math.min(1400, window.innerWidth * 0.7))
const WIDTH_KEY = "super-agent-panel-width"

export function usePanelWidth() {
  const [width, setWidth] = useState(() => {
    try { return Number(localStorage.getItem(WIDTH_KEY)) || panelDefault() } catch { return panelDefault() }
  })
  const set = (w: number) => {
    const clamped = Math.round(Math.min(panelMax(), Math.max(PANEL_MIN, w)))
    setWidth(clamped)
    try { localStorage.setItem(WIDTH_KEY, String(clamped)) } catch { /* private mode: just don't remember */ }
  }
  return [width, set] as const
}

export function SuperAgentPanel({ sa, onClose, onStartChat, onClone, onResize, onResizing }: {
  sa: SuperAgent
  onClose: () => void
  onStartChat: (sa: SuperAgent) => void // a new conversation with this agent
  onClone: (sa: SuperAgent) => void // Customize: a template → your version; one of yours → edit it in the chat (never inline)
  onResize: (width: number) => void // width comes from --panel-w, set by the page so it can reflow beside the panel
  onResizing?: (dragging: boolean) => void
}) {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("overview")
  const [sampleOpen, setSampleOpen] = useState(false)
  const [openSkill, setOpenSkill] = useState<SuperAgent["skills"][number] | null>(null)
  const blocked = blockers(sa)
  // Start chat opens the conversation with the same circular reveal as the New conversation button, growing out of it
  const startRef = useRef<HTMLButtonElement>(null)
  const run = useCallback(() => {
    const r = startRef.current?.getBoundingClientRect()
    if (!r) return onStartChat(sa)
    navigateWithReveal(() => onStartChat(sa), r.left + r.width / 2, r.top + r.height / 2)
  }, [onStartChat, sa])
  const startChat = run

  // Esc closes; Enter starts the chat, unless you're mid-sentence in a text field (an empty one still counts)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose()
      const t = e.target
      const typing = (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) ? t.value.length > 0 : t instanceof HTMLElement && t.isContentEditable
      // Only when focus is on the page itself, so Enter on a focused button/link still does its own thing
      const idle = t === document.body
      if (e.key === "Enter" && idle && !typing && !e.metaKey && !e.ctrlKey && !e.altKey && blocked.length === 0) {
        e.preventDefault()
        run()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose, run, blocked.length])

  return (
    <aside
      aria-label={`${sa.name} profile`}
      className="fixed top-[4.25rem] right-3 bottom-3 z-50 flex w-[calc(100%-1.5rem)] animate-in flex-col overflow-hidden rounded-2xl border bg-card text-[0.8125rem] shadow-2xl shadow-black/30 duration-300 ease-snappy slide-in-from-right-6 fade-in-0 sm:w-(--panel-w) max-w-[calc(100%-1.5rem)]"
    >
      {/* Resize: drag the left edge; double-click resets */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        title="Drag to resize · double-click to reset"
        onDoubleClick={() => onResize(panelDefault())}
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
      {/* ---------- Top (sticky): identity only ---------- */}
      <div className="shrink-0">
        {/* Hero band in the agent's hue, like Strawberry's companion banner */}
        <div
          className="relative flex h-28 items-end justify-between overflow-hidden px-5 pb-4"
          style={{
            background: `radial-gradient(ellipse at 85% 30%, oklch(0.6 0.14 ${sa.hue} / 0.45), transparent 60%), radial-gradient(circle, oklch(0.8 0.08 ${sa.hue} / 0.18) 1px, transparent 1.5px) 0 0 / 10px 10px`,
          }}
        >
          <div>
            <p className="text-xs text-muted-foreground">{sa.custom ? `Your agent · ${sa.category}${sa.clonedFrom ? ` · from ${getSuperAgent(sa.clonedFrom)?.name}` : ""}` : `Agent template by Rival · ${sa.category}`}</p>
            <h2 className="text-2xl font-semibold tracking-tight">{sa.name}</h2>
          </div>
          <SuperAgentOrb sa={sa} size="lg" className="mr-10 mb-1 shadow-xl shadow-black/30" />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 flex size-7 cursor-pointer items-center justify-center rounded-full border bg-card/60 text-muted-foreground backdrop-blur transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="space-y-2 px-5 pt-3">
          <p className="leading-relaxed text-muted-foreground">{sa.about}</p>
          {/* A required app is missing: it can't run until it's connected */}
          {blocked.length > 0 && (
            <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 px-3 py-2.5 ring-1 ring-amber-500/20">
              <Plug className="size-4 shrink-0 text-amber-500" />
              <span className="flex-1">Connect <span className="font-medium">{blocked.map((t) => t.name).join(", ")}</span> to run {sa.name}</span>
              {/* ponytail: inert in the demo; wire to the connectors page */}
              <button className="shrink-0 cursor-pointer rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">Connect</button>
            </div>
          )}
        </div>

        {/* Tabs */}
        {/* Schedule only on your own tasks */}
        <div role="tablist" className="mt-2 flex gap-5 border-b px-5">
          {tabs.filter((t) => t.id !== "schedule" || sa.custom).map((t) => (
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
            </button>
          ))}
        </div>
      </div>

      {/* ---------- Tab content (scrolls) ---------- */}
      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {tab === "overview" && (
          <div className="space-y-6">

            {/* Always horizontal; node labels wrap on small screens, and it scrolls only as a last resort */}
            <section className="space-y-2.5">
              <h3 className="text-xs text-muted-foreground">How it works</h3>
              <div className="overflow-hidden rounded-xl border bg-background/40">
                <div className="@container overflow-x-auto px-7 pt-7 pb-5">
                  <PatternFlow sa={sa} className="min-w-[22rem]" />
                </div>
                {/* The same workflow as steps, in order, with what each agent does */}
                <ol className="divide-y border-t">
                  {sa.pattern.map((stage, i) => (
                    <li key={i} className="flex gap-3 px-4 py-2.5">
                      <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-md bg-foreground/10 text-[11px] font-medium tabular-nums">{i + 1}</span>
                      <span className="min-w-0 flex-1 space-y-1">
                        {stage.map((k) => (
                          <span key={k} className="block">
                            <span className="font-medium">{agents[k].name}</span>
                            <span className="text-muted-foreground"> · {agents[k].role}</span>
                          </span>
                        ))}
                        {stage.length > 1 && <span className="block text-[11px] text-muted-foreground">These run in parallel</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            {/* What you get back: the agent's real final answer (same data and renderer as the chat), collapsed to a teaser */}
            <section className="space-y-2.5">
              <h3 className="flex items-baseline justify-between text-xs text-muted-foreground">
                Example output
                <span>Sample · from a past run</span>
              </h3>
              <div className="overflow-hidden rounded-xl border bg-background/40">
                <ResultHero result={sa.script.result} />
                <div className={cn("relative space-y-3 overflow-hidden px-4 pt-3.5", sampleOpen ? "pb-3.5" : "max-h-36")}>
                  <AssistantParts parts={[{ type: "text", text: sa.script.text }, ...(sa.script.approval ? [{ type: "approval" as const, ...sa.script.approval }] : [])]} />
                  {!sampleOpen && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-card to-transparent" />}
                </div>
                <button
                  onClick={() => setSampleOpen((o) => !o)}
                  aria-expanded={sampleOpen}
                  className="w-full cursor-pointer border-t px-4 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {sampleOpen ? "Show less" : "Show full output"}
                </button>
              </div>
            </section>

            {/* A clone's setup from the guided clone chat: when it runs and where it reaches you */}
            {sa.custom && (sa.trigger || sa.escalation?.length) && (
              <section className="space-y-2.5">
                <h3 className="text-xs text-muted-foreground">Setup</h3>
                <div className="divide-y rounded-xl border">
                  <PermissionRow
                    icon={sa.trigger?.kind === "event" ? <Zap className="size-3.5 text-muted-foreground" /> : <CalendarClock className="size-3.5 text-muted-foreground" />}
                    label="Runs" items={[sa.trigger?.label ?? "On demand"]}
                  />
                  <PermissionRow icon={<Bell className="size-3.5 text-muted-foreground" />} label="Escalates to" items={sa.escalation?.length ? sa.escalation : ["In Rival only"]} />
                </div>
              </section>
            )}

            {/* Permissions: what it does by itself vs. what waits for a human */}
            <section className="space-y-2.5">
              <h3 className="text-xs text-muted-foreground">Permissions</h3>
              <div className="divide-y rounded-xl border">
                <PermissionRow icon={<Check className="size-3.5 text-muted-foreground" />} label="On its own" items={sa.autonomy.auto} />
                <PermissionRow icon={<Hand className="size-3.5 text-amber-500" />} label="Needs your approval" items={sa.autonomy.approval} />
              </div>
            </section>
          </div>
        )}

        {tab === "skills" && (
          <div className="divide-y overflow-hidden rounded-xl border">
            {sa.skills.map((s) => (
              <div key={s.name} className="flex items-center gap-4 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{s.name}</span>
                  <span className="block text-xs text-muted-foreground">{s.detail}</span>
                </span>
                <button
                  onClick={() => setOpenSkill(s)}
                  className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent"
                >
                  <FileText className="size-3.5" /> Show SKILL.md
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "schedule" && sa.custom && <ScheduleTab sa={sa} />}


      </div>

      {/* ---------- Bottom (sticky): Use this agent · Customize ---------- */}
      {/* Use this agent opens a conversation with it, which greets you with questions to ask */}
      <div className="shrink-0 space-y-2 border-t bg-card px-4 pt-3 pb-4">
        {blocked.length > 0 && <p className="text-xs text-muted-foreground">Connect {blocked.map((t) => t.name).join(", ")} to chat with {sa.name}</p>}
        <div className="flex items-stretch gap-2">
          <button
            ref={startRef}
            disabled={blocked.length > 0}
            onClick={startChat}
            className="flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
          >
            <MessageSquare className="size-4" /> {sa.custom ? "Use agent" : "Use template"}
          </button>
          {/* Secondary: make your own version (works even when a required app is missing) */}
          <button
            onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); navigateWithReveal(() => onClone(sa), r.left + r.width / 2, r.top + r.height / 2) }}
            className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-sm border px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            <SlidersHorizontal className="size-3.5" /> Customize
          </button>
        </div>
      </div>

      <Dialog open={!!openSkill} onOpenChange={(o) => !o && setOpenSkill(null)}>
        {/* Esc closes just the dialog: keep it from reaching the drawer's own Esc handler */}
        <DialogContent onEscapeKeyDown={(e) => e.stopPropagation()} className="max-h-[85svh] gap-3 overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">{openSkill && `skills/${slug(openSkill.name)}/SKILL.md`}</DialogTitle>
            <DialogDescription>{openSkill?.name} · {sa.name}</DialogDescription>
          </DialogHeader>
          {openSkill && <MessageResponse>{"```markdown\n" + skillMd(sa, openSkill) + "```"}</MessageResponse>}
        </DialogContent>
      </Dialog>
    </aside>
  )
}

// The run's bottom line in one glance: verdict in its tone, then the numbers behind it
const heroTones = {
  risk: { icon: ShieldAlert, tile: "bg-red-500/10 text-red-400", text: "text-red-400" },
  warn: { icon: TriangleAlert, tile: "bg-amber-500/10 text-amber-500", text: "text-amber-500" },
  safe: { icon: ShieldCheck, tile: "bg-emerald-500/10 text-emerald-500", text: "text-emerald-500" },
}
export function ResultHero({ result }: { result: SuperAgent["script"]["result"] }) {
  const tone = heroTones[result.tone]
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b px-4 py-3.5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", tone.tile)}>
          <tone.icon className="size-5" />
        </span>
        <span className="min-w-0">
          <span className={cn("block text-lg leading-tight font-semibold tracking-tight", tone.text)}>{result.verdict}</span>
          <span className="block text-xs text-muted-foreground">{result.detail}</span>
        </span>
      </div>
      <dl className="flex gap-5">
        {result.stats.map((st) => (
          <div key={st.label} className="flex flex-col-reverse">
            <dt className="text-xs whitespace-nowrap text-muted-foreground">{st.label}</dt>
            <dd className="text-lg leading-tight font-semibold tabular-nums">{st.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function PermissionRow({ icon, label, items }: { icon: ReactNode; label: string; items: string[] }) {
  return (
    <div className="flex items-start gap-4 px-4 py-3">
      <span className="flex w-40 shrink-0 items-center gap-2 font-medium">{icon} {label}</span>
      <ul className="min-w-0 flex-1 space-y-1 text-muted-foreground">
        {items.map((a) => <li key={a}>{a}</li>)}
      </ul>
    </div>
  )
}

/* ---------- Schedule tab: when it runs, and every run so far ---------- */

// Rival's super agents are templates: they never run on their own. Yours (a customized version) runs on its trigger,
// on Run now, and whenever you ask it something. Every run is a conversation you can go back to.
type RunState = "running" | "attention" | "done"
export function runState(c: Conversation): RunState {
  const reply = c.messages.findLast((m) => m.role === "assistant")?.parts ?? []
  if (reply.some((p) => p.type === "agent" && p.status === "running") || !reply.some((p) => p.type === "text")) return "running"
  return reply.some((p) => p.type === "approval") ? "attention" : "done"
}
// Only on your own (customized) super agents: Rival's are templates and never run.
// The Activity tab: its triggers (components/tasks/triggers.tsx), then every run. No Run now here: the panel's one
// button at the bottom is the only action.
export function ScheduleTab({ sa }: { sa: SuperAgent }) {
  const { convs } = useConversations()
  const { navigate } = useNav()
  // Runs = its conversations you (or its schedule) actually asked something in; a Start chat greeting alone isn't one
  const runs = convs.filter((c) => c.superAgentId === sa.id && c.messages.some((m) => m.role === "user"))

  return (
    <div className="space-y-6">
      <TriggersSection sa={sa} />

      <section className="space-y-2.5">
        {/* Show all runs: a tertiary link to the Agent activity page, filtered to this agent (pages/agents.tsx) */}
        <h3 className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Runs <span className="ml-1 tabular-nums">{runs.length}</span></span>
          <button
            onClick={() => navigate("agents", { superAgentId: sa.id })}
            className="-mr-1.5 flex h-6 cursor-pointer items-center gap-1 rounded-md px-1.5 font-medium text-blue transition-colors hover:bg-wash"
          >
            Show all runs <ChevronRight className="size-3.5" />
          </button>
        </h3>
        {runs.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-muted-foreground">
            No runs yet. It runs on the triggers above, or whenever you use it.
          </p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border">
            {runs.map((c) => {
              const state = runState(c)
              return (
                <li key={c.id}>
                  <button
                    onClick={() => navigate("chat", { conversationId: c.id })}
                    className="group flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-pretty">{c.messages.find((m) => m.role === "user")?.parts.map((p) => (p.type === "text" ? p.text : "")).join("").replace(/@(?=CVE-)/, "")}</span>
                      <span className="block text-xs text-muted-foreground">
                        {c.run?.kind === "scheduled" ? "Scheduled run" : c.run?.kind === "manual" ? "Run now" : c.run?.kind === "asked" ? "You asked" : "Chat"} · {timeAgo(c.updatedAt) === "now" ? "just now" : `${timeAgo(c.updatedAt)} ago`}
                        {state !== "running" && ` · ${sa.script.result.verdict}`}
                      </span>
                    </span>
                    <StatusBadge tone={state}>{state === "running" ? "Running" : state === "attention" ? "Needs you" : "Done"}</StatusBadge>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-foreground" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
