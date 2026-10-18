import type { ReactNode } from "react"
import { Check, ChevronRight, Loader2, ShieldAlert, ShieldCheck, X, type LucideIcon } from "lucide-react"
import { Shimmer } from "@/components/ai-elements/shimmer"
import { cn } from "@/lib/utils"

/*
 * Chat design system: every assistant block is one of three things.
 *
 *   Step    How the agent worked (reasoning, tool calls, memory). One quiet row on a shared rail:
 *           ○ icon · label · meta · chevron. Click to expand details. Steps never use color.
 *   Agent   Work delegated to a helper agent. Same row anatomy as a step, but a ▢ square glyph
 *           (square = someone, circle = something done). Expands to the agent's own steps and
 *           results, one level deeper. Consecutive agents form one parallel group.
 *   Result  What was produced. A card: icon tile · title · body · aside (meta or the user's action).
 *           Placement says where it came from:
 *             - information (findings, owner traces) sits under the step that produced it, on the rail
 *             - actions (approvals) are the only cards that stand alone, credited "via <agent>"
 *           So: on the rail = context, standalone = needs you.
 *
 * Rule: quiet when done, loud only when the user is needed or something broke.
 *   running   → spinner + shimmering label/activity
 *   done      → quiet (steps: nothing; agents: muted "Done", or a verdict token when the agent concluded something)
 *   verdict   → what a finished agent concluded. risk = red tint + shield-alert ("Exploitable"), safe = quiet + shield-check ("Blocked").
 *               Risk is red like errors, but a different glyph: ✕ = the agent broke, shield = your environment is at risk.
 *   attention → amber (StatusBadge tone="attention", IconTile tone="attention")
 *   error     → red (StatusBadge tone="error", failed steps get a red ✕)
 * Entities (assets, teams, repos) are always an EntityChip.
 */

/* ---------- Steps ---------- */

// Groups consecutive steps. The rail is drawn per step: each step draws a segment from its icon
// down to the next icon, so the rail always ends exactly at the last step (never dangles).
// --rail is opaque, so segments that overlap don't stack into darker patches.
export function Steps({ children }: { children: ReactNode[] }) {
  return (
    <div className="flex flex-col">
      {children.map((child, i) => (
        <div
          key={i}
          className={cn(
            "relative",
            i < children.length - 1 && "before:absolute before:top-7 before:-bottom-1 before:left-[11.5px] before:w-px before:bg-(--rail)",
          )}
        >
          {child}
        </div>
      ))}
    </div>
  )
}

// Wraps a card a step produced: a curved connector branches from the step's icon into the card's left edge
export function StepOutput({ children }: { children: ReactNode }) {
  return (
    <div className="relative pt-1 pb-2 pl-9 before:absolute before:-top-1 before:left-[11.5px] before:h-[calc(50%+2px)] before:w-6 before:rounded-bl-lg before:border-b before:border-l before:border-(--rail)">
      {children}
    </div>
  )
}

// For a step that has an output card: keeps the rail running through its expanded details down to the connector
export const stepBodyRail = "relative before:absolute before:inset-y-0 before:left-[11.5px] before:w-px before:bg-(--rail)"

// Class for the CollapsibleTrigger wrapping a StepHeader (chevron rotates via data-state)
export const stepTrigger = "group/step flex w-full cursor-pointer rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"

// Class for a step's expanded content: aligned under the label, not the icon
export const stepBody = "pb-3 pl-9 text-sm text-muted-foreground"

export function StepHeader({
  icon: Icon, label, meta, running, error, expandable = true,
}: { icon: LucideIcon; label: string; meta?: ReactNode; running?: boolean; error?: boolean; expandable?: boolean }) {
  return (
    <span className="flex h-8 w-full min-w-0 items-center gap-3 text-sm">
      <span className={cn(
        "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border border-(--rail) bg-background",
        error && "border-red-500/40 bg-red-500/10",
      )}>
        {running ? <Loader2 className="size-3 animate-spin text-muted-foreground" />
          : error ? <X className="size-3 text-red-400" />
          : <Icon className="size-3 text-muted-foreground" />}
      </span>
      {running
        ? <Shimmer as="span" duration={1.2} className="shrink-0">{label}</Shimmer>
        : <span className="shrink-0 text-foreground/90 transition-colors group-hover/step:text-foreground">{label}</span>}
      {meta && <span className={cn("min-w-0 truncate text-muted-foreground", error && "text-red-400")}>{meta}</span>}
      {expandable && (
        <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground/60 transition-transform duration-150 group-hover/step:text-muted-foreground group-data-[state=open]/step:rotate-90" />
      )}
    </span>
  )
}

/* ---------- Agents ---------- */

export type AgentStatus = "running" | "done" | "attention" | "error"
const agentStatusLabels: Record<AgentStatus, string> = { running: "Working", done: "Done", attention: "Needs you", error: "Failed" }

