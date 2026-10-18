import { useState } from "react"
import {
  Box, Brain, Check, ChevronDown, Cloud, FileCheck2, GitPullRequest, Layers, Link, ShieldAlert, Sparkles, Users, Wrench, type LucideIcon,
} from "lucide-react"
import { agents, type AgentKind } from "@/components/chat/agents"
import { AgentStatusBadge } from "@/components/chat/primitives"
import { Outcomes } from "@/components/tasks/outcomes"
import { agentOutcomes } from "@/data/outcomes"
import type { Conversation, Entity, Part } from "@/data/conversations"
import { getSuperAgent } from "@/data/super-agents"
import type { Setup } from "@/lib/task-setup"
import { cn } from "@/lib/utils"

/*
 * Conversation info: what this conversation knows and did, as cards floating on the right of the chat
 * (pages/chat.tsx, toggled by the info button top right), like the context panels of agent harnesses.
 * Everything is read from the conversation itself:
 *   Setup      while you're configuring an agent from a template: where you are (Scope → Workflow → Review & create),
 *              what you've settled so far; all checked once it's created. Opens by itself when a setup starts.
 *   Context    how full the context is, and what's in it: the scope, findings you mentioned (@CVE-…), assets,
 *              teams and repos the work touched, memories it used
 *   Sub agents with an agent: its whole lineup (its pattern), "Not run yet" until each runs here, then its status or
 *              verdict; without one: every helper agent that ran here
 *   Outputs    what it can end in (the agent's outcomes, as in the Overview tab), then what came out of it here:
 *              approvals waiting on you, the agent you created, findings
 *   Sources    the connectors its agent reaches (connected or not), and the tools it called
 * Each card folds open/closed, all closed to start; only the Setup card is always open.
 */

// Every part, including those nested inside sub agents' runs
const flatten = (parts: Part[]): Part[] => parts.flatMap((p) => (p.type === "agent" ? [p, ...flatten(p.parts)] : [p]))
const uniq = <T,>(xs: T[], key: (x: T) => string) => [...new Map(xs.map((x) => [key(x), x])).values()]
const entityIcons: Record<Entity["kind"], LucideIcon> = { asset: Cloud, team: Users, repo: GitPullRequest, url: Link, trigger: Sparkles }
// ponytail: a rough context meter (characters / 4 ≈ tokens, out of a 200k window); real numbers come from the model
const WINDOW = 200_000

