// Super agents: named patterns built from helper agents (components/chat/agents.ts).
// pattern = stages run in order; agents inside one stage run in parallel.
// script = the canned run played back when a super agent is started (see pages/conversation.tsx).
// Add a super agent by adding an entry here; it shows up on Home in every concept.

import { Bandage, ClipboardCheck, ListFilter, ScanEye, ShieldPlus, Target, Telescope, type LucideIcon } from "lucide-react"
import type { AgentKind } from "@/components/chat/agents"
import type { Verdict } from "@/components/chat/primitives"
import { nanoid } from "nanoid"
import type { StepResult } from "@/data/conversations"
import type { Draft } from "@/data/clone-flow"

export type SubagentScript = {
  activity: string // shown while running
  summary: string
  verdict?: Verdict
  tool: { name: string; title: string; input: unknown; output: unknown; result?: StepResult }
}

export type SuperAgent = {
  id: string
  name: string
  icon: LucideIcon
  hue: number // oklch hue for the agent's orb; the only place super agents get color
  category: "Exposure" | "AI agents" | "Compliance"
  tagline: string
  pattern: AgentKind[][]
  runtime: string // typical run time
  runsThisMonth: number
  about: string // longer description for the profile panel
  skills: { name: string; detail: string }[] // know-how it applies (procedures, playbooks), not agents
  tools: { name: string; connected: boolean; required?: boolean }[] // what it reaches. Missing optional = skips steps; missing required = can't run
  autonomy: { auto: string[]; approval: string[] } // what it does on its own vs. asks you first
  briefs: string[] // starter briefs; the first one is used when the agent is launched from a card
  flow?: { in: string; out: Partial<Record<AgentKind, string>> } // what moves between steps in a typical run (labels on the wide workflow graph)
  prompt?: string // the instructions the task runs with, in the user's words (shown in the template's Overview; falls back to the first brief)
  keywords: string[] // naive intent matching from free text (see matchSuperAgent)
  custom?: boolean // a user's clone: editable in the profile panel
  clonedFrom?: string // the Rival template a clone started from
  escalation?: string[] // where a clone reaches you (set in the guided clone chat, pages/clone.tsx)
  trigger?: { kind: "manual" | "schedule" | "event"; label: string }
  scope?: { label: string; assets: number } // the assets it runs on, chosen while creating it (lib/task-setup.ts)
  draft?: Draft // a clone's answers from the guided chat, so Customize can pick up where you left off
  createdAt?: Date // when you created it (clones)
  script: {
    plan: string
    handoffs: string[] // orchestrator reasoning between stages: one per stage boundary
    agents: Partial<Record<AgentKind, SubagentScript>>
    text: string
    approval?: { title: string; repo: string; via: AgentKind }
    // The run's bottom line, shown as the hero of the profile panel's Example output
    result: { verdict: string; detail: string; tone: "risk" | "warn" | "safe"; stats: { value: string; label: string }[] }
  }
}