// Two-line agent row: ▢ name · status · duration · chevron, then the result (or live activity / error) in full
export type Verdict = { label: string; tone: "risk" | "safe" }

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const risk = verdict.tone === "risk"
  const Icon = risk ? ShieldAlert : ShieldCheck
  return (
    <span className={cn(
      "inline-flex h-6 items-center gap-1.5 rounded-full text-xs font-medium",
      risk ? "bg-red-500/10 px-2.5 text-red-400" : "text-muted-foreground",
    )}>
      <Icon className="size-3" />
      {verdict.label}
    </span>
  )
}

// The one badge for an agent's state, everywhere (rows, drawers, AI Agents table): verdict once done, else status
export function AgentStatusBadge({ status, verdict }: { status: AgentStatus; verdict?: Verdict }) {
  return status === "done" && verdict
    ? <VerdictBadge verdict={verdict} />
    : <StatusBadge tone={status}>{agentStatusLabels[status]}</StatusBadge>
}

export function AgentHeader({
  icon: Icon, name, status, detail, verdict, duration, expandable = true,
}: {
  icon: LucideIcon
  name: string
  status: AgentStatus
  detail?: string
  verdict?: Verdict // replaces the generic "Done" once the agent concluded something
  duration?: number
  expandable?: boolean
}) {
  return (
    <span className="flex w-full min-w-0 items-start gap-3 py-1.5 text-sm">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-foreground/15 bg-muted">
        <Icon className="size-3 text-foreground" />
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="flex min-h-6 items-center gap-2">
          <span className="font-medium">{name}</span>
          <span className="ml-auto flex shrink-0 items-center gap-2">
            {duration !== undefined && status !== "running" && (
              <span className="text-xs text-muted-foreground tabular-nums">{duration}s</span>
            )}
            <AgentStatusBadge status={status} verdict={verdict} />
            {expandable && (
              <ChevronRight className="size-4 text-muted-foreground/60 transition-transform duration-150 group-hover/step:text-muted-foreground group-data-[state=open]/step:rotate-90" />
            )}
          </span>
        </span>
        {detail && (status === "running"
          ? <Shimmer as="span" duration={1.2} className="block">{detail}</Shimmer>
          : <span className={cn("block text-muted-foreground", status === "error" && "text-red-400")}>{detail}</span>)}
      </span>
    </span>
  )
}

/* ---------- Results ---------- */

const tileTones = {
  default: "bg-muted text-muted-foreground",
  attention: "bg-amber-500/10 text-amber-500",
}

export function IconTile({ icon: Icon, tone = "default" }: { icon: LucideIcon; tone?: keyof typeof tileTones }) {
  return (
    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", tileTones[tone])}>
      <Icon className="size-4" />
    </span>
  )
}

export function ResultCard({
  icon, tone, title, aside, via, children,
}: {
  icon: LucideIcon
  tone?: keyof typeof tileTones
  title: string
  aside?: ReactNode
  via?: { name: string; icon: LucideIcon } // credit when a helper agent produced this result
  children?: ReactNode
}) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-3 p-3 pr-4">
        <IconTile icon={icon} tone={tone} />
        {/* min width: in narrow spaces (profile panel) the aside wraps below instead of squeezing the title */}
        <div className="min-w-48 flex-1 space-y-1.5">
          <p className="text-sm font-medium">{title}</p>
          {children}
        </div>
        {aside && <div className="ml-auto flex shrink-0 items-center gap-2">{aside}</div>}
      </div>
      {via && (
        <p className="flex items-center gap-1.5 border-t px-3 py-2 text-xs text-muted-foreground">
          <span className="flex size-4 items-center justify-center rounded-[4px] border border-foreground/15 bg-muted">
            <via.icon className="size-2.5 text-foreground" />
          </span>
          via {via.name}
        </p>
      )}
    </div>
  )
}

const badgeTones: Record<AgentStatus, string> = {
  running: "bg-muted text-muted-foreground",
  done: "text-muted-foreground",
  attention: "bg-amber-500/10 text-amber-500",
  error: "bg-red-500/10 text-red-400",
}

export function StatusBadge({ tone, children }: { tone: AgentStatus; children: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium", badgeTones[tone], tone === "done" && "px-0")}>
      {tone === "running" ? <Loader2 className="size-3 animate-spin" />
        : tone === "done" ? <Check className="size-3" />
        : tone === "error" ? <X className="size-3" />
        : <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

/* ---------- Entities ---------- */

export function EntityChip({ icon: Icon, children }: { icon: LucideIcon; children: string }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-md border bg-muted/40 px-1.5 font-mono text-xs">
      <Icon className="size-3 text-muted-foreground" />
      {children}
    </span>
  )
}
