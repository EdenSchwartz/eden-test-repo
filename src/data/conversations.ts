// Mock conversations. Each assistant message is a list of "parts" rendered in order,
// so adding a new widget type = add a part type here + a case in components/chat/parts.tsx.

import type { AgentKind } from "@/components/chat/agents"
import type { AskProgress, AskQuestion } from "@/components/chat/question-card"
import type { Setup } from "@/lib/task-setup"
import type { Structure } from "@/data/task-setup"
import type { Verdict } from "@/components/chat/primitives"

export type Part =
  | { type: "text"; text: string }
  // Steps: how the work was done
  | { type: "reasoning"; text: string; duration?: number; streaming?: boolean }
  // result = the card this step produced; it renders under the step, on the rail
  | {
      type: "tool"
      name: string
      title: string
      state: "input-available" | "output-available" | "output-error"
      input: unknown
      output?: unknown
      error?: string // when state is output-error
      result?: StepResult
    }
  | { type: "memory"; text: string }
  // Agent run: work delegated to a helper agent, with its own nested parts.
  // Consecutive agent parts render as one parallel group.
  | {
      type: "agent"
      agent: AgentKind
      status: "running" | "done" | "attention" | "error"
      activity?: string // what it's doing right now (while running)
      summary?: string // outcome when done / what it needs / what went wrong
      verdict?: Verdict // the one-word conclusion shown on the collapsed row when done
      duration?: number
      task?: string // what the agent was asked to do (shown in the run drawer)
      parts: Part[] // shallow view, shown inline when the row is expanded
      transcript?: Part[] // full run, shown in the drawer (falls back to parts)
    }
  // Actions: the only results that stand alone, because they need the user. via = which agent is asking
  | { type: "approval"; title: string; repo: string; via?: AgentKind }
  // A task's workflow, compact (components/tasks/workflow-mini.tsx): shown while creating a task
  | { type: "workflow"; superAgentId: string; scope?: string; structure?: Structure }
  // The task you're creating, as Rival will save it (components/tasks/task-card.tsx): waits for your approval, then created
  | { type: "task"; superAgentId: string; scope: string; assets: number; created?: boolean }

// Results that are just information always belong to the step that produced them (tool.result),
// so where a card sits tells you where it came from.
export type StepResult =
  | { type: "owner-trace"; resource: string; team: string; confidence: Confidence; evidence: Evidence[] }
  | { type: "finding"; icon: "exploit" | "intel" | "blocked" | "assets" | "schedule"; title: string; entities?: Entity[]; confidence?: Confidence; evidence?: Evidence[] }

export type Entity = { kind: "asset" | "team" | "repo" | "url" | "trigger"; label: string }

export type Confidence = "High" | "Medium" | "Low"
// One signal backing a widget's conclusion. kind picks the icon; supports=false means it contradicts.
export type Evidence = {
  kind: "tag" | "code" | "deploy" | "oncall" | "memory" | "network" | "intel"
  signal: string
  source: string
  strength: Confidence
  supports: boolean
}

export type ChatMessage = { id: string; role: "user" | "assistant"; parts: Part[] }
// suggestions: questions the agent offers when you start a chat with it (shown under its greeting)
// run: started as a run of a super agent (Run now, a scheduled run, or a suggested question), not a chat you typed into
export type RunKind = "scheduled" | "manual" | "asked" // its schedule · Run now · a question you picked
export type Conversation = {
  id: string; title: string; updatedAt: Date; messages: ChatMessage[]; superAgentId?: string; suggestions?: string[]; run?: { kind: RunKind }
  setup?: Setup // creating a task from a template: where it is (pages/chat.tsx, lib/task-setup.ts)
  replies?: string[] // quick replies under Rival's last message (e.g. "Yes"); gone once you answer
  ask?: { questions: AskQuestion[]; progress?: AskProgress } // a question waiting for an answer, shown in place of the chat box
}

export const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000)

