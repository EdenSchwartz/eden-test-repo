import type { ReactNode } from "react"
import { ArrowRight, Bell, CalendarClock, Check, CircleCheck, Hand, Loader2, Pencil, Sparkles, Zap } from "lucide-react"
import { agents, type AgentKind } from "@/components/chat/agents"
import { SuperAgentOrb } from "@/components/super-agents"
import { configFor, rounds, type Draft, type Slot } from "@/data/clone-flow"
import type { SuperAgent } from "@/data/super-agents"
import { cn } from "@/lib/utils"

/*
 * The agent being built, live beside the clone chat (pages/clone.tsx). Also the map of where you are in the chat:
 *   Stepper:   Basics → Technical → Guardrails → Review, following the chat's rounds (follow-ups count as Guardrails).
 *   Sections:  the ones the open round is asking about are marked "Asking now"; later rounds' sections are dimmed.
 *              Each says where it stands: "From <template>" until an answer changes it, then "Yours",
 *              and it glows in the agent's hue for a moment when the chat just changed it. Change reopens that question.
 *   Footer:    Create (always reachable: unanswered questions keep Rival's defaults), then "Created" with a way to the gallery.
 */

export type Flashes = Partial<Record<string, number>> // section → change count; a new count replays the glow

const steps = ["Basics", "Technical", "Guardrails", "Review"]
// Which chat round a slot is asked in (follow-ups → Guardrails)
const stepOf = (s: Slot) => Math.min(2, Math.max(0, rounds.findIndex((r) => r.slots.includes(s))))

