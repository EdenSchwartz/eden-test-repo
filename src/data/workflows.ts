import type { AgentKind } from "@/components/chat/agents"

// Scheduled workflows (pages/scheduled.tsx). Runs they trigger live in data/agent-runs.ts and point back here by id,
// so the AI Agents log, the Scheduled page and the conversations they were created in all agree.
export type Workflow = {
  id: string
  name: string
  description: string
  trigger: { kind: "schedule" | "event"; label: string }
  nextRun: string
  agents: AgentKind[] // helper agents it runs, in order
  superAgentId?: string // the super agent whose playbook it follows, if any
  conversationId?: string // the conversation it was created in
  createdBy: string
  enabled: boolean
}

export const workflows: Workflow[] = [
  {
    id: "wf_3k9x2", // matches the create_scheduled_workflow output in conversation c5
    name: "Auto-scan exposed assets on new threats",
    description: "When a new critical threat lands (CISA KEV, public PoC or active campaign), check which internet-facing assets run the affected version and notify you only if one is exploitable.",
    trigger: { kind: "event", label: "New critical threat · KEV, PoC or campaign" },
    nextRun: "On the next matching threat",
    agents: ["exploitability"],
    superAgentId: "exposure-hunter",
    conversationId: "c5",
    createdBy: "You",
    enabled: true,
  },
  {
    id: "wf_threat_brief",
    name: "Daily threat briefing",
    description: "Summarizes new threats from the last 24 hours that match products in your inventory.",
    trigger: { kind: "schedule", label: "Every day at 07:00" },
    nextRun: "Tomorrow 07:00",
    agents: ["threat-intel"],
    createdBy: "Dana R.",
    enabled: true,
  },
  {
    id: "wf_dep_sweep",
    name: "Nightly dependency sweep",
    description: "Opens PRs bumping dependencies with known critical vulnerabilities in storefront-web and checkout-api.",
    trigger: { kind: "schedule", label: "Every day at 02:00" },
    nextRun: "Tonight 02:00",
    agents: ["remediation"],
    superAgentId: "patch-pilot",
    createdBy: "Eden S.",
    enabled: true,
  },
  {
    id: "wf_guardrail_regression",
    name: "Weekly guardrail regression",
    description: "Replays the jailbreak regression suite against every production agent's guardrails in staging.",
    trigger: { kind: "schedule", label: "Every Monday at 09:00" },
    nextRun: "Mon 09:00",
    agents: ["red-team"],
    superAgentId: "injection-shield",
    createdBy: "You",
    enabled: true,
  },
  {
    id: "wf_pii_weekly",
    name: "Weekly PII leakage summary",
    description: "Summarizes PII that reached third-party LLMs this week, by agent, and flags week-over-week spikes.",
    trigger: { kind: "schedule", label: "Every Friday at 16:00" },
    nextRun: "Paused",
    agents: ["data-leak", "reporting"],
    superAgentId: "leak-sentinel",
    conversationId: "c2",
    createdBy: "You",
    enabled: false,
  },
]

export const getWorkflow = (id?: string) => workflows.find((w) => w.id === id)
