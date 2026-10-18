import type { AgentKind } from "@/components/chat/agents"
import { runState } from "@/components/super-agent-panel"
import type { Conversation, Part } from "@/data/conversations"
import type { SuperAgent } from "@/data/super-agents"
import { isEnabled } from "@/lib/enabled"
import { timeAgo } from "@/lib/time"

// How one of your agents is doing, from its runs. Shown on its card (components/tasks/status-chip.tsx)
// and in the list on the Agents page (pages/gallery.tsx). Switched off = Stopped, whatever its runs say.
export type TaskStatus = { label: string; tone: "idle" | "running" | "attention" | "done" | "stopped" }
export const statusDot: Record<TaskStatus["tone"], string> = {
  idle: "bg-muted-foreground/40", running: "bg-blue animate-pulse", attention: "bg-warning", done: "bg-success", stopped: "bg-muted-foreground",
}
const stopped: TaskStatus = { label: "Stopped", tone: "stopped" }

// An agent's runs: started as a run (its Activity tab's Run now, a schedule) or a chat where its sub agents ran (Run now in the chat)
export const runsOf = (sa: SuperAgent, convs: Conversation[]) =>
  convs.filter((c) => c.superAgentId === sa.id && (c.run || c.messages.some((m) => m.parts.some((p) => p.type === "agent"))))

const ran = (d: Date): TaskStatus => {
  const ago = timeAgo(d)
  return { label: ago === "now" ? "Ran just now" : `Ran ${ago} ago`, tone: "done" }
}

export function taskStatus(sa: SuperAgent, convs: Conversation[]): TaskStatus {
  if (!isEnabled(sa.id)) return stopped
  const runs = runsOf(sa, convs)
  if (runs.length === 0) return { label: "Never run", tone: "idle" }
  const last = runs.reduce((a, b) => (b.updatedAt > a.updatedAt ? b : a))
  const state = runState(last)
  if (state === "running") return { label: "Running", tone: "running" }
  if (state === "attention") return { label: "Needs you", tone: "attention" }
  return ran(last.updatedAt)
}

// A sub agent: how its latest piece of work went, in any chat or run (nested agent parts included)
export function subAgentStatus(kind: AgentKind, convs: Conversation[]): TaskStatus {
  if (!isEnabled(`sub:${kind}`)) return stopped
  const find = (parts: Part[]): Extract<Part, { type: "agent" }> | undefined => {
    for (const p of parts.toReversed()) {
      if (p.type !== "agent") continue
      if (p.agent === kind) return p
      const inner = find(p.parts)
      if (inner) return inner
    }
  }
  for (const c of convs.toSorted((a, b) => +b.updatedAt - +a.updatedAt)) {
    for (const m of c.messages.toReversed()) {
      const p = find(m.parts)
      if (!p) continue
      if (p.status === "running") return { label: "Running", tone: "running" }
      if (p.status === "attention") return { label: "Needs you", tone: "attention" }
      return ran(c.updatedAt)
    }
  }
  return { label: "Ready", tone: "idle" }
}