export const conversations: Conversation[] = [
  {
    id: "c1",
    title: "Remediate CVE-2026-94545",
    updatedAt: minutesAgo(4),
    messages: [
      { id: "m1", role: "user", parts: [{ type: "text", text: "Remediate @CVE-2026-94545 as fast as possible" }] },
      {
        id: "m2",
        role: "assistant",
        parts: [
          {
            type: "reasoning",
            duration: 4,
            text: "CVE-2026-94545 is a critical RCE in imgproc. Before touching production I need answers in parallel: is it exploitable in our environment, is it being exploited in the wild, and can we reproduce it safely?",
          },
          {
            type: "agent",
            agent: "exploitability",
            status: "done",
            task: "Determine whether CVE-2026-94545 is exploitable in our environment: find vulnerable assets and check whether an attacker can reach the vulnerable code path.",
            summary: "storefront-prod-1 is reachable from the internet with no WAF on /upload",
            verdict: { label: "Exploitable", tone: "risk" },
            duration: 14,
            parts: [
              {
                type: "tool",
                name: "search_assets",
                title: "Search assets for vulnerable package",
                state: "output-available",
                input: { cve: "CVE-2026-94545", package: "imgproc", versions: "<4.2.1" },
                output: { matches: 1, assets: [{ id: "storefront-prod-1", cloud: "aws", version: "4.1.7" }] },
              },
              {
                type: "tool",
                name: "trace_route",
                title: "Trace network path from the internet",
                state: "output-available",
                input: { target: "storefront-prod-1", from: "0.0.0.0/0" },
                output: { reachable: true, path: ["alb-public", "storefront-prod-1:443"], waf: "none on /upload" },
                result: {
                type: "finding",
                icon: "exploit",
                title: "Exploit path confirmed",
                entities: [{ kind: "url", label: "/upload" }, { kind: "asset", label: "storefront-prod-1" }],
                confidence: "High",
                evidence: [
                  { kind: "network", signal: "Public ALB routes /upload directly to the instance", source: "AWS · alb-public", strength: "High", supports: true },
                  { kind: "network", signal: "No WAF rule covers multipart image uploads", source: "AWS WAF · storefront-acl", strength: "High", supports: true },
                  { kind: "code", signal: "Upload handler passes files straight to imgproc.decode()", source: "github · storefront-web/upload.ts", strength: "Medium", supports: true },
                ],
                },
              },
            ],
          },
          {
            type: "agent",
            agent: "threat-intel",
            status: "done",
            task: "Check whether CVE-2026-94545 is being exploited in the wild and who is behind it.",
            summary: "Listed in CISA KEV · 2 public PoCs · used by the ShadowPixel campaign",
            verdict: { label: "Exploited in the wild", tone: "risk" },
            duration: 9,
            parts: [
              {
                type: "tool",
                name: "search_threat_feeds",
                title: "Search threat intelligence feeds",
                state: "output-available",
                input: { cve: "CVE-2026-94545", range: "30d" },
                output: { kev: true, poc_repos: 2, campaigns: ["ShadowPixel"] },
                result: {
                type: "finding",
                icon: "intel",
                title: "Exploited in the wild",
                confidence: "High",
                evidence: [
                  { kind: "intel", signal: "Listed in CISA Known Exploited Vulnerabilities", source: "CISA KEV · added Oct 2", strength: "High", supports: true },
                  { kind: "intel", signal: "2 public proof-of-concept repositories", source: "GitHub · search", strength: "Medium", supports: true },
                  { kind: "intel", signal: "Used by the ShadowPixel campaign against retailers", source: "Mandiant · report #4471", strength: "High", supports: true },
                ],
                },
              },
            ],
          },
          {
            type: "agent",
            agent: "red-team",
            status: "error",
            summary: "Couldn't provision a staging replica: storefront-staging is at its instance quota",
            duration: 6,
            parts: [
              {
                type: "tool",
                name: "provision_sandbox",
                title: "Provision staging replica",
                state: "output-error",
                input: { source: "storefront-prod-1", env: "staging", isolate_network: true },
                error: "Instance quota exceeded",
              },
            ],
            task: "Reproduce CVE-2026-94545 against an isolated replica of storefront-prod-1. Never touch production.",
            transcript: [
              {
                type: "reasoning",
                duration: 3,
                text: "Plan: clone storefront-prod-1 into an isolated staging network, send a crafted TIFF to /upload, and watch for code execution. Production must not be touched, so everything runs on a replica.",
              },
              {
                type: "tool",
                name: "provision_sandbox",
                title: "Provision staging replica",
                state: "output-error",
                input: { source: "storefront-prod-1", env: "staging", region: "us-east-1", isolate_network: true },
                error: "Instance quota exceeded",
              },
              {
                type: "reasoning",
                duration: 1,
                text: "us-east-1 staging is at its quota. Trying a second region before giving up.",
              },
              {
                type: "tool",
                name: "provision_sandbox",
                title: "Provision staging replica in us-west-2",
                state: "output-error",
                input: { source: "storefront-prod-1", env: "staging", region: "us-west-2", isolate_network: true },
                error: "Snapshot access denied by SCP deny-cross-region-prod-snapshots",
              },
              {
                type: "reasoning",
                duration: 2,
                text: "Both paths are blocked by account guardrails, not by the target. I can't reproduce safely without someone raising the staging quota. Reporting back instead of retrying.",
              },
            ],
          },
          {
            type: "tool",
            name: "lookup_ownership",
            title: "Trace finding to owner",
            state: "output-available",
            input: { asset: "storefront-prod-1", signals: ["tags", "codeowners", "deploys", "memory"] },
            output: { owner: "web-platform", agreeing_signals: 4 },
            result: {
            type: "owner-trace",
            resource: "storefront-prod-1",
            team: "web-platform",
            confidence: "High",
            evidence: [
              { kind: "tag", signal: "Resource tag team=web-platform", source: "AWS · ec2/storefront-prod-1", strength: "High", supports: true },
              { kind: "code", signal: "@web-platform owns /services/storefront in CODEOWNERS", source: "github · storefront-web", strength: "High", supports: true },
              { kind: "deploy", signal: "Last 12 deploys triggered by web-platform members", source: "GitHub Actions · deploy-prod.yml", strength: "Medium", supports: true },
              { kind: "memory", signal: "storefront-* services are owned by @web-platform", source: "Agent memory · saved Aug 14", strength: "Medium", supports: true },
            ],
            },
          },
          { type: "memory", text: "storefront-* services are owned by @web-platform." },
          {
            type: "reasoning",
            duration: 3,
            text: "Exploitable and actively exploited. The red team couldn't reproduce it in staging, but the other two signals are strong enough: this can't wait for the next release. Handing off to the remediation agent to prepare the smallest safe fix.",
          },
          {
            type: "agent",
            agent: "remediation",
            status: "attention",
            task: "Prepare the smallest safe fix for CVE-2026-94545 on storefront-prod-1. Do not deploy without approval.",
            summary: "Plan ready: upgrade imgproc to 4.2.1 and redeploy",
            duration: 21,
            parts: [
              {
                type: "reasoning",
                duration: 6,
                text: "4.2.1 is a patch release with no breaking changes in the changelog. Bump the lockfile, run the image tests, open a PR, then redeploy storefront-prod-1.",
              },
              {
                type: "tool",
                name: "draft_pull_request",
                title: "Draft pull request",
                state: "output-available",
                input: { repo: "storefront-web", change: "imgproc 4.1.7 → 4.2.1" },
                output: { branch: "fix/cve-2026-94545", tests: "48 passed" },
              },
            ],
          },
          { type: "approval", title: "Create remediation plan", repo: "storefront-web", via: "remediation" },
        ],
      },
    ],
  },
  {
    id: "c5",
    title: "Auto-scan on new threats",
    updatedAt: minutesAgo(25),
    messages: [
      {
        id: "m1",
        role: "user",
        parts: [{ type: "text", text: "Whenever a new critical threat shows up that could hit our internet-facing assets, scan them right away and let me know what you find" }],
      },
      {
        id: "m2",
        role: "assistant",
        parts: [
          {
            type: "reasoning",
            duration: 5,
            text: "This is event-driven, not a fixed time: trigger on new threat intel, but only critical items that are exploited or have a public PoC, otherwise it'll fire constantly. First I'll resolve what \"internet-facing\" means today so the scope is concrete.",
          },
          {
            type: "tool",
            name: "search_assets",
            title: "Find internet-facing assets",
            state: "output-available",
            input: { exposure: "internet", environments: ["prod"] },
            output: { matches: 14, by_type: { load_balancers: 3, ec2: 7, api_gateways: 2, cdn_origins: 2 }, examples: ["storefront-prod-1", "api-gw-public", "auth-edge-2"] },
            result: {
              type: "finding",
              icon: "assets",
              title: "14 internet-facing assets in scope",
              entities: [
                { kind: "asset", label: "storefront-prod-1" },
                { kind: "asset", label: "api-gw-public" },
                { kind: "asset", label: "auth-edge-2" },
                { kind: "asset", label: "+11 more" },
              ],
              confidence: "High",
              evidence: [
                { kind: "network", signal: "Reachable from 0.0.0.0/0 via public ALBs, API gateways or CDN origins", source: "AWS · VPC reachability", strength: "High", supports: true },
                { kind: "tag", signal: "Tagged exposure=public on 12 of 14 assets", source: "AWS · resource tags", strength: "Medium", supports: true },
                { kind: "network", signal: "auth-edge-2 is tagged internal but has a public security group rule", source: "AWS · sg-0a91f", strength: "Medium", supports: false },
              ],
            },
          },
          {
            type: "tool",
            name: "create_scheduled_workflow",
            title: "Schedule scan on new threats",
            state: "output-available",
            input: {
              name: "Auto-scan exposed assets on new threats",
              trigger: { on: "threat_intel.new_threat", filter: { severity: "critical", any_of: ["cisa_kev", "public_poc", "active_campaign"] } },
              scope: { exposure: "internet", environments: ["prod"], dynamic: true },
              actions: [
                { run: "exploitability_scan", only_if: "asset matches affected product/version" },
                { notify: "itamar@rivalsecurity.io", when: "exploitable" },
              ],
              cooldown: "1h per threat",
            },
            output: { workflow_id: "wf_3k9x2", status: "active", assets_in_scope: 14, next_trigger: "on next matching threat" },
            result: {
              type: "finding",
              icon: "schedule",
              title: "Workflow active: scan on new critical threats",
              entities: [
                { kind: "trigger", label: "Critical · KEV, PoC or campaign" },
                { kind: "asset", label: "14 internet-facing assets" },
              ],
            },
          },
          { type: "memory", text: "Prefers automatic exploitability scans of internet-facing assets when a critical threat lands." },
          {
            type: "text",
            text: "**Done. Workflow is live.** Whenever threat intel reports a new **critical** threat that's in CISA KEV, has a public PoC, or is tied to an active campaign, I'll:\n\n1. Check which of your **14 internet-facing assets** run the affected product/version\n2. Run an exploitability scan on just those\n3. Notify you only if something is exploitable\n\nScope is dynamic, so new public assets get picked up automatically. You can pause or edit it from **Scheduled**. Want me to also open a remediation plan automatically when a scan comes back exploitable?",
          },
        ],
      },
    ],
  },
  {
    id: "c2",
    title: "Weekly PII leakage summary",
    updatedAt: minutesAgo(90),
    messages: [
      { id: "m1", role: "user", parts: [{ type: "text", text: "Summarize PII leaks to third-party LLMs this week" }] },
      {
        id: "m2",
        role: "assistant",
        parts: [
          { type: "reasoning", duration: 4, text: "Pulling DLP events tagged PII where the destination is an external model endpoint." },
          {
            type: "tool",
            name: "query_events",
            title: "Query DLP events",
            state: "output-available",
            input: { type: "pii", destination: "external_llm", range: "7d" },
            output: { total: 23, by_agent: { "Sales Agent": 14, "HR Bot": 6, "Support Copilot": 3 } },
          },
          {
            type: "text",
            text: "**23 PII events** reached external LLMs this week, up 40% from last week.\n\n- **Sales Agent** (14): customer emails and phone numbers sent to `gpt-5`\n- **HR Bot** (6): employee IDs in prompts\n- **Support Copilot** (3): partial card numbers, all redacted downstream\n\nMost of the increase comes from Sales Agent's new CRM integration. Want me to draft a redaction policy for it?",
          },
        ],
      },
    ],
  },
  {
    id: "c3",
    title: "Why was Support Copilot blocked?",
    updatedAt: minutesAgo(60 * 26),
    messages: [
      { id: "m1", role: "user", parts: [{ type: "text", text: "Why did Support Copilot get blocked yesterday?" }] },
      {
        id: "m2",
        role: "assistant",
        parts: [
          { type: "reasoning", duration: 3, text: "Looking up policy enforcement events for Support Copilot in the last 48h." },
          {
            type: "text",
            text: "Support Copilot was blocked at **14:02** after a user pasted a prompt-injection payload into a ticket. The *Jailbreak pattern* policy matched with 0.97 confidence and quarantined the session. No data left the boundary.",
          },
        ],
      },
    ],
  },
  {
    id: "c4",
    title: "Audit HR Bot tool permissions",
    updatedAt: minutesAgo(60 * 24 * 3),
    messages: [
      { id: "m1", role: "user", parts: [{ type: "text", text: "Which tools can HR Bot call, and are any over-privileged?" }] },
      {
        id: "m2",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "HR Bot has access to **5 tools**. Two look over-privileged:\n\n1. `workday.write_employee`: write access, but the bot only ever reads\n2. `gdrive.search`: org-wide scope instead of the HR folder\n\nI'd scope both down. Should I open a change request?",
          },
        ],
      },
    ],
  },
]

