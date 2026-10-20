import { useState } from "react"
import { Activity, ArrowUp, BookOpen, Bot, Check, ChevronDown, ChevronRight, ChevronUp, Copy, FileText, Flag, GitFork, Hand, ListTree, MessageSquareText, Workflow, X, Zap, type LucideIcon } from "lucide-react"
import { RivalMark } from "@/components/nav-icons"
import { MessageResponse } from "@/components/ai-elements/message"
import { agents, type AgentKind } from "@/components/chat/agents"
import { Outcomes } from "@/components/tasks/outcomes"
import { WorkflowCanvas } from "@/components/tasks/workflow-canvas"
import { agentOutcomes } from "@/data/outcomes"
import { ScheduleTab, skillMd, slug } from "@/components/super-agent-panel"
import { TriggersSection } from "@/components/tasks/triggers"
import { ColorTile, colorFor } from "@/components/tasks/color-tile"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { blockers, type SuperAgent } from "@/data/super-agents"
import { days, ordinal, useTriggers, when, type Schedule } from "@/lib/triggers"
import { EnableSwitch } from "@/components/tasks/enable-switch"
import { useEnabled } from "@/lib/enabled"
import { cn } from "@/lib/utils"
import { CategoryList } from "@/components/category-tag"

/*
 * One task template, in a panel on the right of the Task templates page (pages/gallery.tsx), styled like the
 * Rival Harness agent sheet: a top bar (step through the cards: down / 1 of n / up; copy link, close), the agent's colour tile and a Geist title,
 * hairline dividers, ink tabs with icons, section headers with their icon in a soft square. Kept light:
 *   Name, its properties (created by, capabilities, context as on its card; scope and trigger on your own),
 *   Use Agent at the bottom.
 *   Tabs: Overview (description, outcomes a run ends in, the prompt it runs with, how it works) · Skills (n), plus Schedule on your own tasks.
 * wide: the workflow as the zoomable flow chart (workflow-canvas.tsx) instead of the timeline.
 */

type Tab = "overview" | "skills" | "triggers" | "schedule"

