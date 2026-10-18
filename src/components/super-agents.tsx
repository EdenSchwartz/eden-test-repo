import { Fragment } from "react"
import { Check, Clock, Flag, Loader2, MessageSquareText } from "lucide-react"
import { agents, type AgentKind } from "@/components/chat/agents"
import type { AgentStatus } from "@/components/chat/primitives"
import type { SuperAgent } from "@/data/super-agents"
import { cn } from "@/lib/utils"

/*
 * Super agent visuals. A super agent is a pattern of helper agents, so it's always shown two ways:
 *   Orb      its identity: the only colored thing (hue per agent), like a teammate's avatar
 *   Pattern  how it works: helper-agent glyphs (same ▢ squares as in chat), stages left→right,
 *            parallel agents stacked. Strip = compact (chat header), Flow = large, Tines-style (profile panel).
 */

export function SuperAgentOrb({ sa, size = "md", className }: { sa: SuperAgent; size?: "sm" | "md" | "lg"; className?: string }) {
  const Icon = sa.icon
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center text-white shadow-sm ring-1 ring-white/15 ring-inset",
        size === "sm" && "size-6 rounded-md [&_svg]:size-3.5",
        size === "md" && "size-10 rounded-xl [&_svg]:size-5",
        size === "lg" && "size-16 rounded-2xl [&_svg]:size-8",
        className,
      )}
      style={{ background: `radial-gradient(circle at 30% 20%, oklch(0.8 0.12 ${sa.hue}), oklch(0.5 0.15 ${sa.hue}) 70%)` }}
    >
      <Icon />
    </span>
  )
}

type Statuses = Partial<Record<AgentKind, AgentStatus>>

function Glyph({ kind, status, size = "sm" }: { kind: AgentKind; status?: AgentStatus | "pending"; size?: "sm" | "md" }) {
  const { name, icon: Icon } = agents[kind]
  return (
    <span
      title={name}
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-md border border-foreground/15 bg-muted transition-opacity duration-300",
        size === "sm" ? "size-6 [&_svg]:size-3" : "size-8 [&_svg]:size-3.5",
        status === "pending" && "opacity-35",
        status === "running" && "border-foreground/40 ring-2 ring-foreground/10",
      )}
    >
      {status === "running" ? <Loader2 className="animate-spin text-muted-foreground" /> : <Icon className="text-foreground" />}
      {status === "done" && (
        <span className="absolute -right-1 -bottom-1 flex size-3 items-center justify-center rounded-full bg-foreground text-background">
          <Check className="size-2!" strokeWidth={3} />
        </span>
      )}
    </span>
  )
}

// Compact pattern: ▢ — ▢▢ — ▢ . With statuses, agents not started yet are dimmed and live ones spin.
export function PatternStrip({ pattern, statuses, size = "sm", className }: {
  pattern: AgentKind[][]; statuses?: Statuses; size?: "sm" | "md"; className?: string
}) {
  return (
    <span className={cn("flex items-center", className)}>
      {pattern.map((stage, i) => (
        <Fragment key={i}>
          {i > 0 && <span className={cn("h-px bg-(--rail)", size === "sm" ? "w-3" : "w-5")} />}
          <span className="flex flex-col gap-1">
            {stage.map((k) => <Glyph key={k} kind={k} size={size} status={statuses ? statuses[k] ?? "pending" : undefined} />)}
          </span>
        </Fragment>
      ))}
    </span>
  )
}

const shortName = (k: AgentKind) => agents[k].name.replace(/ agent$/, "")

function FlowEnd({ icon: Icon, label }: { icon: typeof Flag; label: string }) {
  return (
    <span className="relative flex shrink-0 flex-col items-center text-[11px] text-muted-foreground @2xl:text-xs">
      <span className="flex size-8 items-center justify-center rounded-full border border-dashed border-foreground/25 @2xl:size-10">
        <Icon className="size-3.5 @2xl:size-4" />
      </span>
      <span className="absolute top-full mt-1.5 whitespace-nowrap">{label}</span>
    </span>
  )
}

// Large, Tines-style: brief → stage nodes → result, with marching connectors so it reads as "work flows through".
// Sizes step up when the surrounding @container is wide (@2xl), so it doesn't look tiny on big screens.
export function PatternFlow({ sa, className }: { sa: SuperAgent; className?: string }) {
  const connector = <span aria-hidden className="flow-line h-px min-w-3 flex-1" />
  return (
    <div className={cn("flex w-full items-center gap-1 pb-5", className)}>
      <FlowEnd icon={MessageSquareText} label="Your brief" />
      {sa.pattern.map((stage, i) => (
        <Fragment key={i}>
          {connector}
          <div className="relative flex min-w-0 shrink flex-col gap-1.5">
            {stage.map((k, j) => {
              const Icon = agents[k].icon
              return (
                <span
                  key={k}
                  className="rise-in flex min-w-0 items-center gap-1.5 rounded-lg border bg-card py-1.5 pr-2.5 pl-1.5 text-xs shadow-sm @2xl:gap-2 @2xl:rounded-xl @2xl:py-2 @2xl:pr-3.5 @2xl:pl-2 @2xl:text-sm"
                  style={{ "--delay": `${120 + i * 110 + j * 50}ms` } as React.CSSProperties}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-foreground/15 bg-muted @2xl:size-8 @2xl:rounded-lg">
                    <Icon className="size-3 @2xl:size-4" />
                  </span>
                  {/* Wraps to two lines when space is tight, so the flow stays horizontal on small screens */}
                  <span className="min-w-0 leading-tight font-medium">{shortName(k)}</span>
                </span>
              )
            })}
            {stage.length > 1 && <span className="absolute inset-x-0 top-full mt-1 text-center text-[10px] text-muted-foreground @2xl:text-[11px]">in parallel</span>}
          </div>
        </Fragment>
      ))}
      {connector}
      <FlowEnd icon={Flag} label="Result" />
    </div>
  )
}

// One-line summary of a super agent: team size, run time, apps it uses (job suggestion bar)
export function AgentMeta({ sa, className }: { sa: SuperAgent; className?: string }) {
  return (
    <span className={cn("flex items-center gap-3 text-xs text-muted-foreground", className)}>
      <span>{sa.pattern.flat().length} agents</span>
      <span className="flex items-center gap-1"><Clock className="size-3" /> ~{sa.runtime}</span>
      <span>{sa.tools.length} apps</span>
    </span>
  )
}

// Who's on the team, without the workflow: overlapping sub-agent glyphs + a count (cards).
// The workflow itself lives in the profile panel (PatternFlow).
export function AgentStack({ kinds, size = "sm" }: { kinds: AgentKind[]; size?: "xs" | "sm" }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex -space-x-1.5">
        {kinds.map((k) => {
          const { name, icon: Icon } = agents[k]
          return (
            <span key={k} title={name} className={cn("flex items-center justify-center rounded-full border border-foreground/15 bg-muted ring-2 ring-card", size === "xs" ? "size-5 [&_svg]:size-2.5" : "size-6 [&_svg]:size-3")}>
              <Icon className="text-foreground" />
            </span>
          )
        })}
      </span>
      {size === "sm" && <span className="hidden whitespace-nowrap @[17rem]:inline">{kinds.length} agents</span>}
    </span>
  )
}

