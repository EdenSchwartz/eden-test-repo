import { Bot, Check, Clock, Hand, Play, Server } from "lucide-react"
import type { Part } from "@/data/conversations"
import { getSuperAgent } from "@/data/super-agents"

/*
 * The task you're creating, as Rival will save it, in the chat (lib/task-setup.ts). Styled like the
 * Rival Harness result card: a blue-washed icon, a small label over the title, chips, and a status on the right.
 * Before you approve it: "Needs approval". After: "Created". Approve / Run now / Open in Tasks are the quick replies under it.
 */
export function TaskCard({ part }: { part: Extract<Part, { type: "task" }> }) {
  const sa = getSuperAgent(part.superAgentId)
  if (!sa) return null
  const Icon = sa.icon
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
      <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-wash text-blue [&_svg]:size-4">
        <Icon />
      </span>
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
          <div>
            <p className="text-xs text-muted-foreground">{part.created ? "Agent" : "New agent"}</p>
            <p className="text-sm font-semibold">
              {sa.name} <span className="font-normal text-muted-foreground">› from the {sa.clonedFrom ? getSuperAgent(sa.clonedFrom)?.name : sa.name} template</span>
            </p>
          </div>
          {part.created ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-success-wash px-2 py-px text-xs font-semibold text-success">
              <Check className="size-3" /> Created
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-warning-wash px-2 py-px text-xs font-semibold text-warning">
              <Hand className="size-3" /> Needs approval
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip icon={Bot}>{sa.pattern.flat().length} agents</Chip>
          <Chip icon={Clock}>~{sa.runtime} per run</Chip>
          <Chip icon={Play}>Runs when you start it</Chip>
        </div>
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          Scope
          <span className="inline-flex items-center gap-1.5 rounded-md bg-chip px-1.5 py-px text-xs font-medium text-foreground">
            <Server className="size-3 text-chip-ink" />
            {part.assets} assets · {part.scope}
          </span>
        </p>
      </div>
    </div>
  )
}

const Chip = ({ icon: Icon, children }: { icon: typeof Bot; children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1 rounded-md bg-chip px-1.5 py-px text-xs font-semibold whitespace-nowrap text-chip-ink">
    <Icon className="size-3" />
    {children}
  </span>
)
