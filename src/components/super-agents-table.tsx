import { useState } from "react"
import { Bell, CalendarClock, ChevronRight, Hand, Plus, Zap } from "lucide-react"
import { SuperAgentOrb } from "@/components/super-agents"
import { blockers, type SuperAgent } from "@/data/super-agents"
import { useConversations } from "@/lib/conversations"
import { cn } from "@/lib/utils"

/*
 * Tasks as a table, grouped Linear-style: each Rival task template is a group header,
 * and the tasks you made from it are the rows underneath.
 *   Header: chevron (collapse) · orb · name · "N tasks" (yours, made from it) · category · + (customize it)
 *   Row:    your agent · schedule (when it runs) · where it escalates · runs so far · status · created
 * Clicking a header name or a row opens that agent's profile panel. Empty groups start collapsed.
 */

export type Group = { template: SuperAgent; clones: SuperAgent[] }

const cols = "grid grid-cols-[minmax(0,1fr)_13rem_10rem_3.5rem_7rem_4.5rem] items-center gap-4"
const fmtDate = (d?: Date) => (d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—")

export function SuperAgentsTable({ groups, selectedId, onOpen, onCustomize }: {
  groups: Group[]
  selectedId?: string
  onOpen: (sa: SuperAgent) => void
  onCustomize: (template: SuperAgent) => void
}) {
  const { convs } = useConversations()
  // Collapsed groups: the empty ones to start with
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(groups.filter((g) => g.clones.length === 0).map((g) => g.template.id)))
  const toggle = (id: string) => setCollapsed((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const runs = (sa: SuperAgent) => convs.filter((c) => c.superAgentId === sa.id && c.messages.some((m) => m.role === "user")).length

  return (
    <div className="overflow-x-auto rounded-xl border bg-card/40">
      <div className="min-w-[46rem]">
        {/* Column labels */}
        <div className={cn(cols, "border-b px-4 py-2 text-[11px] font-medium text-muted-foreground")}>
          <span className="pl-11">Task</span>
          <span>Schedule</span>
          <span>Escalates to</span>
          <span className="text-right">Runs</span>
          <span>Status</span>
          <span className="text-right">Created</span>
        </div>

        {groups.map(({ template: t, clones }) => {
          const open = !collapsed.has(t.id)
          return (
            <section key={t.id} aria-label={t.name}>
              {/* Group header */}
              <div className="group/header sticky top-0 z-10 flex h-10 items-center gap-2 border-b bg-muted/60 px-2 backdrop-blur">
                <button
                  onClick={() => toggle(t.id)}
                  aria-expanded={open}
                  aria-label={open ? `Collapse ${t.name}` : `Expand ${t.name}`}
                  className="flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <ChevronRight className={cn("size-3.5 transition-transform duration-150", open && "rotate-90")} />
                </button>
                <SuperAgentOrb sa={t} size="sm" className="size-5 rounded-[5px] [&_svg]:size-3" />
                <button onClick={() => onOpen(t)} className="cursor-pointer truncate text-sm font-medium hover:underline hover:decoration-foreground/30 hover:underline-offset-2">
                  {t.name}
                </button>
                <span className="text-sm text-muted-foreground tabular-nums">{clones.length} {clones.length === 1 ? "task" : "tasks"}</span>
                <span className="ml-1 hidden text-xs text-muted-foreground sm:inline">{t.category}</span>
                <button
                  onClick={() => onCustomize(t)}
                  aria-label={`Customize ${t.name}`}
                  title={`Customize ${t.name}`}
                  className="ml-auto flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground opacity-0 transition-[opacity,background-color] group-hover/header:opacity-100 hover:bg-accent hover:text-foreground focus-visible:opacity-100"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>

              {/* Your versions of it */}
              {open && (clones.length === 0 ? (
                <div className="flex h-10 items-center gap-2 border-b px-4 pl-[3.25rem] text-sm text-muted-foreground">
                  No tasks from {t.name} yet.
                  <button onClick={() => onCustomize(t)} className="cursor-pointer font-medium text-foreground hover:underline">Customize it</button>
                </div>
              ) : clones.map((sa) => {
                const trigger = sa.trigger ?? { kind: "manual" as const, label: "On demand" }
                const TriggerIcon = trigger.kind === "event" ? Zap : trigger.kind === "schedule" ? CalendarClock : Hand
                const setup = blockers(sa).length > 0 || sa.tools.some((x) => !x.connected && sa.escalation?.some((e) => e.includes(x.name)))
                const n = runs(sa)
                return (
                  <button
                    key={sa.id}
                    onClick={() => onOpen(sa)}
                    aria-current={selectedId === sa.id ? "true" : undefined}
                    className={cn(cols, "h-11 w-full cursor-pointer border-b px-4 text-left text-sm transition-colors hover:bg-accent/50", selectedId === sa.id && "bg-accent/60")}
                  >
                    <span className="flex min-w-0 items-center gap-2.5 pl-7">
                      <SuperAgentOrb sa={sa} size="sm" className="size-5 rounded-[5px] [&_svg]:size-3" />
                      <span className="max-w-[70%] shrink-0 truncate font-medium">{sa.name}</span>
                      <span className="hidden min-w-0 truncate text-muted-foreground xl:inline">{sa.tagline}</span>
                    </span>
                    <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                      <TriggerIcon className="size-3.5 shrink-0" />
                      <span className="truncate">{trigger.label}</span>
                    </span>
                    <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                      {sa.escalation?.length ? <><Bell className="size-3.5 shrink-0" /><span className="truncate">{sa.escalation.join(", ")}</span></> : <span>In Rival only</span>}
                    </span>
                    <span className="text-right text-muted-foreground tabular-nums">{n || "—"}</span>
                    <span>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                        setup ? "bg-amber-500/10 text-amber-500" : trigger.kind === "manual" ? "text-muted-foreground" : "text-emerald-500",
                      )}>
                        <span className="size-1.5 rounded-full bg-current" />
                        {setup ? "Needs setup" : trigger.kind === "manual" ? "On demand" : "Active"}
                      </span>
                    </span>
                    <span className="text-right text-muted-foreground tabular-nums">{fmtDate(sa.createdAt)}</span>
                  </button>
                )
              }))}
            </section>
          )
        })}
      </div>
    </div>
  )
}