export function DraftPanel({ sa, draft, flashes, stage, asking, step, created, creating, onEdit, onCreate, onOpenGallery, className }: {
  sa: SuperAgent
  draft: Draft
  flashes: Flashes
  stage: "asking" | "review" | "created" | "busy"
  asking: Slot[] // the open round's questions
  step: number // where the chat is: 0 Basics, 1 Technical, 2 Guardrails, 3 Review (4 = created, all done)
  created?: SuperAgent | null
  creating: boolean
  onEdit: (slot: Slot) => void
  onCreate: (e: React.MouseEvent<HTMLButtonElement>) => void
  onOpenGallery: () => void
  className?: string
}) {
  const answered = (s: Slot) => draft.answered.includes(s)
  const changedTeam = JSON.stringify(draft.pattern) !== JSON.stringify(sa.pattern)
  const changedPerms = JSON.stringify(draft.autonomy) !== JSON.stringify(sa.autonomy) || !!draft.limits
  const tools = draft.tools.filter((t) => sa.tools.some((x) => x.name === t.name) || draft.needs.includes(t.name))
  const purposeDefault = configFor(sa).purposes[0].label
  // Where each section sits relative to the chat: being asked now, or coming in a later round
  const where = (...slots: Slot[]) => ({
    now: stage === "asking" && slots.some((s) => asking.includes(s)),
    later: stage === "asking" && slots.every((s) => !answered(s) && stepOf(s) > step),
  })
  const naming = stage === "asking" && asking.includes("name")

  return (
    <div style={{ "--hue": sa.hue } as React.CSSProperties} className={cn("flex min-h-0 flex-col text-[0.8125rem]", className)}>
      {/* Identity: the clone takes shape next to the template it came from */}
      <div
        className="relative shrink-0 overflow-hidden border-b px-5 pt-4 pb-4"
        style={{ background: `radial-gradient(ellipse at 90% 0%, oklch(0.6 0.14 ${sa.hue} / 0.32), transparent 65%), radial-gradient(circle, oklch(0.8 0.08 ${sa.hue} / 0.14) 1px, transparent 1.5px) 0 0 / 10px 10px` }}
      >
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <SuperAgentOrb sa={sa} size="sm" className="size-4 rounded-[4px] ring-0 [&_svg]:size-2.5" />
          {sa.name} <span className="opacity-60">by Rival</span>
          <ArrowRight className="size-3" />
          <span className="text-foreground">Your copy</span>
        </p>
        <div className="mt-3 flex items-center gap-3">
          <SuperAgentOrb sa={sa} size="md" className={cn("transition-[filter,opacity] duration-500", !answered("name") && "opacity-80 saturate-50")} />
          <div className="min-w-0 flex-1">
            <h2 key={draft.name} className={cn("truncate text-lg leading-tight font-semibold tracking-tight", answered("name") && "rise-in")} style={{ "--delay": "0ms" } as React.CSSProperties}>
              {draft.name}
            </h2>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              {created ? "Agent" : "Draft"} · {sa.category}
              {naming && <NowTag />}
            </p>
          </div>
        </div>
        <Stepper step={step} />
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
        <Section label="Mission" {...where("purpose")} flash={flashes.Mission} yours={answered("purpose") && !!draft.focus && draft.focus !== purposeDefault} answered={answered("purpose")} from={sa.name} onEdit={() => onEdit("purpose")}>
          <p className={cn("leading-relaxed", !draft.purpose && "text-muted-foreground")}>{draft.purpose ?? sa.about}</p>
        </Section>

        <Section label="Team" {...where("purpose")} now={false} flash={flashes.Team} yours={changedTeam} answered={answered("purpose")} from={sa.name}>
          <TeamList pattern={draft.pattern} template={sa.pattern} />
        </Section>

        <Section label="Scope" {...where("scope")} flash={flashes.Scope} yours={draft.scope.length > 0} answered={answered("scope")} from={sa.name} onEdit={() => onEdit("scope")}>
          {draft.scope.length ? <Chips items={draft.scope} /> : <p className="text-muted-foreground">Everything {sa.name} covers</p>}
        </Section>

        <Section label="Runs" {...where("trigger")} flash={flashes.Runs} yours={!!draft.trigger && draft.trigger.kind !== "manual"} answered={answered("trigger")} from={sa.name} onEdit={() => onEdit("trigger")}>
          <p className={cn("flex items-center gap-2", !draft.trigger && "text-muted-foreground")}>
            {draft.trigger?.kind === "event" ? <Zap className="size-3.5 shrink-0" /> : draft.trigger?.kind === "schedule" ? <CalendarClock className="size-3.5 shrink-0" /> : <Hand className="size-3.5 shrink-0" />}
            {draft.trigger?.label ?? "On demand, when you brief it"}
          </p>
        </Section>

        <Section label="Permissions" {...where("autonomy", "limits")} flash={flashes.Permissions} yours={changedPerms} answered={answered("autonomy")} from={sa.name} onEdit={() => onEdit("autonomy")}>
          <div className="space-y-2">
            <PermList icon={<Check className="size-3 text-muted-foreground" />} label="On its own" items={draft.autonomy.auto} />
            <PermList icon={<Hand className="size-3 text-amber-500" />} label="Asks you first" items={draft.autonomy.approval} empty="Nothing" />
            {draft.limits && draft.limits !== "None" && (
              <p className="flex items-start gap-2 rounded-md bg-foreground/5 px-2 py-1.5 text-xs"><span className="font-medium">Guardrail</span><span className="text-muted-foreground">{draft.limits}</span></p>
            )}
          </div>
        </Section>

        <Section label="Escalation" {...where("escalation")} flash={flashes.Escalation} yours={draft.escalation.length > 0} answered={answered("escalation")} from={sa.name} onEdit={() => onEdit("escalation")}>
          {draft.escalation.length ? <Chips items={draft.escalation} icon={<Bell className="size-3" />} /> : <p className="text-muted-foreground">In Rival only</p>}
        </Section>

        <Section label="Apps" {...where("connect")} later={false} flash={flashes.Apps} answered from={sa.name}>
          <div className="flex flex-wrap gap-1.5">
            {tools.map((t) => (
              <span key={t.name} className="inline-flex h-6 items-center gap-1.5 rounded-md border bg-background/50 px-2 text-xs">
                <span className={cn("size-1.5 rounded-full", t.connected ? "bg-emerald-500" : "bg-amber-500")} />
                {t.name}
                {!t.connected && <span className="text-amber-500">{t.required ? "required" : "not connected"}</span>}
              </span>
            ))}
          </div>
        </Section>
      </div>

      <div className="shrink-0 space-y-2 border-t bg-card px-4 pt-3 pb-4">
        {created ? (
          // Created: it lives in Super agents now; changes in the chat still update it
          <>
            <div className="flex items-center gap-2 text-sm">
              <CircleCheck className="size-4 shrink-0 text-emerald-500" />
              <span className="min-w-0 flex-1 truncate"><span className="font-medium">{created.name}</span> is created</span>
              <button onClick={onOpenGallery} className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent">
                Open in Tasks <ArrowRight className="size-3" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Keep chatting to change it. Every change saves to {created.name}.</p>
          </>
        ) : (
          <>
            <button
              onClick={onCreate}
              disabled={creating || draft.answered.length === 0}
              className={cn(
                "flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium transition-[background-color,opacity] disabled:cursor-not-allowed disabled:opacity-40",
                stage === "review" ? "bg-primary text-primary-foreground" : "border bg-background/40 hover:bg-accent",
              )}
            >
              {creating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {creating ? "Creating…" : stage === "review" ? `Create ${draft.name}` : "Create with defaults for the rest"}
            </button>
            <p className="text-center text-xs text-muted-foreground">The {sa.name} template stays as it is.</p>
          </>
        )}
      </div>
    </div>
  )
}

// Basics → Technical → Guardrails → Review, following the chat. Done = check, current = pulsing, later = hollow.
function Stepper({ step }: { step: number }) {
  return (
    <ol aria-label="Progress" className="mt-4 flex items-start">
      {steps.map((label, i) => {
        const done = i < step
        const now = i === step
        return (
          <li key={label} aria-current={now ? "step" : undefined} className="relative flex flex-1 flex-col items-center gap-1.5">
            {i > 0 && (
              <span aria-hidden className="absolute top-[9px] right-1/2 left-[-50%] h-0.5 overflow-hidden rounded-full bg-foreground/10">
                <span className={cn("block h-full bg-[oklch(0.72_0.13_var(--hue))] transition-[width] duration-700 ease-snappy", i <= step ? "w-full" : "w-0")} />
              </span>
            )}
            <span className={cn(
              "relative z-10 flex size-5 items-center justify-center rounded-full border-2 transition-colors duration-500",
              done ? "border-transparent bg-[oklch(0.62_0.15_var(--hue))] text-white"
                : now ? "border-[oklch(0.72_0.13_var(--hue))] bg-card"
                : "border-foreground/20 bg-card",
            )}>
              {done ? <Check className="size-3" strokeWidth={3} />
                : now && (
                  <>
                    <span className="absolute inset-0 animate-ping rounded-full bg-[oklch(0.72_0.13_var(--hue)/0.35)] motion-reduce:animate-none" />
                    <span className="size-2 rounded-full bg-[oklch(0.72_0.13_var(--hue))]" />
                  </>
                )}
            </span>
            <span className={cn("text-[11px]", now ? "font-medium text-foreground" : done ? "text-foreground/80" : "text-muted-foreground")}>{label}</span>
          </li>
        )
      })}
    </ol>
  )
}

const NowTag = () => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-[oklch(0.6_0.14_var(--hue)/0.15)] px-1.5 py-px text-[11px] font-medium text-[oklch(0.82_0.1_var(--hue))]">
    <span className="relative flex size-1.5">
      <span className="absolute inset-0 animate-ping rounded-full bg-[oklch(0.75_0.13_var(--hue))] motion-reduce:animate-none" />
      <span className="relative size-1.5 rounded-full bg-[oklch(0.75_0.13_var(--hue))]" />
    </span>
    Asking now
  </span>
)

