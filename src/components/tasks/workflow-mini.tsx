import { Crosshair } from "lucide-react"
import { SuperAgentOrb } from "@/components/super-agents"
import { Steps } from "@/components/tasks/template-detail"
import { getSuperAgent } from "@/data/super-agents"
import { applyStructure, type Structure } from "@/data/task-setup"

/*
 * A task's workflow, sized for the chat (Rival shows it while you create a task, lib/task-setup.ts).
 * The body is the agent drawer's How it works timeline (Steps in template-detail.tsx), so both look the same;
 * this adds the header (name, counts, scope) and the Needs approval marks from your setup.
 */
export function WorkflowMini({ superAgentId, scope, structure }: { superAgentId: string; scope?: string; structure?: Structure }) {
  const sa = getSuperAgent(superAgentId)
  if (!sa) return null
  const pattern = applyStructure(sa, structure)
  const count = pattern.flat().length
  return (
    // data-workflow-mini: Customize moves this widget into the preview on the right (pages/chat.tsx)
    <div data-workflow-mini className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center gap-2.5 border-b px-3.5 py-2.5">
        <SuperAgentOrb sa={sa} size="sm" className="size-5 rounded-[5px] [&_svg]:size-3" />
        <span className="text-sm font-medium">{sa.name}</span>
        <span className="text-xs text-muted-foreground">{count} agents · {pattern.length} steps</span>
        {scope && (
          <span className="ml-auto inline-flex h-5 items-center gap-1 rounded-md border bg-background px-1.5 text-xs text-foreground/80">
            <Crosshair className="size-3 text-muted-foreground" /> {scope}
          </span>
        )}
      </div>

      <div className="px-3.5 py-3.5 text-sm">
        <Steps pattern={pattern} approval={(k) => !!structure?.[k]?.approval} />
      </div>
    </div>
  )
}