// ponytail: module-level store so new chats survive switching tabs and show up in AI Agents; resets on reload
export const conversationStore = { current: conversations }

// Canned reply played back (with fake streaming) for any new message. The orchestrator runs
// two helper agents in parallel, then summarizes. See send() in pages/conversation.tsx.
export const scriptedReply = {
  reasoning: "I'll check the threat landscape and safely test the attack path at the same time, then summarize what matters.",
  intel: {
    tool: {
      name: "search_threat_feeds",
      title: "Search threat intelligence feeds",
      input: { query: "prompt injection", range: "30d" },
      output: { campaigns: 2, targets: ["internal-search", "support-copilot"] },
    },
    summary: "2 related campaigns targeting internal search tools in the last 30 days",
    verdict: { label: "Active campaigns", tone: "risk" as const },
  },
  redTeam: {
    task: "Replay the payload from ALR-76498 and known variants against a staging replica of internal-search. Never touch production.",
    tool: {
      name: "run_exploit",
      title: "Replay attack against staging replica",
      input: { target: "internal-search-staging", payload: "ALR-76498" },
      output: { blocked: true, by: "guardrail:jailbreak-pattern", latency_ms: 41 },
    },
    finding: {
      type: "finding" as const,
      icon: "blocked" as const,
      title: "Attack blocked by guardrail",
      entities: [{ kind: "asset" as const, label: "internal-search-staging" }],
      confidence: "High" as const,
      evidence: [
        { kind: "network", signal: "Payload replayed 20 times, blocked every time", source: "red-team · run #812", strength: "High", supports: true },
        { kind: "code", signal: "Matched guardrail jailbreak-pattern v3", source: "policy · jailbreak-pattern", strength: "High", supports: true },
        { kind: "intel", signal: "One variant uses unicode homoglyphs not in the pattern list", source: "red-team · run #812", strength: "Medium", supports: false },
      ] satisfies Evidence[],
    },
    summary: "Blocked in 20 of 20 runs · 1 homoglyph variant not covered by the pattern list",
    verdict: { label: "Blocked", tone: "safe" as const },
  },
  text: "**Your guardrails held.** The red team agent replayed the attack from *ALR-76498* 20 times against a staging replica and it was blocked every time.\n\nThreat intel links it to **2 active campaigns** targeting internal search tools. One variant uses unicode homoglyphs that the current pattern list doesn't cover. Want me to have the remediation agent extend the guardrail?",
}

