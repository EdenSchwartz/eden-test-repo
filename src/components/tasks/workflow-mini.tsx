import { Fragment } from "react"
import { Crosshair, Hand } from "lucide-react"
import { agents, type AgentKind } from "@/components/chat/agents"
import { SuperAgentOrb } from "@/components/super-agents"
import { getSuperAgent } from "@/data/super-agents"
import { applyStructure, type Structure } from "@/data/task-setup"

/*
 * A task's workflow, sized for the chat (Rival shows it while you create a task, lib/task-setup.ts).
 * The same flow as How it works on the Task templates page (components/tasks/workflow-canvas.tsx), made compact:
 * each agent is its name and a few words on what it does (never cut: it wraps), in order; agents in the same step sit side by side ("In parallel").
 */

const W = 264 // node width (px)
const G = 20 // gap between parallel nodes
const H = 36 // connector height
const rowWidth = (n: number) => n * W + (n - 1) * G
const centers = (n: number) => Array.from({ length: n }, (_, i) => -rowWidth(n) / 2 + W / 2 + i * (W + G))

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

      {/* The flow, on the same dotted canvas as How it works */}
      <div
        className="overflow-x-auto bg-muted/30 px-6 py-9"
        style={{ backgroundImage: "radial-gradient(circle, color-mix(in oklab, var(--foreground) 12%, transparent) 1px, transparent 1.2px)", backgroundSize: "16px 16px" }}
      >
        {/* w-max + mx-auto: centered when it fits, scrolls sideways (never clipped) when it doesn't */}
        <div className="mx-auto flex w-max flex-col items-center">
        {pattern.map((stage, i) => (
          <Fragment key={i}>
            {i > 0 && <Connector from={pattern[i - 1].length} to={stage.length} label={stage.length > 1 ? "In parallel" : undefined} />}
            <div className="flex justify-center" style={{ gap: G }}>
              {stage.map((k) => <Node key={k} kind={k} step={i + 1} approval={structure?.[k]?.approval} />)}
            </div>
          </Fragment>
        ))}
        </div>
      </div>
    </div>
  )
}

function Node({ kind, step, approval }: { kind: AgentKind; step: number; approval?: boolean }) {
  const { name, icon: Icon, short } = agents[kind]
  return (
    <div className="rise-in flex shrink-0 gap-2.5 items-center rounded-lg border bg-card px-3 py-2.5 shadow-xs" style={{ width: W, "--delay": `${step * 70}ms` } as React.CSSProperties}>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-foreground/15 bg-muted"><Icon className="size-3.5" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-1.5">
          <span className="text-[13px] font-medium">{name.replace(/ agent$/, "")}</span>
          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground tabular-nums">{step}</span>
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{short}</span>
        {approval && (
          <span className="mt-1.5 inline-flex h-5 items-center gap-1 rounded-md bg-amber-500/10 px-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-500">
            <Hand className="size-3" /> Needs approval
          </span>
        )}
      </span>
    </div>
  )
}

// Curves from every node above to every node below (fan out / fan in), with an arrow into each node below
function Connector({ from, to, label }: { from: number; to: number; label?: string }) {
  const w = Math.max(rowWidth(from), rowWidth(to))
  const a = centers(from)
  const b = centers(to)
  return (
    <div className="relative shrink-0" style={{ width: w, height: H }}>
      <svg width={w} height={H} viewBox={`${-w / 2} 0 ${w} ${H}`} className="text-foreground/25" aria-hidden>
        <defs>
          <marker id="wfm-arrow" viewBox="0 0 8 8" refX="4" refY="7" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0.5 1.5 L4 7 L7.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
          </marker>
        </defs>
        {a.flatMap((x1) => b.map((x2) => (
          <path key={`${x1}-${x2}`} d={`M ${x1} 0 C ${x1} ${H / 2}, ${x2} ${H / 2}, ${x2} ${H - 2}`} fill="none" stroke="currentColor" strokeWidth="1.2" markerEnd="url(#wfm-arrow)" />
        )))}
      </svg>
      {label && (
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground px-1.5 py-px text-[10px] font-medium whitespace-nowrap text-background">
          {label}
        </span>
      )}
    </div>
  )
}