export const superAgents: SuperAgent[] = [
  {
    // Triage: the backlog problem every security team has. Five scanners report the same issue five ways;
    // most of it isn't reachable or targeted. Triage turns that pile into a short, owned, ranked list.
    id: "triage",
    name: "Triage Hunter",
    icon: ListFilter,
    hue: 340,
    category: "Exposure",
    tagline: "Turns your scanner backlog into a ranked fix list.",
    flow: {
      in: "70 findings",
      out: { correlation: "41 issues", exploitability: "6 reachable", "threat-intel": "3 on KEV", prioritization: "13 to fix", ownership: "4 teams", reporting: "13 tickets" },
    },
    prompt: "Merge this week's scanner findings, rank them by real risk, and draft a ticket for each owner. Ask me before filing.",
    pattern: [["correlation"], ["exploitability", "threat-intel"], ["prioritization"], ["ownership"], ["reporting"]],
    runtime: "8 min",
    runsThisMonth: 342,
    about: "Pulls new findings from every scanner, merges the duplicates, checks which ones are actually reachable and being exploited, ranks them by real risk and routes each one to the team that owns it, with the evidence attached.",
    skills: [
      { name: "Finding deduplication", detail: "Matches the same issue across Trivy, Wiz, Semgrep, Snyk and Dependabot" },
      { name: "Risk-based prioritization", detail: "Exploitability × active threat × asset criticality, not CVSS alone" },
      { name: "SLA policy", detail: "P1 in 48 hours, P2 in 7 days, P3 in 30 days, P4 to backlog" },
      { name: "Ownership tracing", detail: "Tags, CODEOWNERS and deploy history" },
    ],
    tools: [{ name: "Wiz", connected: true }, { name: "Snyk", connected: true }, { name: "GitHub", connected: true }, { name: "Jira", connected: true }, { name: "Slack", connected: true }],
    autonomy: {
      auto: ["Read findings from every scanner", "Merge duplicates and rank by risk", "Trace owners"],
      approval: ["File tickets in owners' projects", "Change a finding's severity or close it"],
    },
    briefs: [
      "Triage this week's new findings and tell me what to fix first",
      "Which critical findings are duplicates across scanners?",
      "Who owns the open P1s, and are they on track?",
    ],
    keywords: ["triage", "prioriti", "backlog", "fix first", "dedup", "duplicate", "noise", "what should we fix"],
    script: {
      plan: "Triage playbook: merge duplicate findings first so nothing is counted twice, check exploitability and active threats in parallel, rank what's left by real risk, then route each issue to its owner with the evidence.",
      handoffs: [
        "70 findings collapse into 41 unique issues across 17 assets. Checking which of those are reachable and which are being exploited right now.",
        "6 issues are reachable from the internet and 3 of those are on CISA KEV. Ranking everything by exploitability, threat and how critical the asset is.",
        "4 P1s and 9 P2s; the other 28 go to backlog with a reason. Finding who owns the 13 that need action.",
        "Owners found for all 13, across 4 teams. Drafting tickets with evidence and the SLA for each.",
      ],
      agents: {
        correlation: {
          activity: "Merging findings from 5 scanners…",
          summary: "70 findings → 41 unique issues across 17 assets · 29 duplicates merged",
          tool: {
            name: "correlate_findings",
            title: "Deduplicate findings across scanners",
            input: { sources: ["trivy", "wiz", "semgrep", "snyk", "dependabot"], window: "7d" },
            output: { findings: 70, unique_issues: 41, duplicates_merged: 29, assets: 17 },
          },
        },
        exploitability: {
          activity: "Tracing reachability for 41 issues…",
          summary: "6 reachable from the internet with no compensating control",
          verdict: { label: "6 reachable", tone: "risk" },
          tool: {
            name: "trace_route",
            title: "Check reachability",
            input: { issues: 41, from: "0.0.0.0/0" },
            output: { reachable: 6, behind_waf: 11, internal_only: 24 },
            result: {
              type: "finding",
              icon: "exploit",
              title: "6 issues reachable from the internet",
              entities: [{ kind: "asset", label: "storefront-prod-1" }, { kind: "asset", label: "checkout-api" }, { kind: "asset", label: "acme-static-assets" }],
              confidence: "High",
              evidence: [
                { kind: "network", signal: "Public ALB routes /upload to storefront-prod-1", source: "AWS · alb-public", strength: "High", supports: true },
                { kind: "network", signal: "acme-static-assets bucket allows public read", source: "Wiz · s3 policy", strength: "High", supports: true },
              ],
            },
          },
        },
        "threat-intel": {
          activity: "Matching issues against KEV, EPSS and active campaigns…",
          summary: "3 issues on CISA KEV · 1 matches an active campaign (ShadowPixel)",
          verdict: { label: "Actively exploited", tone: "risk" },
          tool: {
            name: "search_threat_feeds",
            title: "Search threat intelligence feeds",
            input: { issues: 41, feeds: ["cisa-kev", "epss", "campaigns"] },
            output: { kev: 3, epss_over_0_5: 5, campaigns: ["ShadowPixel"] },
          },
        },
        prioritization: {
          activity: "Scoring 41 issues by exploitability, threat and asset criticality…",
          summary: "4 P1 · 9 P2 · 28 to backlog, each with the reason",
          tool: {
            name: "prioritize_issues",
            title: "Rank by real risk and set SLAs",
            input: { issues: 41, policy: "P1 48h · P2 7d · P3 30d" },
            output: { p1: 4, p2: 9, p3: 11, p4: 17 },
          },
        },
        ownership: {
          activity: "Correlating tags, CODEOWNERS and deploys…",
          summary: "13 issues routed to 4 teams: Storefront Platform, Payments, Data Platform, AI Platform",
          tool: {
            name: "trace_owner",
            title: "Trace owners",
            input: { issues: 13 },
            output: { teams: 4, unowned: 0 },
            result: {
              type: "owner-trace",
              resource: "storefront-prod-1",
              team: "Storefront Platform",
              confidence: "High",
              evidence: [
                { kind: "tag", signal: "team=storefront-platform tag on the instance", source: "AWS · ec2 tags", strength: "High", supports: true },
                { kind: "code", signal: "CODEOWNERS for /upload is @storefront-platform", source: "github · storefront-web", strength: "High", supports: true },
              ],
            },
          },
        },
        reporting: {
          activity: "Drafting tickets with evidence and SLAs…",
          summary: "13 tickets drafted · Slack summary ready for #sec-triage",
          tool: {
            name: "create_tickets",
            title: "Draft tickets for owners",
            input: { issues: 13, tracker: "jira", summary: "slack #sec-triage" },
            output: { drafted: 13, p1: 4, p2: 9 },
          },
        },
      },
      text: "**70 findings, but only 4 need fixing this week.** After merging duplicates there are 41 real issues; 6 are reachable from the internet and 3 of those are being exploited in the wild (CISA KEV).\n\nThe 4 P1s are on `storefront-prod-1`, `checkout-api` and `acme-static-assets`, owned by Storefront Platform, Payments and Data Platform. 9 more are P2 for this sprint, and the other 28 went to backlog with a reason each. The tickets are drafted and ready for your approval.",
      approval: { title: "File 13 tickets (4 P1, 9 P2) in the owners' Jira projects", repo: "Jira · SEC triage", via: "reporting" },
      result: { verdict: "4 to fix now", detail: "Out of 70 findings from 5 scanners", tone: "warn", stats: [{ value: "41", label: "unique issues" }, { value: "29", label: "duplicates merged" }, { value: "4", label: "teams notified" }] },
    },
  },
  {
    id: "exposure-hunter",
    name: "Exposure Hunter",
    icon: Telescope,
    hue: 250,
    category: "Exposure",
    tagline: "Finds what's reachable from the internet and closes it.",
    pattern: [["asset-discovery"], ["exploitability", "threat-intel"], ["remediation"]],
    runtime: "6 min",
    runsThisMonth: 128,
    about: "Starts from everything you expose to the internet, not from a scanner backlog. It keeps only what an attacker can actually reach and is being targeted right now, then drafts the fix.",
    skills: [
      { name: "Attack-surface mapping", detail: "DNS, load balancers and public IPs across every cloud" },
      { name: "Reachability analysis", detail: "Traces real network paths and WAF coverage" },
      { name: "Risk ranking", detail: "Exploitability × active threat, not CVSS alone" },
    ],
    tools: [{ name: "AWS", connected: true }, { name: "GCP", connected: true }, { name: "Cloudflare", connected: true }, { name: "GitHub", connected: true }],
    autonomy: {
      auto: ["Inventory assets and trace network paths", "Query threat intelligence feeds"],
      approval: ["Open fix PRs", "Change WAF or firewall rules"],
    },
    briefs: [
      "Which critical findings are exposed to the internet?",
      "Map our external attack surface and rank it by real risk",
      "Did anything new become internet-facing this week?",
    ],
    keywords: ["expos", "internet", "reachab", "attack surface", "public", "external", "facing"],
    script: {
      plan: "Exposure Hunter playbook: inventory everything internet-facing first, then check exploitability and active threats in parallel, and only hand confirmed risks to remediation.",
      handoffs: [
        "37 internet-facing assets, 9 with open critical findings. Checking which of those 9 are actually exploitable and being targeted.",
        "2 assets are exploitable and actively targeted. Handing only those to remediation; the other 7 go to the normal backlog.",
      ],
      agents: {
        "asset-discovery": {
          activity: "Enumerating DNS, load balancers and public IPs…",
          summary: "37 internet-facing assets · 9 with open critical findings",
          tool: {
            name: "enumerate_attack_surface",
            title: "Enumerate internet-facing assets",
            input: { sources: ["route53", "aws-elb", "gcp-lb", "cloudflare"] },
            output: { assets: 37, with_critical: 9, new_this_week: 2 },
          },
        },
        exploitability: {
          activity: "Tracing network paths to 9 assets…",
          summary: "2 of 9 reachable with no compensating control",
          verdict: { label: "2 exploitable", tone: "risk" },
          tool: {
            name: "trace_route",
            title: "Trace paths from the internet",
            input: { targets: 9, from: "0.0.0.0/0" },
            output: { reachable: 2, blocked_by_waf: 5, not_reachable: 2 },
            result: {
              type: "finding",
              icon: "exploit",
              title: "2 exploit paths confirmed",
              entities: [{ kind: "asset", label: "storefront-prod-1" }, { kind: "asset", label: "support-copilot-api" }],
              confidence: "High",
              evidence: [
                { kind: "network", signal: "Public ALB routes /upload straight to storefront-prod-1", source: "AWS · alb-public", strength: "High", supports: true },
                { kind: "network", signal: "support-copilot-api exposes /v1/chat without auth", source: "GCP · lb-copilot", strength: "High", supports: true },
              ],
            },
          },
        },
        "threat-intel": {
          activity: "Matching findings against active campaigns…",
          summary: "Both exploitable assets match active campaigns (ShadowPixel, PromptJack)",
          verdict: { label: "Actively targeted", tone: "risk" },
          tool: {
            name: "search_threat_feeds",
            title: "Search threat intelligence feeds",
            input: { cves: 9, range: "30d" },
            output: { kev: 3, campaigns: ["ShadowPixel", "PromptJack"] },
          },
        },
        remediation: {
          activity: "Drafting WAF rule and auth fix…",
          summary: "2 fixes drafted · 1 PR waiting for approval",
          tool: {
            name: "open_pull_request",
            title: "Open fix PR",
            input: { repo: "infra-edge", change: "WAF rule + require auth on /v1/chat" },
            output: { pr: "#2291", checks: "passing" },
          },
        },
      },
      text: "**37 assets face the internet, but only 2 are real risks right now.** `storefront-prod-1` and `support-copilot-api` are reachable with no compensating control, and both match campaigns that are active this month.\n\nThe other 7 critical findings sit behind a WAF or aren't reachable, so I left them in the normal backlog. The fix for the 2 urgent ones is ready for your review.",
      approval: { title: "Block /upload at the WAF and require auth on /v1/chat", repo: "infra-edge #2291", via: "remediation" },
      result: { verdict: "2 real risks", detail: "Exploitable and actively targeted", tone: "risk", stats: [{ value: "37", label: "internet-facing" }, { value: "7", label: "deprioritized" }, { value: "1", label: "fix PR ready" }] },
    },
  },
  {
    id: "injection-shield",
    name: "Injection Shield",
    icon: ShieldPlus,
    hue: 200,
    category: "AI agents",
    tagline: "Tests your AI agents against prompt injection.",
    pattern: [["threat-intel", "red-team"], ["remediation"]],
    runtime: "9 min",
    runsThisMonth: 86,
    about: "Thinks like the attacker: pulls this month's prompt-injection techniques, replays them against a staging copy of your agent, and patches whatever gets through.",
    skills: [
      { name: "Injection payload library", detail: "1,400+ jailbreak and indirect-injection variants" },
      { name: "Staging replay", detail: "Spins up an isolated replica of the target agent" },
      { name: "Guardrail authoring", detail: "Writes and regression-tests pattern and classifier rules" },
    ],
    tools: [{ name: "Rival Guardrails", connected: true }, { name: "Staging cluster", connected: true }, { name: "Threat feeds", connected: true }],
    autonomy: {
      auto: ["Attack staging replicas (never production)", "Draft guardrail changes"],
      approval: ["Ship guardrail changes to live agents"],
    },
    briefs: [
      "Is internal-search vulnerable to the latest prompt injection?",
      "Test support-copilot against this week's jailbreak techniques",
      "Harden every agent's guardrails against homoglyph attacks",
    ],
    keywords: ["inject", "jailbreak", "guardrail", "prompt", "homoglyph"],
    script: {
      plan: "Injection Shield playbook: pull the newest injection techniques and replay them against a staging replica at the same time, then patch whatever got through.",
      handoffs: [
        "Guardrails blocked every payload, but the homoglyph variant only got caught by the slow classifier. Asking remediation to close that gap in the fast pattern list.",
      ],
      agents: {
        "threat-intel": {
          activity: "Collecting injection techniques from the last 30 days…",
          summary: "14 new techniques · 2 campaigns targeting internal search tools",
          verdict: { label: "Active campaigns", tone: "risk" },
          tool: {
            name: "search_threat_feeds",
            title: "Search threat intelligence feeds",
            input: { query: "prompt injection", range: "30d" },
            output: { techniques: 14, campaigns: 2 },
          },
        },
        "red-team": {
          activity: "Replaying 50 payloads against internal-search-staging…",
          summary: "Blocked 50 of 50 · homoglyph variant slipped past the pattern list",
          verdict: { label: "Blocked", tone: "safe" },
          tool: {
            name: "run_exploit",
            title: "Replay payloads against staging replica",
            input: { target: "internal-search-staging", payloads: 50 },
            output: { blocked: 50, passed: 0, weak_spot: "homoglyph → caught by classifier only" },
            result: {
              type: "finding",
              icon: "blocked",
              title: "Attack blocked by guardrail",
              entities: [{ kind: "asset", label: "internal-search-staging" }],
              confidence: "High",
              evidence: [
                { kind: "network", signal: "50 payloads replayed, all blocked", source: "red-team · run #812", strength: "High", supports: true },
                { kind: "intel", signal: "Homoglyph variant bypassed the pattern list", source: "red-team · run #812", strength: "Medium", supports: false },
              ],
            },
          },
        },
        remediation: {
          activity: "Extending the jailbreak pattern list…",
          summary: "Pattern list extended with unicode normalization · ready to ship",
          tool: {
            name: "update_guardrail",
            title: "Update guardrail policy",
            input: { policy: "jailbreak-pattern", add: "unicode NFKC normalization" },
            output: { version: "v4", replay: "50/50 blocked by pattern list" },
          },
        },
      },
      text: "**Your guardrails held: 50 of 50 payloads were blocked.** One weak spot: the unicode homoglyph variant got past the fast pattern list and was only caught by the slower LLM classifier.\n\nI've drafted `jailbreak-pattern v4`, which normalizes unicode before matching. Replayed against staging, it now blocks all 50 at the first layer.",
      approval: { title: "Ship jailbreak-pattern v4 to all agents", repo: "guardrails #418", via: "remediation" },
      result: { verdict: "Guardrails held", detail: "1 weak spot, patched in v4", tone: "safe", stats: [{ value: "50/50", label: "payloads blocked" }, { value: "1", label: "slipped layer 1" }, { value: "1", label: "rule drafted" }] },
    },
  },
  {
    id: "patch-pilot",
    name: "Patch Pilot",
    icon: Bandage,
    hue: 155,
    category: "Exposure",
    tagline: "Takes a CVE from alert to a reviewed fix.",
    pattern: [["exploitability"], ["ownership"], ["remediation"]],
    runtime: "7 min",
    runsThisMonth: 214,
    about: "Owns a CVE end to end. Confirms it matters in your environment, finds who owns the code, and hands them a tested fix instead of a ticket.",
    skills: [
      { name: "CVE triage", detail: "CVSS, EPSS and CISA KEV in context" },
      { name: "Ownership tracing", detail: "Tags, CODEOWNERS and deploy history" },
      { name: "Dependency upgrades", detail: "Bumps, runs tests, writes the PR description" },
    ],
    tools: [{ name: "GitHub", connected: true }, { name: "AWS", connected: true }, { name: "ArgoCD", connected: true }, { name: "PagerDuty", connected: false }],
    autonomy: {
      auto: ["Search assets and trace owners", "Open draft PRs and run tests"],
      approval: ["Mark PRs ready for review", "Page the owning team's on-call"],
    },
    briefs: [
      "Remediate @CVE-2026-94545 as fast as possible",
      "Patch every critical CVE that's actually exploitable",
      "Who owns the assets affected by the imgproc CVE?",
    ],
    keywords: ["cve", "patch", "vulnerab", "remediat", "fix", "upgrade"],
    script: {
      plan: "Patch Pilot playbook: confirm the CVE is exploitable here, find who owns the affected code, then open a fix they can approve.",
      handoffs: [
        "Exploitable on storefront-prod-1. Finding the owning team before touching anything.",
        "Owned by Storefront Platform (high confidence). Opening the upgrade PR in their repo.",
      ],
      agents: {
        exploitability: {
          activity: "Searching assets for imgproc < 4.2.1…",
          summary: "storefront-prod-1 is reachable from the internet with no WAF on /upload",
          verdict: { label: "Exploitable", tone: "risk" },
          tool: {
            name: "search_assets",
            title: "Search assets for the vulnerable package",
            input: { cve: "CVE-2026-94545", package: "imgproc", versions: "<4.2.1" },
            output: { matches: 1, reachable: true },
          },
        },
        ownership: {
          activity: "Correlating tags, CODEOWNERS and deploys…",
          summary: "Storefront Platform team · on-call: Dana R.",
          tool: {
            name: "trace_owner",
            title: "Trace resource owner",
            input: { resource: "storefront-prod-1" },
            output: { team: "storefront-platform", oncall: "Dana R." },
            result: {
              type: "owner-trace",
              resource: "storefront-prod-1",
              team: "Storefront Platform",
              confidence: "High",
              evidence: [
                { kind: "tag", signal: "team=storefront-platform tag on the instance", source: "AWS · ec2 tags", strength: "High", supports: true },
                { kind: "code", signal: "CODEOWNERS for /upload is @storefront-platform", source: "github · storefront-web", strength: "High", supports: true },
                { kind: "deploy", signal: "Last 12 deploys by storefront-platform", source: "ArgoCD", strength: "Medium", supports: true },
              ],
            },
          },
        },
        remediation: {
          activity: "Bumping imgproc to 4.2.1 and running tests…",
          summary: "PR opened · tests passing",
          tool: {
            name: "open_pull_request",
            title: "Open upgrade PR",
            input: { repo: "storefront-web", bump: "imgproc 4.1.7 → 4.2.1" },
            output: { pr: "#1182", checks: "passing" },
          },
        },
      },
      text: "**CVE-2026-94545 is exploitable on `storefront-prod-1`**, and the Storefront Platform team owns it.\n\nI opened a PR that upgrades imgproc to 4.2.1, and tests pass. Once you approve, I'll notify their on-call and verify the fix in production.",
      approval: { title: "Upgrade imgproc to 4.2.1", repo: "storefront-web #1182", via: "remediation" },
      result: { verdict: "Exploitable", detail: "CVE-2026-94545 on storefront-prod-1", tone: "risk", stats: [{ value: "1", label: "owning team" }, { value: "4.2.1", label: "fixed version" }, { value: "Pass", label: "tests" }] },
    },
  },
  {
    id: "leak-sentinel",
    name: "Leak Sentinel",
    icon: ScanEye,
    hue: 300,
    category: "AI agents",
    tagline: "Catches AI agents leaking PII or secrets.",
    pattern: [["data-leak"], ["ownership"], ["reporting"]],
    runtime: "4 min",
    runsThisMonth: 97,
    about: "Watches what your AI agents say and touch. When one leaks personal data or a secret, it traces the agent's owner and drafts the incident report for privacy.",
    skills: [
      { name: "PII & secret detection", detail: "40+ detectors, tuned for agent responses" },
      { name: "Ownership tracing", detail: "Maps each agent to its team" },
      { name: "Privacy incident reporting", detail: "GDPR-ready 72-hour report template" },
    ],
    tools: [{ name: "Agent logs", connected: true }, { name: "Okta", connected: true }, { name: "Google Drive", connected: false }],
    autonomy: {
      auto: ["Scan agent responses and data access", "Draft incident reports"],
      approval: ["Notify owners", "Send reports to privacy"],
    },
    briefs: [
      "Which agents leaked PII this week?",
      "Scan HR Bot conversations for exposed employee data",
      "Did any agent print an API key in a response?",
    ],
    keywords: ["pii", "leak", "secret", "sensitive", "personal data", "api key", "exposed data"],
    script: {
      plan: "Leak Sentinel playbook: scan agent traffic for sensitive data, trace each leak to an owner, then write it up for privacy.",
      handoffs: [
        "2 agents leaked data this week. Finding who owns each one.",
        "Owners found. Writing the incident summary privacy needs within 72 hours.",
      ],
      agents: {
        "data-leak": {
          activity: "Scanning 41k agent responses for PII and secrets…",
          summary: "HR Bot returned salary data 3× · support-copilot echoed 1 API key",
          verdict: { label: "2 leaks", tone: "risk" },
          tool: {
            name: "scan_responses",
            title: "Scan agent responses for sensitive data",
            input: { range: "7d", detectors: ["pii", "secrets", "financial"] },
            output: { scanned: 41210, leaks: 4, agents: ["hr-bot", "support-copilot"] },
          },
        },
        ownership: {
          activity: "Tracing agent owners…",
          summary: "HR Bot → People Ops · support-copilot → CX Engineering",
          tool: {
            name: "trace_owner",
            title: "Trace agent owners",
            input: { agents: ["hr-bot", "support-copilot"] },
            output: { "hr-bot": "people-ops", "support-copilot": "cx-eng" },
          },
        },
        reporting: {
          activity: "Drafting incident summary…",
          summary: "Incident report drafted for privacy review",
          tool: {
            name: "draft_report",
            title: "Draft incident report",
            input: { template: "privacy-incident", leaks: 4 },
            output: { doc: "PRIV-2026-031", status: "draft" },
          },
        },
      },
      text: "**2 agents leaked sensitive data this week.** HR Bot returned salary details to 3 employees outside HR, and support-copilot echoed a Stripe test key back to a user.\n\nPeople Ops and CX Engineering own the two agents, and both have been notified. The privacy incident report `PRIV-2026-031` is drafted and waiting for your sign-off.",
      approval: { title: "Send incident report to privacy", repo: "PRIV-2026-031", via: "reporting" },
      result: { verdict: "2 leaks", detail: "PII and a secret exposed this week", tone: "risk", stats: [{ value: "3", label: "people exposed" }, { value: "2", label: "owners notified" }, { value: "1", label: "report drafted" }] },
    },
  },
  {
    id: "red-team-drill",
    name: "Red Team Drill",
    icon: Target,
    hue: 25,
    category: "AI agents",
    tagline: "Runs an adversarial drill on an AI agent before it ships.",
    pattern: [["threat-intel"], ["red-team", "exploitability"], ["reporting"]],
    runtime: "22 min",
    runsThisMonth: 31,
    about: "A pre-launch adversarial drill for any AI agent. It builds an attack plan from current threat intel, runs it against staging, and returns a go / no-go with evidence.",
    skills: [
      { name: "Attack planning", detail: "Mapped to MITRE ATLAS techniques" },
      { name: "Staging replay", detail: "Isolated replica, no production traffic" },
      { name: "Tool-permission audit", detail: "Finds tools an attacker could reach from input" },
      { name: "Launch readiness report", detail: "Go / no-go with blockers and evidence" },
    ],
    tools: [{ name: "Staging cluster", connected: true }, { name: "Threat feeds", connected: true }, { name: "Stripe (test mode)", connected: true }],
    autonomy: {
      auto: ["Attack staging replicas (never production)", "Audit tool permissions"],
      approval: ["Change an agent's tool permissions"],
    },
    briefs: [
      "Red team the new billing assistant before Friday's launch",
      "Run a full drill on support-copilot",
      "What would an attacker try first against HR Bot?",
    ],
    keywords: ["red team", "drill", "attack", "pentest", "before launch", "ship", "adversar"],
    script: {
      plan: "Red Team Drill playbook: build an attack plan from current threat intel, then attack the agent and its tools in parallel, and hand back a go/no-go report.",
      handoffs: [
        "Attack plan ready: 6 techniques that match billing-assistant's tools. Running them against a staging copy now.",
        "Drill finished: 1 of 6 techniques worked, through a tool permission rather than the prompt. Writing the launch report.",
      ],
      agents: {
        "threat-intel": {
          activity: "Building an attack plan for billing-assistant…",
          summary: "6 techniques relevant to agents with payment tools",
          tool: {
            name: "plan_attacks",
            title: "Build attack plan",
            input: { target: "billing-assistant", tools: ["stripe.refund", "crm.lookup"] },
            output: { techniques: 6 },
          },
        },
        "red-team": {
          activity: "Running 6 techniques against billing-assistant-staging…",
          summary: "5 of 6 blocked · indirect injection via CRM notes triggered a refund",
          verdict: { label: "1 bypass", tone: "risk" },
          tool: {
            name: "run_exploit",
            title: "Run attack plan on staging",
            input: { target: "billing-assistant-staging", techniques: 6 },
            output: { blocked: 5, succeeded: ["indirect-injection:crm-notes"] },
          },
        },
        exploitability: {
          activity: "Checking which tools are reachable from untrusted input…",
          summary: "stripe.refund has no amount cap and no human approval step",
          verdict: { label: "Over-privileged", tone: "risk" },
          tool: {
            name: "audit_tool_scopes",
            title: "Audit tool permissions",
            input: { agent: "billing-assistant" },
            output: { risky: ["stripe.refund (uncapped)"] },
          },
        },
        reporting: {
          activity: "Writing the launch readiness report…",
          summary: "No-go until refunds are capped · report ready",
          tool: {
            name: "draft_report",
            title: "Draft launch readiness report",
            input: { template: "launch-readiness" },
            output: { decision: "no-go", blockers: 1 },
          },
        },
      },
      text: "**Don't launch billing-assistant on Friday yet.** 5 of 6 attacks were blocked, but an injection hidden in CRM notes got it to issue a refund. `stripe.refund` has no amount cap and no approval step.\n\nCapping refunds at $50 and requiring human approval above that would unblock the launch. The report has the full attack transcript.",
      approval: { title: "Cap stripe.refund at $50 and require approval above it", repo: "billing-assistant #77", via: "reporting" },
      result: { verdict: "No-go", detail: "Injected CRM note triggered a refund", tone: "risk", stats: [{ value: "5/6", label: "attacks blocked" }, { value: "1", label: "bypass" }, { value: "$50", label: "proposed cap" }] },
    },
  },
  {
    id: "audit-ready",
    name: "Audit Ready",
    icon: ClipboardCheck,
    hue: 85,
    category: "Compliance",
    tagline: "Maps your AI agents' access into an audit-ready report.",
    pattern: [["asset-discovery"], ["data-leak", "ownership"], ["reporting"]],
    runtime: "15 min",
    runsThisMonth: 18,
    about: "Turns your AI estate into auditor-ready evidence: every agent, every tool, what data it can touch and who approved it, with exceptions flagged before the auditor finds them.",
    skills: [
      { name: "Agent inventory", detail: "Agents, tools, connectors and models" },
      { name: "Data-policy checks", detail: "Compares access with your data policy" },
      { name: "SOC 2 evidence packs", detail: "CC6.1 and CC6.3, auditor-ready" },
    ],
    tools: [{ name: "Agent registry", connected: true }, { name: "Okta", connected: true }, { name: "Vanta", connected: false, required: true }],
    autonomy: {
      auto: ["Inventory agents and check data access", "Assemble evidence packs"],
      approval: ["Share evidence outside the security team"],
    },
    briefs: [
      "Prepare the AI section of our SOC 2 evidence",
      "Which agents can access customer data, and who approved it?",
      "Audit HR Bot's tool permissions",
    ],
    keywords: ["audit", "complian", "soc", "iso", "permission", "evidence", "access"],
    script: {
      plan: "Audit Ready playbook: inventory every agent and its tools, check data access and ownership in parallel, then assemble the evidence pack.",
      handoffs: [
        "Found 23 agents with 61 tools between them. Checking which ones touch customer data and whether each has a named owner.",
        "21 of 23 are covered. 2 agents have no owner on record. Building the evidence pack and flagging those 2.",
      ],
      agents: {
        "asset-discovery": {
          activity: "Inventorying agents, tools and connectors…",
          summary: "23 agents · 61 tools · 9 with customer-data scope",
          tool: {
            name: "inventory_agents",
            title: "Inventory AI agents",
            input: { include: ["tools", "connectors", "models"] },
            output: { agents: 23, tools: 61, customer_data: 9 },
          },
        },
        "data-leak": {
          activity: "Checking data access against policy…",
          summary: "2 tools broader than policy allows",
          verdict: { label: "2 gaps", tone: "risk" },
          tool: {
            name: "check_data_policy",
            title: "Check access against data policy",
            input: { policy: "customer-data-v3" },
            output: { violations: 2 },
          },
        },
        ownership: {
          activity: "Matching agents to owners and approvals…",
          summary: "21 of 23 agents have a named owner",
          tool: {
            name: "trace_owner",
            title: "Trace agent owners",
            input: { agents: 23 },
            output: { owned: 21, orphaned: ["legacy-faq-bot", "sales-notes-agent"] },
          },
        },
        reporting: {
          activity: "Assembling the evidence pack…",
          summary: "SOC 2 CC6 evidence pack ready · 2 exceptions noted",
          tool: {
            name: "draft_report",
            title: "Assemble evidence pack",
            input: { framework: "SOC 2", controls: ["CC6.1", "CC6.3"] },
            output: { pages: 14, exceptions: 2 },
          },
        },
      },
      text: "**Your AI evidence pack for SOC 2 (CC6.1, CC6.3) is ready.** It covers 23 agents and 61 tools, 9 of them with access to customer data.\n\nThere are 2 exceptions to fix before the auditor sees them: `legacy-faq-bot` and `sales-notes-agent` have no owner on record, and 2 tools have broader data scope than policy allows.",
      result: { verdict: "Evidence ready", detail: "2 exceptions to fix before the audit", tone: "warn", stats: [{ value: "23", label: "agents" }, { value: "61", label: "tools" }, { value: "2", label: "exceptions" }] },
    },
  },
]