export function TemplateDetail({ sa, color, nav, categories, capability, context, onUse, onClose, wide }: {
  sa: SuperAgent; color?: string; onUse: (sa: SuperAgent) => void; onClose: () => void; wide?: boolean
  nav?: DrawerNav // step through the cards it was opened from
  categories?: string[] // as on its card
  capability?: { label: string; icon: LucideIcon } // as on its card; else "Read only"
  context?: React.ReactNode // its sources as on its card (the tool marks); else the source stack
}) {
  const [tab, setTab] = useState<Tab>("overview")
  const [openSkill, setOpenSkill] = useState<SuperAgent["skills"][number] | null>(null)
  const Icon = sa.icon
  const accent = color ?? colorFor(sa.name) // the agent's colour (its tile, the prompt card)
  const setup = blockers(sa).length > 0
  const tabs: { id: Tab; label: string; icon: LucideIcon; count?: number }[] = [
    { id: "overview", label: "Overview", icon: ListTree },
    { id: "skills", label: "Skills", icon: BookOpen, count: sa.skills.length },
    ...(sa.custom ? [{ id: "triggers" as const, label: "Triggers", icon: Zap }, { id: "schedule" as const, label: "Activity", icon: Activity }] : []),
  ]
  const Cap = capability?.icon
  const pad = wide ? "px-6" : "px-5"
  const scope = scopeOf(sa)
  const outcomes = agentOutcomes[sa.clonedFrom ?? sa.id]
  const trigger = triggerLabel(useTriggers(sa))

  return (
    // ⌘⏎ / Ctrl+⏎ anywhere in the panel uses it (on the panel, not the window, so only the focused drawer reacts)
    <div className="flex h-full min-h-0 flex-col bg-popover" onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onUse(sa) } }}>
      {/* ---------- Top bar: where you are, and the actions ---------- */}
      <DrawerTopBar nav={nav} onClose={onClose} pad={pad}>
        {sa.custom && <EnabledToggle id={sa.id} name={sa.name} />}
      </DrawerTopBar>

      {/* ---------- Name + properties ---------- */}
      <div className={cn("shrink-0 space-y-5 pt-5 pb-5", pad)}>
        <div className="flex items-center gap-3">
          <ColorTile color={accent} icon={Icon} />
          <h2 className="min-w-0 font-title text-2xl leading-[1.1] font-medium tracking-[-0.015em] [--title-wght:450]">{sa.name}</h2>
          {setup && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-wash px-2 py-px text-xs font-semibold whitespace-nowrap text-warning">
              <span aria-hidden className="size-1.5 rounded-full bg-warning" />
              Needs setup
            </span>
          )}
        </div>
        {/* Only what tells it apart: who made it, its category, what it may do, what it reads from (scope and trigger on your own) */}
        <dl className="flex flex-wrap gap-x-10 gap-y-3">
          {!sa.custom && <Prop label="Created by"><span className="flex items-center gap-1.5"><RivalMark className="size-3.5 text-[#0350d0]" />Rival</span></Prop>}
          {categories && <Prop label="Category"><CategoryList categories={categories} /></Prop>}
          <Prop label="Capabilities">
            {Cap ? <span className="flex items-center gap-1.5"><Cap className="size-3.5 text-muted-foreground" strokeWidth={1.75} />{capability.label}</span> : "Read only"}
          </Prop>
          {sa.custom && <Prop label="Scope" title={scope.full}>{scope.short}</Prop>}
          {sa.custom && <Prop label="Trigger" title={trigger.full}>{trigger.short}</Prop>}
          <Prop label="Context" title={sa.tools.map((t) => `${t.name}${t.connected ? "" : t.required ? " (required, not connected)" : " (not connected)"}`).join(", ")}>
            {context ?? <SourceStack tools={sa.tools} />}
          </Prop>
        </dl>
      </div>

      {/* ---------- Tabs: an icon with each; the active one in ink with an ink line under it ---------- */}
      <DrawerTabs tabs={tabs} active={tab} onChange={setTab} pad={pad} />

      <div role="tabpanel" className={cn("min-h-0 flex-1 overflow-y-auto py-5 text-sm", wide ? "flex flex-col" : "", pad)}>
        {tab === "overview" && (
          <div className={wide ? "flex min-h-0 flex-1 flex-col gap-6" : "space-y-6"}>
            <Section icon={FileText} title="Description">
              <p className="leading-normal text-pretty">{sa.tagline}</p>
            </Section>
            {outcomes && (
              <Section icon={Flag} title="Outcomes">
                <Outcomes items={outcomes} />
              </Section>
            )}
            <Section icon={MessageSquareText} title="Prompt">
              {/* The prompt as what it is: a message ready to send. A white card like the chat
                  composer, with a small send mark in the corner (decorative; Use Agent starts it) */}
              <div className="flex items-end gap-3 rounded-xl border bg-card py-3 pr-3 pl-4">
                <p className="min-w-0 flex-1 self-center text-[0.9375rem] leading-normal text-pretty text-foreground">{sa.prompt ?? sa.briefs[0]}</p>
                <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"><ArrowUp className="size-3.5" /></span>
              </div>
            </Section>
            <Section icon={Workflow} title="How it works" grow={wide}>
              {wide ? (
                // The zoomable flow chart, minimal; fills the rest of the panel (drag pans, pinch or ⌘ + scroll zooms)
                <div className="min-h-64 flex-1 overflow-hidden rounded-xl border">
                  <WorkflowCanvas sa={sa} noRoles scrollPage />
                </div>
              ) : (
                <Steps pattern={sa.pattern} />
              )}
            </Section>
          </div>
        )}

        {tab === "skills" && (
          <ul className="divide-y divide-hairline overflow-hidden rounded-xl border bg-card">
            {sa.skills.map((s) => (
              <li key={s.name}>
                <button onClick={() => setOpenSkill(s)} className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-wash/45">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{s.name}</span>
                    <span className="block text-xs text-muted-foreground">{s.detail}</span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-blue">
                    <FileText className="size-3.5" /> SKILL.md <ChevronRight className="size-3.5" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {tab === "triggers" && sa.custom && <TriggersSection sa={sa} />}
        {tab === "schedule" && sa.custom && <ScheduleTab sa={sa} noTriggers />}
      </div>

      {/* ---------- Use it: always at the bottom ---------- */}
      <div className={cn("flex shrink-0 justify-end border-t border-hairline py-3", pad)}>
        <button
          onClick={() => onUse(sa)}
          className={cn("flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80", !wide && "w-full")}
        >
          Use Agent
          <kbd className="rounded bg-white/15 px-1.5 py-px font-sans text-xs text-primary-foreground/85">⌘⏎</kbd>
        </button>
      </div>

      <Dialog open={!!openSkill} onOpenChange={(o) => !o && setOpenSkill(null)}>
        <DialogContent className="max-h-[85svh] gap-3 overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">{openSkill && `skills/${slug(openSkill.name)}/SKILL.md`}</DialogTitle>
            <DialogDescription>{openSkill?.name} · {sa.name}</DialogDescription>
          </DialogHeader>
          {openSkill && <MessageResponse>{"```markdown\n" + skillMd(sa, openSkill) + "```"}</MessageResponse>}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// The workflow as a quiet vertical timeline: one icon per agent, a line between steps.
// Agents that run at the same time share a dashed outline marked "In parallel", the line passing through it.
// Also the workflow card in chat while you set an agent up (components/tasks/workflow-mini.tsx), so both read the same.
export function Steps({ pattern, approval }: { pattern: AgentKind[][]; approval?: (kind: AgentKind) => boolean }) {
  return (
    <ol className="relative">
      {/* The rail, through the middle of the icons */}
      <span aria-hidden className="absolute top-3 bottom-3 left-[13.5px] w-px bg-border" />
      {pattern.map((group, i) => (
        <li key={i} className="relative pb-4 last:pb-0">
          {group.length === 1 ? (
            <Step kind={group[0]} approval={approval?.(group[0])} />
          ) : (
            <div className="relative -mx-2 rounded-xl border border-dashed border-line px-2 py-2.5">
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-xs font-semibold text-blue">
                <GitFork className="size-3" /> In parallel
              </span>
              <div className="space-y-3">
                {group.map((kind) => <Step key={kind} kind={kind} approval={approval?.(kind)} />)}
              </div>
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}

function Step({ kind, approval }: { kind: AgentKind; approval?: boolean }) {
  const { name, icon: Icon, short } = agents[kind]
  return (
    <div className="flex items-center gap-3">
      {/* bg-popover under the tile: the timeline's rail must not show through its light wash */}
      <span className="relative rounded-[0.3125rem] bg-popover"><ColorTile color={colorFor(`sub:${kind}`)} icon={Icon} size="sm" /></span>
      <span className="min-w-0">
        <span className="block leading-tight font-medium">{name.replace(/ agent$/, "")}</span>
        <span className="block text-xs text-muted-foreground">{short}</span>
      </span>
      {approval && (
        <span className="ml-auto inline-flex h-5 shrink-0 items-center gap-1 rounded-md bg-amber-500/10 px-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-500">
          <Hand className="size-3" /> Needs approval
        </span>
      )}
    </div>
  )
}

// Sources: the tools it reaches, as overlapping monogram tiles in each brand's color (no logo files in the demo),
// at most 3 then "+N". Not connected = faded with a dashed edge. The names and states show on hover (Prop's title).
// ponytail: a compact first pass; a fuller Sources section (states, Connect) can come later
const brand: Record<string, string> = {
  Wiz: "#2b5cff", Snyk: "#4c4a73", GitHub: "#24292f", Jira: "#0052cc", Slack: "#4a154b", AWS: "#ff9900", GCP: "#4285f4",
  Okta: "#007dc1", Cloudflare: "#f38020", PagerDuty: "#06ac38", Vanta: "#5a2ae8", "Google Drive": "#1fa463", ArgoCD: "#ef7b4d",
}
function SourceStack({ tools }: { tools: SuperAgent["tools"] }) {
  const shown = tools.slice(0, 3)
  return (
    <span className="flex items-center pt-0.5">
      {shown.map((t, i) => (
        <span
          key={t.name}
          aria-hidden
          style={{ backgroundColor: brand[t.name], zIndex: shown.length - i }}
          className={cn(
            "relative flex size-5 items-center justify-center rounded-md text-[10px] leading-none font-semibold text-white ring-2 ring-popover",
            i > 0 && "-ml-1.5",
            !brand[t.name] && "bg-muted text-muted-foreground",
            !t.connected && "opacity-45 outline outline-1 outline-dashed outline-offset-[-1px] outline-muted-foreground",
          )}
        >
          {t.name[0]}
        </span>
      ))}
      {tools.length > shown.length && <span className="ml-1 text-xs text-muted-foreground tabular-nums">+{tools.length - shown.length}</span>}
      <span className="sr-only">{tools.map((t) => t.name).join(", ")}</span>
    </span>
  )
}

// Enabled / Disabled for one of your agents or a sub agent, top right of its panel (left of ✕): a small outlined
// button with the switch and its state in words. The cards only show the result (faded, "Stopped").
export function EnabledToggle({ id, name }: { id: string; name: string }) {
  const { isEnabled } = useEnabled()
  const on = isEnabled(id)
  return (
    <span className="flex h-7 shrink-0 items-center gap-2 rounded-lg border bg-card pr-2 pl-2.5 text-xs font-medium">
      <span className={on ? "text-foreground" : "text-muted-foreground"}>{on ? "Enabled" : "Disabled"}</span>
      <EnableSwitch id={id} name={name} />
    </span>
  )
}

// A section header: its icon in a soft square (a light fill and hairline edge), then the title in ink
export function Section({ icon: Icon, title, grow, children }: { icon: typeof Bot; title: string; grow?: boolean; children: React.ReactNode }) {
  return (
    <section className={cn("flex flex-col gap-3", grow && "min-h-0 flex-1")}>
      <h3 className="flex items-center gap-2 text-sm leading-5 font-medium text-foreground">
        <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-[0.25rem] border border-hairline bg-foreground/[0.035] text-foreground/60">
          <Icon className="size-3" strokeWidth={2} />
        </span>
        {title}
      </h3>
      {children}
    </section>
  )
}

// The drawer's top bar. Left: down / "1 / 9" / up, to step through the cards it was opened from (down = next,
// up = previous; off at either end). Right: actions, copy link, close. No breadcrumbs.
export type DrawerNav = { index: number; total: number; onPrev: () => void; onNext: () => void }
const barBtn = "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
export function DrawerTopBar({ nav, onClose, pad = "px-5", children }: { nav?: DrawerNav; onClose: () => void; pad?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    try { navigator.clipboard.writeText(window.location.href).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400) }, () => {}) } catch { /* ok */ }
  }
  return (
    <div className={cn("flex h-12 shrink-0 items-center gap-3 border-b border-hairline", pad)}>
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {nav && nav.index >= 0 && (
          <>
            <button onClick={nav.onNext} disabled={nav.index >= nav.total - 1} aria-label="Next agent" title="Next" className={cn(barBtn, "-ml-1.5")}>
              <ChevronDown className="size-4" />
            </button>
            <span className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
              <span className="text-foreground">{nav.index + 1}</span> / {nav.total}
            </span>
            <button onClick={nav.onPrev} disabled={nav.index <= 0} aria-label="Previous agent" title="Previous" className={barBtn}>
              <ChevronUp className="size-4" />
            </button>
          </>
        )}
      </div>
      {children}
      <button onClick={copy} aria-label="Copy link" title={copied ? "Copied" : "Copy link"} className={barBtn}>
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </button>
      <button onClick={onClose} aria-label="Close" title="Close" className={barBtn}>
        <X className="size-4" />
      </button>
    </div>
  )
}

// Tabs with an icon each; the active one in ink with an ink line under it, the rest muted
export function DrawerTabs<T extends string>({ tabs, active, onChange, pad = "px-5" }: { tabs: { id: T; label: string; icon: LucideIcon; count?: number }[]; active: T; onChange: (t: T) => void; pad?: string }) {
  return (
    <div role="tablist" className={cn("flex shrink-0 gap-6 border-b border-hairline", pad)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "-mb-px flex shrink-0 cursor-pointer items-center gap-1.5 border-b-2 py-2.5 text-sm font-medium transition-colors",
            active === t.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <t.icon className="size-4" strokeWidth={1.75} />
          {t.label}
          {t.count !== undefined && <span className="rounded-[0.1875rem] bg-foreground/[0.06] px-1.5 text-xs leading-4 tabular-nums">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export const Prop = ({ label, title, children }: { label: string; title?: string; children: React.ReactNode }) => (
  <div className="min-w-0 shrink-0 space-y-0.5">
    <dt className="text-xs whitespace-nowrap text-muted-foreground">{label}</dt>
    <dd className="truncate text-sm whitespace-nowrap" title={title}>{children}</dd>
  </div>
)

// Scope: yours = the assets picked while creating it ("321 assets", the filter on hover); a template = the assets it
// usually runs on, kept short to fit the one-row properties (the full scope on hover)
const templateScope: Record<string, [string, string]> = {
  triage: ["Prod assets", "All production assets, every scanner"],
  "patch-pilot": ["All repos", "Every repository with dependency scanning"],
  "exposure-hunter": ["Public assets", "Internet-facing assets across all clouds"],
  "injection-shield": ["AI agents", "Every AI agent with tool access"],
  "leak-sentinel": ["AI agents", "Every AI agent that handles customer data"],
  "red-team-drill": ["Staging", "A staging replica of one AI agent"],
  "audit-ready": ["AI agents", "Every AI agent and its permissions"],
}
function scopeOf(sa: SuperAgent) {
  if (sa.scope) return { short: `${sa.scope.assets} assets`, full: sa.scope.label }
  const [short, full] = templateScope[sa.clonedFrom ?? sa.id] ?? ["Your assets", "Your assets"]
  return { short, full }
}
// Trigger: what's switched on besides On demand (components/tasks/triggers.tsx); a template shows its suggested schedule.
// Short enough for the one-row properties ("Mon · 09:00"); the full wording on hover
const brief = (s: Schedule) => `${s.every === "day" ? "Daily" : s.every === "week" ? days[s.day ?? 1].slice(0, 3) : ordinal(s.day ?? 1)} · ${s.time}`
function triggerLabel(t: ReturnType<typeof useTriggers>) {
  if (t.schedule.on && t.event.on) return { short: "Schedule + event", full: `${when(t.schedule)}, and on ${t.event.event.toLowerCase()}` }
  if (t.schedule.on) return { short: brief(t.schedule), full: when(t.schedule) }
  if (t.event.on) return { short: "On event", full: t.event.event }
  return { short: "On demand", full: "Only when you ask it" }
}
