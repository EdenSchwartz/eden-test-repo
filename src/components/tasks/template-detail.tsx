import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Activity, Bot, ChevronRight, FileText, GitFork, Hand, Zap, type LucideIcon } from "lucide-react"

import { MessageResponse } from "@/components/ai-elements/message"
import { agents, type AgentKind } from "@/components/chat/agents"

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
import { ChevronDownIcon, ChevronUpIcon, OverviewIcon, PanelOutcomes, PanelPrompt, PanelProp, PanelRival, PanelSection, PanelSteps, PanelTags, PanelUseButton, SkillsIcon } from "@/components/tasks/panel-ui"

/*
 * One task template, in a panel on the right of the Task templates page (pages/gallery.tsx), styled like the
 * Rival Harness agent sheet: a top bar (step through the cards: down / 1 of n / up; close), the agent's colour tile and a Geist title,
 * hairline dividers, ink tabs with icons, section headers with their icon in a soft square. Kept light:
 *   Name, its properties (created by, capabilities, context as on its card; scope and trigger on your own),
 *   Use Agent at the bottom.
 *   Tabs: Overview (description, outcomes a run ends in, the prompt it runs with, how it works) · Skills (n), plus Schedule on your own tasks.
 * wide: the workflow as the zoomable flow chart (workflow-canvas.tsx) instead of the timeline.
 */

type Tab = "overview" | "skills" | "triggers" | "schedule"