function Section({ label, flash, yours, answered, now, later, from, onEdit, children }: {
  label: string; flash?: number; yours?: boolean; answered?: boolean; now?: boolean; later?: boolean; from: string; onEdit?: () => void; children: ReactNode
}) {
  return (
    <section
      key={flash} // a new change count remounts it, replaying the glow
      className={cn(
        "group/section rounded-xl border bg-background/40 px-3.5 py-3 transition-[opacity,border-color,box-shadow] duration-500",
        flash && "draft-flash",
        !answered && "border-dashed",
        now && "border-solid border-[oklch(0.72_0.13_var(--hue)/0.55)] shadow-[0_0_0_3px_oklch(0.6_0.14_var(--hue)/0.12)]",
        later && "opacity-55",
      )}
    >
      <h3 className="mb-2 flex h-5 items-center gap-2 text-xs">
        <span className="font-medium">{label}</span>
        {now ? <NowTag />
          : yours
            ? <span className="rounded-full bg-[oklch(0.6_0.14_var(--hue)/0.15)] px-1.5 py-px text-[11px] font-medium text-[oklch(0.8_0.1_var(--hue))]">Yours</span>
            : <span className="text-[11px] text-muted-foreground">From {from}</span>}
        {onEdit && answered && !now && (
          <button
            onClick={onEdit}
            className="ml-auto flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover/section:opacity-100 hover:bg-accent hover:text-foreground focus-visible:opacity-100"
          >
            <Pencil className="size-3" /> Change
          </button>
        )}
      </h3>
      {children}
    </section>
  )
}

