import { useState } from "react"
import { Bot, ChevronRight, FileText, Flag, GitFork, MessageSquareText, Workflow, X } from "lucide-react"
import { MessageResponse } from "@/components/ai-elements/message"
import { agents, type AgentKind } from "@/components/chat/agents"
import { Outcomes } from "@/components/tasks/outcomes"
import { WorkflowCanvas } from "@/components/tasks/workflow-canvas"
import { agentOutcomes } from "@/data/outcomes"
import { ScheduleTab, skillMd, slug } from "@/components/super-agent-panel"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { blockers, type SuperAgent } from "@/data/super-agents"
import { days, ordinal, useTriggers, when, type Schedule } from "@/lib/triggers"
import { EnableSwitch } from "@/components/tasks/enable-switch"
import { useEnabled } from "@/lib/enabled"
import { cn } from "@/lib/utils"

/*
 * One task template, in a panel on the right of the Task templates page (pages/gallery.tsx), styled like the
 * Rival Harness agent sheet: a blue-washed icon and a Hubot Sans title, hairline dividers, blue line tabs,
 * small icon-led section labels, the prompt as a blue-ruled quote. Kept light for someone opening it the first time:
 *   Name, its properties (created by, agents, capabilities, time per run; scope and trigger on your own; sources as an
 *   icon stack), Use template at the bottom.
 *   Tabs: Overview (description, outcomes a run ends in, the prompt it runs with, how it works) · Skills (n), plus Schedule on your own tasks.
 * wide: the workflow as the zoomable flow chart (workflow-canvas.tsx) instead of the timeline.
 */

type Tab = "overview" | "skills" | "schedule"