export function TemplateDetail({ sa, color, mark, nav, crumbs, onOpenStep, categories, capabilities, context, onUse, onClose, wide }: {
  sa: SuperAgent; color?: string; onUse: (sa: SuperAgent) => void; onClose: () => void; wide?: boolean
  nav?: DrawerNav // step through the cards it was opened from
  crumbs?: Crumb[] // opened from inside another panel: breadcrumbs in place of the arrows
  onOpenStep?: (kind: AgentKind) => void // a step in How it works opens its sub agent
  mark?: React.ReactNode // the card idea's round mark, in place of the colour tile
  categories?: string[] // as on its card
  capabilities?: React.ReactNode // as on its card (the icons); else "Read only"
  context?: React.ReactNode // its sources as on its card (the tool marks); else the source stack
}) {
  const [tab, setTab] = useState<Tab>("overview")
  // The prompt types itself in once per agent picked (this panel mounts per agent); after that, switching tabs and
  // coming back shows it as is
  const promptShown = useRef(false)
  useEffect(() => { if (tab === "overview") promptShown.current = true }, [tab])
  const [openSkill, setOpenSkill] = useState<SuperAgent["skills"][number] | null>(null)
  const Icon = sa.icon
  const accent = color ?? colorFor(sa.name) // the agent's colour (its tile, the prompt card)
  const setup = blockers(sa).length > 0
  const tabs: { id: Tab; label: string; icon: LucideIcon; count?: number }[] = [
    { id: "overview", label: "Overview", icon: OverviewIcon },
    { id: "skills", label: "Skills", icon: SkillsIcon, count: sa.skills.length },
    ...(sa.custom ? [{ id: "triggers" as const, label: "Triggers", icon: Zap }, { id: "schedule" as const, label: "Activity", icon: Activity }] : []),
  ]
  const pad = wide ? "px-6" : "px-5"
  const scope = scopeOf(sa)
  const outcomes = agentOutcomes[sa.clonedFrom ?? sa.id]
  const trigger = triggerLabel(useTriggers(sa))

  return (
    // ⌘⏎ / Ctrl+⏎ anywhere in the panel uses it (on the panel, not the window, so only the focused drawer reacts)
    <div className="flex h-full min-h-0 flex-col bg-white" onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onUse(sa) } }}>
      {/* ---------- Top bar: where you are, and the actions ---------- */}
      <DrawerTopBar nav={crumbs ? undefined : nav} crumbs={crumbs} onClose={onClose} pad={pad}>
        {sa.custom && <EnabledToggle id={sa.id} name={sa.name} />}
      </DrawerTopBar>

      {/* ---------- Name + properties ---------- */}
      <div className={cn("flex shrink-0 flex-col items-start gap-5 py-5", pad)}>
        {/* the mark (44px, centred on the two lines), then the name (20/20) and 6px under it the one-line description
            (14/20, secondary) */}
        <div className="flex w-full min-w-0 items-center gap-3">
          {mark ?? <ColorTile color={accent} icon={Icon} />}
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <h2 className="min-w-0 font-sans text-title leading-5 font-medium tracking-[-0.3px] whitespace-nowrap text-fg-primary">{sa.name}</h2>
              {setup && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-wash px-2 py-px text-small font-semibold whitespace-nowrap text-warning">
                  <span aria-hidden className="size-1.5 rounded-full bg-warning" />
                  Needs setup
                </span>
              )}
            </div>
            <p className="text-body leading-5 text-pretty text-fg-secondary">{sa.tagline}</p>
          </div>
        </div>
        {/* Only what tells it apart: who made it, its category, what it may do, what it reads from (scope and trigger on your own) */}
        <dl className="flex w-[30.9375rem] max-w-full flex-nowrap items-center justify-between gap-x-4 overflow-hidden">
          {!sa.custom && <PanelProp label="Created by"><PanelRival /></PanelProp>}
          {categories && <PanelProp label="Category"><PanelTags items={categories} /></PanelProp>}
          <PanelProp label="Capabilities">
            {capabilities ?? <span className="text-body leading-5 text-fg-primary">Read only</span>}
          </PanelProp>
          {sa.custom && <PanelProp label="Scope" title={scope.full}><span className="text-body leading-5 text-fg-primary">{scope.short}</span></PanelProp>}
          {sa.custom && <PanelProp label="Trigger" title={trigger.full}><span className="text-body leading-5 text-fg-primary">{trigger.short}</span></PanelProp>}
          <PanelProp label="Context" title={context ? undefined : sa.tools.map((t) => `${t.name}${t.connected ? "" : t.required ? " (required, not connected)" : " (not connected)"}`).join(", ")}>
            {context ?? <SourceStack tools={sa.tools} />}
          </PanelProp>
        </dl>
      </div>

      {/* ---------- Tabs: an icon with each; the active one in ink with an ink line under it ---------- */}
      <DrawerTabs tabs={tabs} active={tab} onChange={setTab} pad={pad} />

      <div role="tabpanel" className={cn("min-h-0 flex-1 overflow-y-auto py-5 text-body", wide ? "flex flex-col" : "", pad)}>
        {tab === "overview" && (
          <div className={cn("flex flex-col gap-6", wide && "min-h-0 flex-1")}>
            {outcomes && (
              <PanelSection title="Outcomes">
                <PanelOutcomes items={outcomes} />
              </PanelSection>
            )}
            <PanelSection title="Prompt" gap="md">
              <PanelPrompt text={sa.prompt ?? sa.briefs[0]} play={!promptShown.current} />
            </PanelSection>
            <PanelSection title="How it works" gap="md" grow={wide}>
              {wide ? (
                // The zoomable flow chart, minimal; fills the rest of the panel (drag pans, pinch or ⌘ + scroll zooms)
                <div className="min-h-64 flex-1 overflow-hidden rounded-xl border">
                  <WorkflowCanvas sa={sa} noRoles scrollPage />
                </div>
              ) : (
                <PanelSteps pattern={sa.pattern} onOpen={onOpenStep} />
              )}
            </PanelSection>
          </div>
        )}

        {tab === "skills" && (
          <ul className="divide-y divide-hairline overflow-hidden rounded-xl border bg-card">
            {sa.skills.map((s) => (
              <li key={s.name}>
                <button onClick={() => setOpenSkill(s)} className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-wash/45">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{s.name}</span>
                    <span className="block text-small text-fg-secondary">{s.detail}</span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-small font-semibold text-blue">
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
      <div className={cn("flex shrink-0 justify-end border-t border-solid border-[#ebeced] py-3", pad)}>
        <PanelUseButton onClick={() => onUse(sa)} wide={wide} />
      </div>

      <Dialog open={!!openSkill} onOpenChange={(o) => !o && setOpenSkill(null)}>
        <DialogContent className="max-h-[85svh] gap-3 overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-body">{openSkill && `skills/${slug(openSkill.name)}/SKILL.md`}</DialogTitle>
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
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-small font-semibold text-blue">
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
        <span className="block text-small text-fg-secondary">{short}</span>
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
            !brand[t.name] && "bg-muted text-fg-secondary",
            !t.connected && "opacity-45 outline outline-1 outline-dashed outline-offset-[-1px] outline-muted-foreground",
          )}
        >
          {t.name[0]}
        </span>
      ))}
      {tools.length > shown.length && <span className="ml-1 text-small text-fg-secondary tabular-nums">+{tools.length - shown.length}</span>}
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
    <span className="flex h-7 shrink-0 items-center gap-2 rounded-lg border bg-card pr-2 pl-2.5 text-small font-medium">
      <span className={on ? "text-fg-primary" : "text-fg-secondary"}>{on ? "Enabled" : "Disabled"}</span>
      <EnableSwitch id={id} name={name} />
    </span>
  )
}