export const getSuperAgent = (id?: string) => superAgents.find((s) => s.id === id)

// Clone into the gallery so it can be customized. Shares the original's playbook (pattern, script, tools).
// ponytail: in-memory only, gone on reload; persist when clones are real
// patch = what the guided clone chat (pages/clone.tsx) customized
export function cloneSuperAgent(sa: SuperAgent, patch: Partial<SuperAgent> = {}): SuperAgent {
  const copy: SuperAgent = {
    ...sa, id: `${sa.clonedFrom ?? sa.id}-${nanoid(6)}`, name: `${sa.name} (copy)`, runsThisMonth: 0, briefs: [...sa.briefs], keywords: [],
    custom: true, clonedFrom: sa.clonedFrom ?? sa.id, createdAt: new Date(), ...patch,
  }
  superAgents.push(copy)
  return copy
}

// Naive intent match: the super agent whose keywords appear most in the text, if any
export function matchSuperAgent(text: string): SuperAgent | undefined {
  const t = text.toLowerCase()
  if (t.trim().length < 6) return undefined
  let best: SuperAgent | undefined
  let bestScore = 0
  for (const sa of superAgents) {
    const score = sa.keywords.filter((k) => t.includes(k)).length
    if (score > bestScore) { best = sa; bestScore = score }
  }
  return best
}

// Required apps that aren't connected yet: the super agent can't run until they are
export const blockers = (sa: SuperAgent) => sa.tools.filter((t) => t.required && !t.connected)