export function ConversationInfo({ conv, onOpenCve }: { conv: Conversation; onOpenCve: (id: string) => void }) {
  const sa = getSuperAgent(conv.superAgentId)
  const all = conv.messages.flatMap((m) => flatten(m.parts))
  const userText = conv.messages.filter((m) => m.role === "user").flatMap((m) => m.parts).map((p) => (p.type === "text" ? p.text : "")).join(" ")

  // Context
  const cves = uniq(userText.match(/CVE-\d{4}-\d+/g) ?? [], (x) => x)
  const entities = uniq(all.flatMap((p) => (p.type === "tool" && p.result?.type === "finding" ? p.result.entities ?? [] : [])), (e) => `${e.kind}:${e.label}`)
  const owners = all.flatMap((p) => (p.type === "tool" && p.result?.type === "owner-trace" ? [{ kind: "team" as const, label: p.result.team }] : []))
  const touched = uniq([...entities, ...owners], (e) => `${e.kind}:${e.label}`).filter((e) => e.kind !== "trigger" && !e.label.startsWith("+")) // "+11 more" is a summary, not a thing
  const memories = all.flatMap((p) => (p.type === "memory" ? [p.text] : []))
  const scope = conv.setup?.assets ? `${conv.setup.assets} assets` : sa?.scope ? `${sa.scope.assets} assets` : undefined
  const tokens = Math.round(JSON.stringify(conv.messages).length / 4)
  const used = Math.min(100, Math.max(1, Math.round((tokens / WINDOW) * 100)))

  // Sub agents, outputs, sources
  const ran = all.filter((p): p is Extract<Part, { type: "agent" }> => p.type === "agent")
  // With an agent: its lineup, each with its run here if any; without one: whatever ran
  const lineup: { kind: AgentKind; part?: Extract<Part, { type: "agent" }> }[] = sa
    ? sa.pattern.flat().map((kind) => ({ kind, part: ran.findLast((p) => p.agent === kind) }))
    : uniq(ran, (p) => p.agent).map((p) => ({ kind: p.agent, part: p }))
  const outcomes = sa ? agentOutcomes[sa.clonedFrom ?? sa.id] : undefined
  const approvals = all.filter((p): p is Extract<Part, { type: "approval" }> => p.type === "approval")
  const created = all.find((p): p is Extract<Part, { type: "task" }> => p.type === "task" && !!p.created)
  const findings = all.flatMap((p) => (p.type === "tool" && p.result?.type === "finding" ? [p.result.title] : []))
  const tools = uniq(all.filter((p): p is Extract<Part, { type: "tool" }> => p.type === "tool"), (t) => t.name)

  return (
    // Floats: no column edge or background, just cards with a soft shadow, starting under the toggle
    <aside aria-label="Conversation info" className="flex h-full w-[20rem] shrink-0 flex-col gap-2.5 overflow-y-auto pt-14 pr-4 pb-4">
      {(conv.setup || created) && <SetupCard setup={conv.setup} created={!!created} assets={conv.setup?.assets ?? created?.assets} name={sa?.name} />}

      <Fold title="Context" aside={<Meter value={used} />}>
        <p className="text-xs text-muted-foreground">~{tokens.toLocaleString()} of {WINDOW / 1000}k tokens</p>
        <Group label="Scope" show={!!scope}>
          <Chip icon={Layers}>{scope!}</Chip>
        </Group>
        <Group label="Findings" show={cves.length > 0}>
          {cves.map((c) => <Chip key={c} icon={ShieldAlert} onClick={() => onOpenCve(c)}>{c}</Chip>)}
        </Group>
        <Group label="Touched" show={touched.length > 0}>
          {touched.map((e) => <Chip key={`${e.kind}:${e.label}`} icon={entityIcons[e.kind]}>{e.label}</Chip>)}
        </Group>
        <Group label="Memory" show={memories.length > 0}>
          <ul className="w-full space-y-1.5">
            {memories.map((m) => (
              <li key={m} className="flex gap-2 text-xs leading-snug text-muted-foreground">
                <Brain className="mt-px size-3.5 shrink-0" /> {m}
              </li>
            ))}
          </ul>
        </Group>
        {!scope && !cves.length && !touched.length && !memories.length && <Empty>Nothing loaded yet.</Empty>}
      </Fold>

      <Fold title="Sub agents" count={lineup.length}>
        {lineup.length === 0 ? <Empty>None ran yet.</Empty> : (
          <ul className="space-y-2">
            {lineup.map((s) => <SubRow key={s.kind} kind={s.kind} part={s.part} />)}
          </ul>
        )}
      </Fold>

      <Fold title="Outputs" count={(outcomes?.length ?? 0) + approvals.length + (created ? 1 : 0) + findings.length}>
        <Group label="Can end in" show={!!outcomes}>
          <Outcomes items={outcomes ?? []} />
        </Group>
        <Group label="Produced here" show={approvals.length + (created ? 1 : 0) + findings.length > 0}>
          <ul className="w-full space-y-1.5">
            {approvals.map((a) => <Row key={a.title} icon={GitPullRequest} label={a.title} sub={`${a.repo} · waiting on you`} tone="warn" />)}
            {created && <Row icon={Box} label={getSuperAgent(created.superAgentId)?.name ?? "New agent"} sub={`Agent created · ${created.assets} assets`} />}
            {findings.map((f) => <Row key={f} icon={FileCheck2} label={f} sub="Finding" />)}
          </ul>
        </Group>
        {!outcomes && approvals.length + (created ? 1 : 0) + findings.length === 0 && <Empty>Nothing yet.</Empty>}
      </Fold>

      <Fold title="Sources" count={(sa?.tools.length ?? 0) + tools.length}>
        {sa && (
          <Group label="Connectors" show>
            {sa.tools.map((t) => (
              <span key={t.name} className="inline-flex h-6 items-center gap-1.5 rounded-md border bg-card px-2 text-xs">
                <span className={cn("size-1.5 rounded-full", t.connected ? "bg-success" : "bg-muted-foreground/40")} />
                {t.name}
              </span>
            ))}
          </Group>
        )}
        <Group label="Tools called" show={tools.length > 0}>
          <ul className="w-full space-y-1">
            {tools.map((t) => (
              <li key={t.name} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Wrench className="size-3.5 shrink-0" /> <span className="truncate font-mono">{t.name}</span>
              </li>
            ))}
          </ul>
        </Group>
        {!sa && tools.length === 0 && <Empty>No tools called yet.</Empty>}
      </Fold>
    </aside>
  )
}

// Every card floats: rounded, hairline edge, a soft drop shadow
const float = "rounded-2xl border bg-card shadow-[0_1px_2px_#1018280a,0_8px_24px_-12px_#10182833]"