export function TemplateDetail({ sa, onUse, onClose, wide }: { sa: SuperAgent; onUse: (sa: SuperAgent) => void; onClose: () => void; wide?: boolean }) {
  const [tab, setTab] = useState<Tab>("overview")
  const [openSkill, setOpenSkill] = useState<SuperAgent["skills"][number] | null>(null)
  const Icon = sa.icon
  const setup = blockers(sa).length > 0
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "skills", label: "Skills", count: sa.skills.length },
    ...(sa.custom ? [{ id: "schedule" as const, label: "Activity" }] : []),
  ]
  const pad = wide ? "px-6" : "px-5"
  const scope = scopeOf(sa)
  const outcomes = agentOutcomes[sa.clonedFrom ?? sa.id]
  const trigger = triggerLabel(useTriggers(sa))

  return (
    <div className="flex h-full min-h-0 flex-col bg-popover">
      {/* ---------- Name + metadata ---------- */}
      <div className={cn("shrink-0 space-y-4 pt-5 pb-4", pad)}>
        {/* Icon + name only (no subtitle: who made it is in Created by below) */}
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-wash text-blue [&_svg]:size-5">
            <Icon />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-title text-2xl leading-[1.1] font-medium tracking-[-0.015em] [--title-wght:450]">{sa.name}</h2>
              {setup && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-wash px-2 py-px text-xs font-semibold whitespace-nowrap text-warning">
                  <span aria-hidden className="size-1.5 rounded-full bg-warning" />
                  Needs setup
                </span>
              )}
            </div>
          </div>
          {sa.custom && <EnabledToggle id={sa.id} name={sa.name} />}
          <button
            onClick={onClose}
            aria-label="Close and show all templates"
            title="Close"
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        {/* Properties in one row, spread across the panel, each on one line (never wraps; the panel is 35rem for this, the widest that keeps two cards beside it at 1440).
            ponytail: capabilities are the same for every template in the demo. "from <template>" shows on Created by's hover */}
        <dl className="flex justify-between gap-x-4">
          {/* Your own: everything in My Agents is yours (the card shows your avatar), so no Created by; it makes room for Scope and Trigger */}
          {!sa.custom && <Prop label="Created by">Rival</Prop>}
          <Prop label="Agents">{sa.pattern.flat().length}</Prop>
          <Prop label="Capabilities">Read only</Prop>
          <Prop label="Time per run">~{sa.runtime}</Prop>
          {/* Scope and Trigger exist once you've made it yours (set while cloning and configuring it): not on a template */}
          {sa.custom && <Prop label="Scope" title={scope.full}>{scope.short}</Prop>}
          {sa.custom && <Prop label="Trigger" title={trigger.full}>{trigger.short}</Prop>}
          <Prop label="Sources" title={sa.tools.map((t) => `${t.name}${t.connected ? "" : t.required ? " (required, not connected)" : " (not connected)"}`).join(", ")}>
            <SourceStack tools={sa.tools} />
          </Prop>
        </dl>
      </div>

      {/* ---------- Tabs: blue line under the active one ---------- */}
      <div role="tablist" className={cn("flex shrink-0 gap-5 border-b border-hairline", pad)}>
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px flex shrink-0 cursor-pointer items-center gap-1.5 border-b-2 py-2.5 text-sm font-medium transition-colors",
              tab === t.id ? "border-blue text-blue" : "border-transparent text-foreground/60 hover:text-foreground",
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="text-xs tabular-nums opacity-70">{t.count}</span>}
          </button>
        ))}
      </div>

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
              <blockquote className="rounded-lg border-l-2 border-blue bg-frost px-3.5 py-2.5 leading-normal text-pretty text-foreground/85">
                {sa.prompt ?? sa.briefs[0]}
              </blockquote>
            </Section>
            <Section icon={Workflow} title="How it works" grow={wide}>
              {wide ? (
                // The zoomable flow chart, minimal; fills the rest of the panel (drag pans, pinch or ⌘ + scroll zooms)
                <div className="min-h-64 flex-1 overflow-hidden rounded-xl border">
                  <WorkflowCanvas sa={sa} noRoles scrollPage />
                </div>
              ) : (
                <Steps sa={sa} />
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

        {tab === "schedule" && sa.custom && <ScheduleTab sa={sa} />}
      </div>

      {/* ---------- Use it: always at the bottom ---------- */}
      <div className={cn("flex shrink-0 justify-end border-t border-hairline py-3", pad)}>
        <button
          onClick={() => onUse(sa)}
          className={cn("flex h-8 cursor-pointer items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80", !wide && "w-full")}
        >
          {sa.custom ? "Use agent" : "Use template"}
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
function Steps({ sa }: { sa: SuperAgent }) {
  return (
    <ol className="relative">
      {/* The rail, through the middle of the icons */}
      <span aria-hidden className="absolute top-3 bottom-3 left-[13.5px] w-px bg-border" />
      {sa.pattern.map((group, i) => (
        <li key={i} className="relative pb-4 last:pb-0">
          {group.length === 1 ? (
            <Step kind={group[0]} />
          ) : (
            <div className="relative -mx-2 rounded-xl border border-dashed border-line px-2 py-2.5">
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-xs font-semibold text-blue">
                <GitFork className="size-3" /> In parallel
              </span>
              <div className="space-y-3">
                {group.map((kind) => <Step key={kind} kind={kind} />)}
              </div>
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}

function Step({ kind }: { kind: AgentKind }) {
  const { name, icon: Icon, short } = agents[kind]
  return (
    <div className="flex items-center gap-3">
      <span className="relative flex size-7 shrink-0 items-center justify-center rounded-lg bg-wash text-blue">
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block leading-tight font-medium">{name.replace(/ agent$/, "")}</span>
        <span className="block text-xs text-muted-foreground">{short}</span>
      </span>
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

// A section with the reference sheet's label: small icon + 13px semibold, muted
export function Section({ icon: Icon, title, grow, children }: { icon: typeof Bot; title: string; grow?: boolean; children: React.ReactNode }) {
  return (
    <section className={cn("flex flex-col gap-2.5", grow && "min-h-0 flex-1")}>
      <h3 className="flex items-center gap-1.5 text-[13px] leading-[1.4] font-semibold text-foreground/70">
        <Icon className="size-3.5" />
        {title}
      </h3>
      {children}
    </section>
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