// Full run of the live red team agent, shown in its drawer once it finishes
export const redTeamTranscript: Part[] = [
  {
    type: "reasoning",
    duration: 2,
    text: "Plan: stand up an isolated replica of internal-search, replay the exact payload from ALR-76498, then try the known variants (base64, markdown-wrapped, unicode homoglyphs) to see if any slip past the guardrail.",
  },
  {
    type: "tool",
    name: "provision_sandbox",
    title: "Provision staging replica",
    state: "output-available",
    input: { source: "internal-search-prod", env: "staging", isolate_network: true },
    output: { replica: "internal-search-staging", ready_in_s: 38 },
  },
  {
    ...({
      type: "tool",
      name: "run_exploit",
      title: "Replay original payload (20 runs)",
      state: "output-available",
      input: { target: "internal-search-staging", payload: "ALR-76498", runs: 20 },
      output: { blocked: 20, passed: 0, by: "guardrail:jailbreak-pattern" },
    } as const),
    result: scriptedReply.redTeam.finding,
  },
  {
    type: "tool",
    name: "run_exploit",
    title: "Try base64-encoded variant",
    state: "output-available",
    input: { target: "internal-search-staging", variant: "base64", runs: 10 },
    output: { blocked: 10, passed: 0, by: "guardrail:encoded-instructions" },
  },
  {
    type: "tool",
    name: "run_exploit",
    title: "Try markdown-wrapped variant",
    state: "output-available",
    input: { target: "internal-search-staging", variant: "markdown-codeblock", runs: 10 },
    output: { blocked: 10, passed: 0, by: "guardrail:jailbreak-pattern" },
  },
  {
    type: "tool",
    name: "run_exploit",
    title: "Try unicode homoglyph variant",
    state: "output-available",
    input: { target: "internal-search-staging", variant: "homoglyph", runs: 10 },
    output: { blocked: 10, passed: 0, by: "guardrail:llm-classifier", note: "pattern list missed it; classifier caught it" },
  },
  {
    type: "reasoning",
    duration: 2,
    text: "All 50 attempts were blocked. The homoglyph variant got past the pattern list and was only caught by the slower LLM classifier, which is the weak spot worth fixing.",
  },
  { type: "memory", text: "internal-search guardrails: pattern list misses unicode homoglyphs; classifier is the backstop." },
]