// A section header: its icon in a soft square (a light fill and hairline edge), then the title in ink
export function Section({ icon: Icon, title, grow, children }: { icon: typeof Bot; title: string; grow?: boolean; children: React.ReactNode }) {
  return (
    <section className={cn("flex flex-col gap-3", grow && "min-h-0 flex-1")}>
      <h3 className="flex items-center gap-2 text-body leading-5 font-medium text-fg-primary">
        <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-[0.25rem] border border-hairline bg-foreground/[0.035] text-foreground/60">
          <Icon className="size-3" strokeWidth={2} />
        </span>
        {title}
      </h3>
      {children}
    </section>
  )
}

// The drawer's top bar. Left: down / "1 / 9" / up, to step through the cards it was opened from (up = the next
// number, down = the one before; off at either end). Right: actions, close. No breadcrumbs.
export type DrawerNav = { index: number; total: number; onPrev: () => void; onNext: () => void }
// A panel opened from inside another (a step's sub agent, an agent a sub agent is part of) shows where you are
// instead: text-only breadcrumbs, the earlier ones secondary and clickable (back), the current one primary.
export type Crumb = { label: string; onClick?: () => void }
export function DrawerTopBar({ nav, crumbs, onClose, children }: { nav?: DrawerNav; crumbs?: Crumb[]; onClose: () => void; pad?: string; children?: React.ReactNode }) {
  return (
    // Figma 72:17972: 8px top and bottom, 16px sides, a #F0F0F0 line under it. Chevrons 12px in 4px-padded buttons
    // (#525252, #BDBDBD at either end); "1" Geist Medium 12 #101112, "/ 9" 12 #7C7C7C; ✕ 14px in a 24px button
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-solid border-[#f0f0f0] px-4 py-2">
      <div className="flex min-h-6 min-w-0 flex-1 items-center gap-1">
        {crumbs ? (
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-small leading-4 whitespace-nowrap">
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1
              return (
                <span key={i} className="flex min-w-0 items-center gap-1.5">
                  {i > 0 && <span aria-hidden className="text-fg-tertiary">/</span>}
                  {last || !c.onClick
                    ? <span className={cn("truncate", last ? "text-fg-primary" : "text-fg-secondary")} aria-current={last ? "page" : undefined}>{c.label}</span>
                    : <button onClick={c.onClick} className="cursor-pointer truncate text-fg-secondary transition-colors hover:text-fg-primary">{c.label}</button>}
                </span>
              )
            })}
          </nav>
        ) : nav && nav.index >= 0 && (
          <>
            <button onClick={nav.onPrev} disabled={nav.index <= 0} aria-label="Previous agent" title="Previous" className="flex cursor-pointer items-center justify-center rounded-[4px] p-1 text-fg-secondary transition-colors hover:bg-[#f5f5f5] disabled:cursor-default disabled:text-fg-tertiary disabled:hover:bg-transparent">
              <ChevronDownIcon className="size-3" />
            </button>
            <span className="flex items-center gap-1 tabular-nums whitespace-nowrap" aria-live="polite">
              <span className="text-small leading-4 font-medium text-fg-primary">{nav.index + 1}</span>
              <span className="text-small leading-5 text-fg-secondary">/</span>
              <span className="text-small leading-5 text-fg-secondary">{nav.total}</span>
            </span>
            <button onClick={nav.onNext} disabled={nav.index >= nav.total - 1} aria-label="Next agent" title="Next" className="flex cursor-pointer items-center justify-center rounded-[4px] p-1 text-fg-secondary transition-colors hover:bg-[#f5f5f5] disabled:cursor-default disabled:text-fg-tertiary disabled:hover:bg-transparent">
              <ChevronUpIcon className="size-3" />
            </button>
          </>
        )}
      </div>
      {children}
      <button onClick={onClose} aria-label="Close" title="Close" className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-[4px] transition-colors hover:bg-[#f5f5f5]">
        <svg viewBox="0 0 14 14" fill="none" aria-hidden className="size-3.5 text-fg-secondary"><path d="M3.5 3.5L7 7M7 7L10.5 10.5M7 7L10.5 3.5M7 7L3.5 10.5" stroke="currentColor" strokeLinecap="round" /></svg>
      </button>
    </div>
  )
}

