import { Fragment } from "react"
import { agents, type AgentKind } from "@/components/chat/agents"
import type { SuperAgent } from "@/data/super-agents"

/*
 * A task's workflow as a left-to-right graph: one column per step, agents that run at the same time
 * stacked in one column. Links between columns carry what flows through them in a typical run
 * (sa.flow, e.g. "70 findings" → Correlation → "41 issues" → …). Used by the wide template panel.
 */

// Columns stretch with the canvas: nodes and links share the width (3:2), within these bounds
const NODE = { flex: "3 1 0", minWidth: 100, maxWidth: 180 }
const LINK = { flex: "2 1 0", minWidth: 60, maxWidth: 120 }
const NODE_H = 52
const GAP = 10 // between agents in the same column

export function FlowGraph({ sa }: { sa: SuperAgent }) {
  const rows = Math.max(...sa.pattern.map((g) => g.length))
  const h = rows * NODE_H + (rows - 1) * GAP
  // Vertical centers of n stacked nodes, centered in the graph's height
  const ys = (n: number) => Array.from({ length: n }, (_, i) => h / 2 + (i - (n - 1) / 2) * (NODE_H + GAP))
  const out = (k: AgentKind) => sa.flow?.out[k]

  return (
    <div className="overflow-x-auto">
      <div className="mx-auto flex min-w-fit flex-col gap-2.5" style={{ maxWidth: 6 * LINK.maxWidth + 5 * NODE.maxWidth }}>
        {/* Column headers */}
        <div className="flex">
          <span style={LINK} />
          {sa.pattern.map((g, i) => (
            <Fragment key={i}>
              {i > 0 && <span style={LINK} />}
              <span style={NODE} className="text-[11px] text-muted-foreground">
                Step {i + 1}{g.length > 1 && " · Parallel"}
              </span>
            </Fragment>
          ))}
        </div>

        <div className="flex" style={{ height: h }}>
          {/* In: where the run starts */}
          <Link from={[h / 2]} to={ys(sa.pattern[0].length)} labels={[sa.flow?.in]} h={h} start />
          {sa.pattern.map((g, i) => (
            <Fragment key={i}>
              {i > 0 && <Link from={ys(sa.pattern[i - 1].length)} to={ys(g.length)} labels={sa.pattern[i - 1].map(out)} h={h} />}
              <div className="relative" style={NODE}>
                {g.map((kind, j) => (
                  <Node key={kind} kind={kind} top={ys(g.length)[j] - NODE_H / 2} />
                ))}
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

function Node({ kind, top }: { kind: AgentKind; top: number }) {
  const { name, icon: Icon, role } = agents[kind]
  return (
    <div
      title={role}
      className="absolute inset-x-0 flex flex-col justify-center gap-1 rounded-lg border bg-card px-2 shadow-xs"
      style={{ top, height: NODE_H }}
    >
      <span className="flex size-4.5 items-center justify-center rounded bg-muted text-foreground/70">
        <Icon className="size-3" />
      </span>
      <span className="text-[11px] leading-tight font-medium">{name.replace(/ agent$/, "")}</span>
    </div>
  )
}

// The lines from one column to the next (every left node to every right node), with what each left node hands on.
// Drawn in a 100-wide box stretched to the link's width; strokes stay crisp (non-scaling).
function Link({ from, to, labels, h, start }: { from: number[]; to: number[]; labels: (string | undefined)[]; h: number; start?: boolean }) {
  const paths = from.flatMap((y1) => to.map((y2) => `M0 ${y1} C50 ${y1} 50 ${y2} 100 ${y2}`))
  // A label sits at the midpoint of its node's lines (the fork point when one node fans out)
  const labelY = (y1: number) => (to.length === 1 ? (y1 + to[0]) / 2 : y1)
  return (
    <div className="relative" style={{ ...LINK, height: h }}>
      <svg viewBox={`0 0 100 ${h}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
        {paths.map((d) => <path key={d} d={d} fill="none" vectorEffect="non-scaling-stroke" className="stroke-foreground/20" strokeWidth={1.25} />)}
      </svg>
      {start && <span aria-hidden className="absolute left-0 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/30" style={{ top: from[0] }} />}
      {from.map((y1, i) => labels[i] && (
        <span
          key={i}
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded border bg-card px-1 text-[10px] whitespace-nowrap text-muted-foreground tabular-nums"
          style={{ top: labelY(y1) }}
        >
          {labels[i]}
        </span>
      ))}
    </div>
  )
}