const Chips = ({ items, icon }: { items: string[]; icon?: ReactNode }) => (
  <div className="flex flex-wrap gap-1.5">
    {items.map((s) => (
      <span key={s} className="rise-in inline-flex h-6 items-center gap-1.5 rounded-md border bg-muted/40 px-2 text-xs" style={{ "--delay": "0ms" } as React.CSSProperties}>
        {icon && <span className="text-muted-foreground">{icon}</span>}{s}
      </span>
    ))}
  </div>
)

function PermList({ icon, label, items, empty }: { icon: ReactNode; label: string; items: string[]; empty?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex w-24 shrink-0 items-center gap-1.5 pt-px text-xs font-medium">{icon} {label}</span>
      <ul className="min-w-0 flex-1 space-y-0.5 text-muted-foreground">
        {items.length ? items.map((a) => <li key={a}>{a}</li>) : <li>{empty}</li>}
      </ul>
    </div>
  )
}

// The team, stage by stage (agents in one stage run in parallel). Agents the template didn't have are tagged,
// and ones the clone dropped stay listed, struck through, so the change from the template is visible.
function TeamList({ pattern, template }: { pattern: AgentKind[][]; template: AgentKind[][] }) {
  const had = template.flat()
  const has = pattern.flat()
  const dropped = had.filter((k) => !has.includes(k))
  return (
    <div className="space-y-1.5">
      <ol className="space-y-1.5">
        {pattern.map((stage, i) => (
          <li key={i} className="flex items-center gap-2.5">
            <span className="w-3 text-right text-xs text-muted-foreground tabular-nums">{i + 1}</span>
            <span className="flex flex-wrap gap-1.5">
              {stage.map((k) => {
                const { name, icon: Icon } = agents[k]
                const added = !had.includes(k)
                return (
                  <span key={k} className={cn("rise-in inline-flex h-7 items-center gap-1.5 rounded-md border bg-card pr-2 pl-1 text-xs", added && "border-[oklch(0.72_0.12_var(--hue)/0.5)]")} style={{ "--delay": "0ms" } as React.CSSProperties}>
                    <span className="flex size-5 items-center justify-center rounded-[5px] border border-foreground/15 bg-muted"><Icon className="size-3" /></span>
                    {name.replace(/ agent$/, "")}
                    {added && <span className="text-[11px] font-medium text-[oklch(0.8_0.1_var(--hue))]">New</span>}
                  </span>
                )
              })}
              {stage.length > 1 && <span className="self-center text-[11px] text-muted-foreground">in parallel</span>}
            </span>
          </li>
        ))}
      </ol>
      {dropped.length > 0 && (
        <p className="pl-5.5 text-xs text-muted-foreground">
          Removed: {dropped.map((k) => <span key={k} className="line-through decoration-foreground/40">{agents[k].name.replace(/ agent$/, "")}</span>)}
        </p>
      )}
    </div>
  )
}
