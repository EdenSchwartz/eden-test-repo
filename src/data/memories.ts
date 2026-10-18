import type { AgentKind } from "@/components/chat/agents"
import { minutesAgo } from "@/data/conversations"

// What agents remember about your environment and organization (pages/memory.tsx).
// Sources point at real mock data: conversations (data/conversations.ts) and workflow runs (data/agent-runs.ts),
// and the texts saved in chats ("Saved to memory" steps) match these exactly so the chat chip can link here.
export const memoryCategories = ["Ownership", "Environment", "Preferences", "Known weaknesses", "Policies"] as const
export type MemoryCategory = (typeof memoryCategories)[number]

export type MemorySource =
  | { kind: "conversation"; conversationId: string }
  | { kind: "run"; runId: string }
  | { kind: "manual"; by: string }

export type Memory = {
  id: string
  text: string
  category: MemoryCategory
  source: MemorySource
  usedBy: AgentKind[]
  learnedAt: Date
  lastUsedAt?: Date
  pinned?: boolean // always included in agents' context
  conflict?: string // newer evidence disagrees: needs review
  confirmedAt?: Date // a person checked it; resets the staleness clock
}

const days = (n: number) => minutesAgo(60 * 24 * n)
export const STALE_DAYS = 90

// Needs a person to look at it: something contradicts it, or nobody has confirmed it in 90 days
export function reviewReason(m: Memory): string | undefined {
  if (m.conflict) return m.conflict
  const age = (Date.now() - (m.confirmedAt ?? m.learnedAt).getTime()) / 86_400_000
  if (age > STALE_DAYS) return `Not confirmed in ${Math.floor(age)} days`
}

// ponytail: module-level so edits survive navigating between pages; gone on reload
export const memories: Memory[] = [
  // Ownership
  { id: "mem1", text: "storefront-* services are owned by @web-platform.", category: "Ownership", source: { kind: "conversation", conversationId: "c1" }, usedBy: ["ownership", "remediation"], learnedAt: minutesAgo(130), lastUsedAt: minutesAgo(40) },
  { id: "mem2", text: "People Ops owns HR Bot; CX Engineering owns support-copilot.", category: "Ownership", source: { kind: "conversation", conversationId: "c4" }, usedBy: ["ownership", "data-leak"], learnedAt: days(12), lastUsedAt: days(1) },
  { id: "mem3", text: "checkout-api is owned by @payments; on-call is PagerDuty rotation payments-primary.", category: "Ownership", source: { kind: "manual", by: "Dana R." }, usedBy: ["ownership"], learnedAt: days(40), lastUsedAt: days(6), conflict: "Ownership agent saw 3 deploys by @billing-core this month" },
  { id: "mem4", text: "legacy-faq-bot has no owner on record.", category: "Ownership", source: { kind: "manual", by: "Eden S." }, usedBy: ["ownership", "reporting"], learnedAt: days(124), lastUsedAt: days(3) },
  // Environment
  { id: "mem5", text: "14 internet-facing assets in prod: 3 load balancers, 7 EC2, 2 API gateways, 2 CDN origins.", category: "Environment", source: { kind: "conversation", conversationId: "c5" }, usedBy: ["asset-discovery", "exploitability"], learnedAt: minutesAgo(25), lastUsedAt: minutesAgo(1) },
  { id: "mem6", text: "auth-edge-2 is tagged internal but has a public security group rule (sg-0a91f).", category: "Environment", source: { kind: "conversation", conversationId: "c5" }, usedBy: ["exploitability"], learnedAt: minutesAgo(25) },
  { id: "mem7", text: "storefront-prod-1 runs imgproc 4.1.7.", category: "Environment", source: { kind: "run", runId: "s2" }, usedBy: ["exploitability", "remediation"], learnedAt: minutesAgo(12), lastUsedAt: minutesAgo(12), conflict: "PR storefront-web #1182 upgrades it to 4.2.1 once merged" },
  { id: "mem8", text: "Staging replicas run in us-west-2, at most 3 at a time.", category: "Environment", source: { kind: "manual", by: "Eden S." }, usedBy: ["red-team"], learnedAt: days(20), lastUsedAt: days(1) },
  // Preferences
  { id: "mem9", text: "Prefers automatic exploitability scans of internet-facing assets when a critical threat lands.", category: "Preferences", source: { kind: "conversation", conversationId: "c5" }, usedBy: ["exploitability", "threat-intel"], learnedAt: minutesAgo(25), lastUsedAt: minutesAgo(1), pinned: true },
  { id: "mem10", text: "Only notify when a scan finds something exploitable.", category: "Preferences", source: { kind: "conversation", conversationId: "c5" }, usedBy: ["exploitability"], learnedAt: minutesAgo(25), lastUsedAt: minutesAgo(12) },
  { id: "mem11", text: "Weekly summaries go out Friday afternoon, grouped by agent.", category: "Preferences", source: { kind: "conversation", conversationId: "c2" }, usedBy: ["reporting", "data-leak"], learnedAt: days(5), lastUsedAt: days(4) },
  // Known weaknesses
  { id: "mem12", text: "internal-search guardrails: pattern list misses unicode homoglyphs; classifier is the backstop.", category: "Known weaknesses", source: { kind: "run", runId: "s6" }, usedBy: ["red-team", "remediation"], learnedAt: days(1), lastUsedAt: minutesAgo(60 * 5) },
  { id: "mem13", text: "Sales Agent's CRM integration sends customer emails and phone numbers to gpt-5.", category: "Known weaknesses", source: { kind: "run", runId: "s8" }, usedBy: ["data-leak"], learnedAt: days(4), lastUsedAt: days(4) },
  { id: "mem14", text: "billing-assistant's stripe.refund has no amount cap and no approval step.", category: "Known weaknesses", source: { kind: "manual", by: "Eden S." }, usedBy: ["red-team", "remediation"], learnedAt: days(2), lastUsedAt: days(2) },
  // Policies
  { id: "mem15", text: "Never change production on Fridays after 12:00.", category: "Policies", source: { kind: "manual", by: "You" }, usedBy: ["remediation"], learnedAt: days(60), lastUsedAt: days(6), pinned: true },
  { id: "mem16", text: "Customer data may only go to approved LLM vendors: Anthropic and Azure OpenAI.", category: "Policies", source: { kind: "manual", by: "Dana R." }, usedBy: ["data-leak", "reporting"], learnedAt: days(150), lastUsedAt: days(4) },
]

export const findMemoryByText = (text: string) => memories.find((m) => m.text === text)
