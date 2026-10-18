import type { AgentPart } from "@/components/chat/parts"
import { conversationStore, minutesAgo, type Part } from "@/data/conversations"

// Every helper-agent run, from conversations and from scheduled workflows, for the AI Agents activity log.
export type RunSource =
  | { kind: "conversation"; conversationId: string; title: string }
  | { kind: "schedule"; workflowId: string; trigger: string } // workflowId → data/workflows.ts

export type AgentRunRecord = AgentPart & { id: string; startedAt: Date; source: RunSource }

const scheduledRuns: AgentRunRecord[] = [
  {
    id: "s1",
    type: "agent",
    agent: "exploitability",
    status: "running",
    activity: "Checking 14 internet-facing assets against CVE-2026-61002…",
    task: "New critical threat CVE-2026-61002 (public PoC). Check which internet-facing assets run the affected version and whether it's reachable.",
    parts: [],
    startedAt: minutesAgo(1),
    source: { kind: "schedule", workflowId: "wf_3k9x2", trigger: "New threat · CVE-2026-61002" },
  },
  {
    id: "s2",
    type: "agent",
    agent: "exploitability",
    status: "done",
    summary: "storefront-prod-1 runs imgproc 4.1.7 and is reachable from the internet",
    verdict: { label: "Exploitable", tone: "risk" },
    duration: 18,
    task: "New critical threat CVE-2026-94545 (CISA KEV). Check which internet-facing assets run the affected version and whether it's reachable.",
    parts: [
      {
        type: "tool",
        name: "match_assets",
        title: "Match assets to affected versions",
        state: "output-available",
        input: { cve: "CVE-2026-94545", scope: "internet-facing", assets: 14 },
        output: { affected: ["storefront-prod-1"], unaffected: 13 },
      },
      {
        type: "tool",
        name: "trace_route",
        title: "Trace network path from the internet",
        state: "output-available",
        input: { target: "storefront-prod-1", from: "0.0.0.0/0" },
        output: { reachable: true, path: ["alb-public", "storefront-prod-1:443"] },
      },
    ],
    startedAt: minutesAgo(12),
    source: { kind: "schedule", workflowId: "wf_3k9x2", trigger: "New threat · CVE-2026-94545" },
  },
  {
    id: "s3",
    type: "agent",
    agent: "exploitability",
    status: "done",
    summary: "No internet-facing asset runs an affected version of libxmlsec",
    verdict: { label: "Not affected", tone: "safe" },
    duration: 6,
    task: "New critical threat CVE-2026-55810 (active campaign). Check which internet-facing assets run the affected version.",
    parts: [
      {
        type: "tool",
        name: "match_assets",
        title: "Match assets to affected versions",
        state: "output-available",
        input: { cve: "CVE-2026-55810", scope: "internet-facing", assets: 14 },
        output: { affected: [], unaffected: 14 },
      },
    ],
    startedAt: minutesAgo(60 * 5),
    source: { kind: "schedule", workflowId: "wf_3k9x2", trigger: "New threat · CVE-2026-55810" },
  },
  {
    id: "s4",
    type: "agent",
    agent: "remediation",
    status: "error",
    summary: "GitHub token for storefront-web expired, couldn't open the dependency PR",
    duration: 4,
    task: "Open PRs bumping dependencies with known critical vulnerabilities in storefront-web and checkout-api.",
    parts: [
      {
        type: "tool",
        name: "draft_pull_request",
        title: "Draft dependency bump PR",
        state: "output-error",
        input: { repo: "storefront-web", bumps: 3 },
        error: "401 Bad credentials",
      },
    ],
    startedAt: minutesAgo(60 * 6),
    source: { kind: "schedule", workflowId: "wf_dep_sweep", trigger: "Every day at 02:00" },
  },
  {
    id: "s5",
    type: "agent",
    agent: "threat-intel",
    status: "done",
    summary: "3 new CISA KEV entries · 1 affects a product in your inventory",
    verdict: { label: "1 relevant threat", tone: "risk" },
    duration: 11,
    task: "Summarize new threats from the last 24h that are relevant to our inventory.",
    parts: [
      {
        type: "tool",
        name: "search_threat_feeds",
        title: "Search threat intelligence feeds",
        state: "output-available",
        input: { range: "24h", sources: ["cisa_kev", "github_advisories", "mandiant"] },
        output: { new_kev: 3, relevant: ["CVE-2026-94545"] },
      },
    ],
    startedAt: minutesAgo(60 * 8),
    source: { kind: "schedule", workflowId: "wf_threat_brief", trigger: "Every day at 07:00" },
  },
  {
    id: "s6",
    type: "agent",
    agent: "red-team",
    status: "attention",
    summary: "1 jailbreak payload bypassed Support Copilot's guardrail · approve the pattern update",
    duration: 142,
    task: "Replay the jailbreak regression suite against every production agent's guardrails in staging.",
    parts: [
      {
        type: "tool",
        name: "run_exploit",
        title: "Replay regression suite (312 payloads)",
        state: "output-available",
        input: { suite: "jailbreak-regression-v14", targets: 5 },
        output: { blocked: 311, bypassed: 1, bypass: { target: "support-copilot", payload: "role-swap-unicode-7" } },
      },
    ],
    startedAt: minutesAgo(60 * 26),
    source: { kind: "schedule", workflowId: "wf_guardrail_regression", trigger: "Every Monday at 09:00" },
  },
  {
    id: "s7",
    type: "agent",
    agent: "red-team",
    status: "done",
    summary: "312 payloads replayed against 5 agents · 0 bypasses",
    verdict: { label: "Blocked", tone: "safe" },
    duration: 131,
    task: "Replay the jailbreak regression suite against every production agent's guardrails in staging.",
    parts: [],
    startedAt: minutesAgo(60 * 24 * 8),
    source: { kind: "schedule", workflowId: "wf_guardrail_regression", trigger: "Every Monday at 09:00" },
  },
  {
    id: "s8",
    type: "agent",
    agent: "data-leak",
    status: "done",
    summary: "23 PII events reached external LLMs · up 40% week over week, mostly Sales Agent",
    verdict: { label: "Spike", tone: "risk" },
    duration: 37,
    task: "Summarize PII that reached third-party LLMs this week, by agent, and flag week-over-week spikes.",
    parts: [
      {
        type: "tool",
        name: "query_events",
        title: "Query DLP events",
        state: "output-available",
        input: { type: "pii", destination: "external_llm", range: "7d" },
        output: { total: 23, by_agent: { "Sales Agent": 14, "HR Bot": 6, "Support Copilot": 3 } },
      },
    ],
    startedAt: minutesAgo(60 * 24 * 4),
    source: { kind: "schedule", workflowId: "wf_pii_weekly", trigger: "Every Friday at 16:00" },
  },
]

// Agent runs inside conversations (including agents nested inside other agents)
function agentsIn(parts: Part[]): AgentPart[] {
  return parts.flatMap((p) => (p.type === "agent" ? [p, ...agentsIn(p.parts)] : []))
}

export const getScheduledRun = (id: string) => scheduledRuns.find((r) => r.id === id)

export const runsForWorkflow = (id: string) =>
  scheduledRuns.filter((r) => r.source.kind === "schedule" && r.source.workflowId === id).sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())

export function getAgentRuns(): AgentRunRecord[] {
  const fromConversations = conversationStore.current.flatMap((c) =>
    c.messages.flatMap((m) => agentsIn(m.parts)).map((a, i) => ({
      ...a,
      id: `${c.id}-${i}`,
      // ponytail: runs carry no timestamps yet; approximate from the conversation's last update
      startedAt: new Date(c.updatedAt.getTime() - 60_000),
      source: { kind: "conversation" as const, conversationId: c.id, title: c.title },
    })),
  )
  return [...fromConversations, ...scheduledRuns].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
}