// Tabs with an icon each; the active one in ink with an ink line under it, the rest muted
export function DrawerTabs<T extends string>({ tabs, active, onChange }: { tabs: { id: T; label: string; icon: LucideIcon; count?: number }[]; active: T; onChange: (t: T) => void; pad?: string }) {
  // One line for the row that glides to the selected tab: it measures the tab's content (the tab minus its 6px
  // sides) and eases its position and width there, slowly and softly. Placed without motion the first time.
  const row = useRef<HTMLDivElement>(null)
  const [line, setLine] = useState<{ left: number; width: number; ready: boolean } | null>(null)
  useLayoutEffect(() => {
    const place = () => {
      const el = row.current?.querySelector<HTMLElement>('[aria-selected="true"]')
      if (!el) return
      setLine((prev) => ({ left: el.offsetLeft + 6, width: el.offsetWidth - 12, ready: prev !== null }))
    }
    place()
    const ro = new ResizeObserver(place)
    if (row.current) ro.observe(row.current)
    return () => ro.disconnect()
  }, [active, tabs.length])
  return (
    // Figma 72:18210: 24px sides, a #ECECEC line under; tabs 12 apart, 6px top, 12 bottom, 6 sides, icon 16 + label
    // Geist 14, 4 apart; the selected one (label and icon) in primary, the rest secondary; the count on #FAFAFA
    <div ref={row} role="tablist" className="relative flex shrink-0 gap-3 border-b border-solid border-[#ececec] bg-white px-6">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "relative flex shrink-0 cursor-pointer items-center justify-center gap-1 px-1.5 pt-1.5 pb-3 text-body leading-5 transition-colors duration-300",
            active === t.id ? "text-fg-primary" : "text-fg-secondary hover:text-fg-primary",
          )}
        >
          <t.icon className={cn("size-4 shrink-0 transition-colors duration-300", active === t.id ? "text-fg-primary" : "text-fg-secondary")} strokeWidth={1.25} />
          {t.label}
          {/* the count: grey on #FAFAFA; on the selected tab, the Parallel chip's blue (#0350D0 on #ECF3FF), same small square shape */}
          {t.count !== undefined && <span className={cn("flex h-4 items-center rounded-[2px] px-1 text-small leading-4 tabular-nums transition-colors duration-300", active === t.id ? "bg-[#ecf3ff] text-[#0350d0]" : "bg-[#fafafa] text-fg-secondary")}>{t.count}</span>}
        </button>
      ))}
      {/* the selected tab's line: 2px, as wide as its content, on the row's bottom line */}
      {line && (
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-px left-0 h-[2px] bg-fg-primary"
          style={{
            width: line.width,
            transform: `translateX(${line.left}px)`,
            transition: line.ready ? "transform 280ms cubic-bezier(0.22, 1, 0.36, 1), width 280ms cubic-bezier(0.22, 1, 0.36, 1)" : "none",
          }}
        />
      )}
    </div>
  )
}

export const Prop = ({ label, title, children }: { label: string; title?: string; children: React.ReactNode }) => (
  <div className="min-w-0 shrink-0 space-y-0.5">
    <dt className="text-small whitespace-nowrap text-fg-secondary">{label}</dt>
    <dd className="truncate text-body whitespace-nowrap" title={title}>{children}</dd>
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