// Where you are while configuring an agent, as a short vertical stepper. The short path in lib/task-setup.ts:
// scope (pick assets, confirm the filter) → workflow (keep it or customize) → review & create
const steps: { title: string; stages: Setup["stage"][] }[] = [
  { title: "Scope", stages: ["assets", "confirm-assets"] },
  { title: "Workflow", stages: ["keep-flow", "agents", "customizing", "review-structure", "trigger"] },
  { title: "Review & create", stages: ["approve"] },
]
function SetupCard({ setup, created, assets = 0, name }: { setup?: Setup; created: boolean; assets?: number; name?: string }) {
  const at = created ? steps.length : Math.max(0, steps.findIndex((s) => setup && s.stages.includes(setup.stage)))
  const note = (i: number) =>
    i === 0 ? assets > 0 ? `${assets} assets${at === 0 ? " found · confirm the filter" : ""}` : "Pick the assets it runs on"
    : i === 1 ? at > 1 ? (setup?.structure ? "Customized" : "As the template") : "Keep the flow or customize it"
    : created ? "Created · in My agents" : "Approve to create it"
  return (
    <section className={cn(float, "p-3")}>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-medium">{created ? `${name ?? "Agent"} is ready` : `Setting up ${name ?? "your agent"}`}</h3>
        <span className="text-xs text-muted-foreground tabular-nums">{Math.min(at + 1, steps.length)} of {steps.length}</span>
      </div>
      <ol className="relative space-y-3">
        <span aria-hidden className="absolute top-2.5 bottom-2.5 left-[9.5px] w-px bg-border" />
        {steps.map((s, i) => {
          const done = i < at, now = i === at
          return (
            <li key={s.title} aria-current={now ? "step" : undefined} className="relative flex gap-2.5">
              <span className={cn(
                "relative flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums",
                done ? "bg-blue text-white" : now ? "bg-card text-blue ring-2 ring-blue" : "bg-card text-muted-foreground ring-1 ring-border",
              )}>
                {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                {now && <span className="absolute inset-0 animate-ping rounded-full ring-2 ring-blue/40" />}
              </span>
              <span className="min-w-0 pt-px">
                <span className={cn("block text-sm leading-tight", now ? "font-medium" : done ? "" : "text-muted-foreground")}>{s.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{note(i)}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

// A card that folds: title (+ count or a meter) and a chevron. Closed to start
function Fold({ title, count, aside, defaultOpen = false, children }: { title: string; count?: number; aside?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className={float}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full cursor-pointer items-center gap-1.5 px-3 py-2.5 text-left">
        <span className="text-sm font-medium">{title}</span>
        <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", !open && "-rotate-90")} />
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">{aside ?? count}</span>
      </button>
      {open && <div className="space-y-3 px-3 pb-3">{children}</div>}
    </section>
  )
}

// The context meter: a percentage and a small bar
const Meter = ({ value }: { value: number }) => (
  <span className="flex items-center gap-2">
    {value}%
    <span className="h-1.5 w-8 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-blue" style={{ width: `${value}%` }} /></span>
  </span>
)

function Group({ label, show, children }: { label: string; show: boolean; children: React.ReactNode }) {
  if (!show) return null
  return (
    <div className="space-y-1.5">
      <h3 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</h3>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function Chip({ icon: Icon, onClick, children }: { icon: LucideIcon; onClick?: () => void; children: string }) {
  const cls = "inline-flex h-6 max-w-full items-center gap-1.5 rounded-md border bg-card px-2 text-xs whitespace-nowrap"
  const inner = <><Icon className="size-3 shrink-0 text-muted-foreground" /><span className="truncate">{children}</span></>
  return onClick
    ? <button onClick={onClick} className={cn(cls, "cursor-pointer text-blue transition-colors hover:bg-wash")}>{inner}</button>
    : <span className={cls}>{inner}</span>
}

function SubRow({ kind, part }: { kind: AgentKind; part?: Extract<Part, { type: "agent" }> }) {
  const { icon: Icon, name } = agents[kind]
  return (
    <li className="flex items-center gap-2.5">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted"><Icon className="size-3" /></span>
      <span className="min-w-0 flex-1 truncate text-sm">{name.replace(/ agent$/, "")}</span>
      {part
        ? <span className="shrink-0 [&>*]:h-5 [&>*]:text-[11px]"><AgentStatusBadge status={part.status} verdict={part.verdict} /></span>
        : <span className="shrink-0 text-[11px] text-muted-foreground">Not run yet</span>}
    </li>
  )
}

function Row({ icon: Icon, label, sub, tone }: { icon: LucideIcon; label: string; sub: string; tone?: "warn" }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md", tone === "warn" ? "bg-warning-wash text-warning" : "bg-muted text-muted-foreground")}>
        <Icon className="size-3" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{sub}</span>
      </span>
    </li>
  )
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-xs text-muted-foreground">{children}</p>

// The button that opens it, for the chat's top-right corner
export function InfoToggle({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={open}
      aria-label={open ? "Hide conversation info" : "Show conversation info"}
      title="Conversation info"
      className={cn(
        "flex size-8 cursor-pointer items-center justify-center rounded-lg border bg-card text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-foreground",
        open && "bg-wash text-blue hover:bg-wash hover:text-blue",
      )}
    >
      <InfoGlyph />
    </button>
  )
}
// Two stacked lines with dots: "a list of what's here" (like the harness panels' icon)
const InfoGlyph = () => (
  <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
    <rect x="2" y="2.5" width="12" height="11" rx="2.5" />
    <path d="M5 6.25h.01M7.25 6.25H11M5 9.75h.01M7.25 9.75H11" />
  </svg>
)
