import { useState } from "react"
import { CalendarClock, ChevronRight, Hand, Zap } from "lucide-react"
import type { Conversation } from "@/data/conversations"
import { getSuperAgent, type SuperAgent } from "@/data/super-agents"
import { runsOf, statusDot, taskStatus } from "@/lib/task-status"
import { cn } from "@/lib/utils"
import { ColorTile, colorFor } from "@/components/tasks/color-tile"

/*
 * Your tasks as a list, grouped Linear-style by the template ("mother") they were made from (pages/gallery.tsx, List view).
 *   Group header: chevron (collapse) · the template's icon and name · how many of your tasks came from it
 *   Row:          your task · status · when it runs · runs so far · created
 * Clicking a row opens the task in the panel. Nothing is cut off: long names wrap.
 */

const cols = "grid grid-cols-[minmax(0,1fr)_7.5rem_11.5rem_3rem_4.5rem] items-center gap-4"
const fmtDate = (d?: Date) => (d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—")

export function TaskTable({ tasks, convs, selectedId, onSelect }: {
  tasks: SuperAgent[]
  convs: Conversation[]
  selectedId?: string
  onSelect: (sa: SuperAgent) => void
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setCollapsed((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  // One group per template, in the order you first made a task from it
  const groups: { template: SuperAgent; tasks: SuperAgent[] }[] = []
  for (const sa of tasks) {
    const template = getSuperAgent(sa.clonedFrom) ?? sa
    const g = groups.find((x) => x.template.id === template.id)
    if (g) g.tasks.push(sa)
    else groups.push({ template, tasks: [sa] })
  }

  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-[inset_0_0_0_1px_var(--color-border),0_1px_2px_#1018280d]">
      {/* Column labels */}
      <div className={cn(cols, "border-b border-hairline px-4 py-2 text-xs text-muted-foreground")}>
        <span className="pl-7">Agent</span>
        <span>Status</span>
        <span>When it runs</span>
        <span className="text-right">Runs</span>
        <span className="text-right">Created</span>
      </div>

      {groups.map(({ template: t, tasks: rows }) => {
        const open = !collapsed.has(t.id)
        const Icon = t.icon
        return (
          <section key={t.id} aria-label={t.name}>
            {/* The template they came from */}
            <button
              onClick={() => toggle(t.id)}
              aria-expanded={open}
              className="flex w-full cursor-pointer items-center gap-2.5 border-b border-hairline bg-frost px-4 py-2 text-left transition-colors hover:bg-wash/60"
            >
              <ChevronRight className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform duration-150", open && "rotate-90")} />
              <ColorTile color={colorFor(t.name)} icon={Icon} size="xs" />
              <span className="text-sm font-semibold">{t.name}</span>
              <span className="text-sm text-muted-foreground tabular-nums">{rows.length}</span>
            </button>

            {/* Your tasks made from it */}
            {open && rows.map((sa) => {
              const trigger = sa.trigger ?? { kind: "manual" as const, label: "On demand" }
              const TriggerIcon = trigger.kind === "event" ? Zap : trigger.kind === "schedule" ? CalendarClock : Hand
              const status = taskStatus(sa, convs)
              const runs = runsOf(sa, convs).length
              return (
                <button
                  key={sa.id}
                  onClick={() => onSelect(sa)}
                  aria-current={selectedId === sa.id ? "true" : undefined}
                  className={cn(
                    cols,
                    "w-full cursor-pointer border-b border-hairline px-4 py-2.5 text-left text-sm transition-colors last:border-b-0 hover:bg-frost",
                    selectedId === sa.id && "bg-wash hover:bg-wash",
                  )}
                >
                  <span className="min-w-0 pl-7 font-medium">{sa.name}</span>
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", statusDot[status.tone])} />
                    {status.label}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <TriggerIcon className="size-3.5 shrink-0" />
                    {trigger.label}
                  </span>
                  <span className="text-right text-muted-foreground tabular-nums">{runs || "—"}</span>
                  <span className="text-right text-muted-foreground tabular-nums">{fmtDate(sa.createdAt)}</span>
                </button>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
