import { agents, type AgentKind } from "@/components/chat/agents"
import type { SubagentScript, SuperAgent } from "@/data/super-agents"

/*
 * Clone a super agent through a guided chat (pages/clone.tsx).
 * The chat fills a Draft one slot at a time. It's adaptive, not a form:
 *   - follow-ups appear only when an answer calls for them (schedule → cadence, hands-off → limits, page on-call → connect PagerDuty)
 *   - free text is read for every open slot at once, so "weekly, critical CVEs in payments, ping #pay-sec" answers four questions
 *   - "not sure" / "you pick" takes the recommended option and says why
 * ponytail: keyword matching, not an LLM. Swap interpret() for a model call when this is real.
 */

export type Slot = "purpose" | "scope" | "trigger" | "cadence" | "autonomy" | "limits" | "escalation" | "connect" | "name"

export type Draft = {
  name: string
  purpose?: string
  focus?: string // short label of the purpose, for the review
  scope: string[]
  trigger?: { kind: "manual" | "schedule" | "event"; label: string }
  autonomy: { auto: string[]; approval: string[] }
  autonomyLabel?: string
  limits?: string
  escalation: string[]
  needs: string[] // tools an answer depends on (e.g. PagerDuty for paging)
  pattern: AgentKind[][]
  tools: SuperAgent["tools"]
  answered: Slot[]
}

export type Option = {
  label: string
  hint?: string
  recommended?: boolean
  why?: string // said when the user asks Rival to pick
  note: string // Rival's reflection after it's picked
  apply: (d: Draft) => Partial<Draft>
  schedule?: boolean // picking it opens the schedule picker inside the option (components/clone/schedule-picker.tsx)
}

export type Question = {
  slot: Slot
  header: string // short tab label in the questionnaire (≤12 chars)
  title: (d: Draft) => string
  detail?: (d: Draft) => string
  options: (d: Draft) => Option[]
  multi?: boolean // checkboxes, then Continue
  otherPlaceholder?: string // the free-text row; "Other" by default
  when?: (d: Draft) => boolean // only asked when relevant
}

/* ---------- Per-template content ---------- */

type Chip = { label: string; short?: string; hint?: string; match: RegExp }
type TemplateConfig = {
  purposes: (Omit<Option, "apply" | "note"> & { note: string; pattern?: AgentKind[][]; autonomy?: Draft["autonomy"]; purpose: string; brief?: (scope: string) => string })[]
  scopeAsk: string
  scopes: Chip[]
  event: { label: string; match: RegExp }
  channel: string
  altNames: string[]
  brief: (scope: string) => string
  asks: string[] // questions to try once it's created: what this agent actually answers
  example: string // one free-text answer that covers several questions at once (the composer's first suggestion)
  limits: string[]
}

const configs: Record<string, TemplateConfig> = {
  triage: {
    purposes: [
      { label: "Triage and route to owners", recommended: true, why: "every issue that matters lands with someone, with the evidence", purpose: "Merge duplicate findings, rank what's actually exploitable and route each issue to its owner with an SLA.", note: "Full playbook: dedupe, check exploitability and threats, rank, route." },
      { label: "Rank only, no tickets", purpose: "Merge duplicates and rank findings by real risk, without filing anything.", pattern: [["correlation"], ["exploitability", "threat-intel"], ["prioritization"]], autonomy: { auto: ["Read findings from every scanner", "Merge duplicates and rank by risk"], approval: [] }, brief: (s: string) => `Rank this week's findings by real risk${s ? `: ${s}` : ""}`, note: "Dropped ownership and reporting: you get a ranked list, nothing gets filed." },
      { label: "Weekly triage digest", purpose: "Summarize the week's new findings by risk and owner for the security lead.", pattern: [["correlation"], ["exploitability", "threat-intel"], ["prioritization"], ["reporting"]], brief: (s: string) => `Summarize this week's findings by risk${s ? `: ${s}` : ""}`, note: "No owner routing: one digest for you instead of tickets for teams." },
    ],
    scopeAsk: "Which findings should it triage?",
    scopes: [
      { label: "Critical & high severity", short: "Critical", hint: "CVSS 7.0 and above", match: /critical|high[- ]sev|\bhigh\b/i },
      { label: "Production assets", short: "Prod", hint: "Skip staging and dev", match: /\bprod(uction)?\b/i },
      { label: "Internet-facing assets", short: "Edge", hint: "Reachable from outside the network", match: /internet|external|public|exposed/i },
      { label: "Cloud (Wiz)", short: "Cloud", hint: "Misconfigurations and cloud resources", match: /cloud|wiz|aws|gcp/i },
      { label: "Code & dependencies", short: "Code", hint: "Semgrep, Snyk and Dependabot", match: /code|dependenc|snyk|semgrep|dependabot|repo/i },
    ],
    event: { label: "When a scanner reports a new critical", match: /new (critical|finding)|scanner|whenever|as soon as/i },
    channel: "#sec-triage",
    asks: ["What should we fix first this week?", "Which critical findings are duplicates across scanners?", "Who owns the open P1s, and are they on track?"],
    example: "Critical and high in production, every weekday morning, ping #sec-triage",
    altNames: ["Backlog Triage", "Fix-First List"],
    brief: (s) => `Triage this week's new findings and tell me what to fix first${s ? ` (${s})` : ""}`,
    limits: ["Draft tickets, never file them", "P1s only on their own", "At most 10 tickets a day"],
  },
  "patch-pilot": {
    purposes: [
      { label: "Fix exploitable CVEs end to end", recommended: true, why: "it's the full playbook: you get a tested PR instead of a ticket", purpose: "Confirm a CVE is exploitable here, find who owns the code, and hand them a tested fix.", note: "That's Patch Pilot's full playbook: exploitability, then owner, then a fix PR." },
      { label: "Triage and route, no code changes", purpose: "Confirm which CVEs actually matter here and route each one to its owner with evidence, without touching code.", pattern: [["exploitability"], ["ownership"], ["reporting"]], autonomy: { auto: ["Search assets and trace owners", "File tickets with evidence"], approval: ["Page the owning team's on-call"] } , brief: (s: string) => `Triage exploitable CVEs and route them to owners${s ? `: ${s}` : ""}`, note: "I swapped the remediation agent for a reporting agent, so it files evidence for the owner instead of opening PRs." },
      { label: "Keep dependencies patched", purpose: "Keep vulnerable dependencies upgraded across our repos, batching tested bumps per repo before they turn into incidents." , brief: (s: string) => `Upgrade vulnerable dependencies${s ? ` in ${s}` : " across our repos"}`, note: "Same team of agents, but pointed at dependency hygiene instead of single CVEs." },
    ],
    scopeAsk: "Which CVEs should it pick up?",
    scopes: [
      { label: "Critical & high severity", short: "Critical", hint: "CVSS 7.0 and above", match: /critical|high[- ]sev|\bhigh\b/i },
      { label: "Known exploited (KEV)", short: "KEV", hint: "On CISA's Known Exploited Vulnerabilities list", match: /\bkev\b|known exploited|actively exploited/i },
      { label: "Internet-facing assets", short: "Edge", hint: "Reachable from outside the network", match: /internet|external|public|exposed/i },
      { label: "Payments services", short: "Payments", hint: "checkout-api, billing-worker, ledger", match: /payment|billing|checkout/i },
      { label: "Storefront services", short: "Storefront", hint: "storefront-web, storefront-prod-1", match: /storefront|shop/i },
      { label: "Production only", short: "Prod", hint: "Skip staging and dev", match: /\bprod(uction)?\b/i },
    ],
    event: { label: "When a CVE lands on CISA KEV", match: /\bkev\b.*(land|add|hit)|new cve|as soon as|whenever|when a cve/i },
    channel: "#sec-patching",
    asks: ["Which CVEs in my scope are exploitable right now?", "Who owns the assets affected by @CVE-2026-94545?", "What would it take to patch every critical CVE this week?"],
    example: "Only KEV CVEs in payments services, every weekday, and page on-call if it's exploitable",
    altNames: ["CVE Fast Lane", "Patch Patrol"],
    brief: (s) => `Find and fix exploitable CVEs${s ? `: ${s}` : ""}`,
    limits: ["Patch and minor bumps only", "Non-production repos only", "At most 3 PRs a day"],
  },
  "exposure-hunter": {
    purposes: [
      { label: "Find and close real exposures", recommended: true, why: "it ends with a fix, not another list", purpose: "Find what an attacker can actually reach from the internet and draft the fix.", note: "Keeping the full hunt: discover, verify, fix." },
      { label: "Alert on new exposure only", purpose: "Watch for anything newly internet-facing and tell the owner when it's exploitable.", pattern: [["asset-discovery"], ["exploitability"], ["ownership"]], autonomy: { auto: ["Inventory assets and trace network paths", "Notify owners"], approval: ["Change WAF or firewall rules"] } , brief: (s: string) => `Did anything exploitable become internet-facing${s ? ` in ${s}` : ""}?`, note: "Swapped remediation for the ownership agent, so it alerts the right team instead of drafting fixes." },
      { label: "Map the attack surface for reporting", purpose: "Produce a ranked map of our external attack surface for leadership.", pattern: [["asset-discovery"], ["threat-intel"], ["reporting"]] , brief: (s: string) => `Map our external attack surface${s ? ` in ${s}` : ""} and rank it by real risk`, note: "Ends with a reporting agent now, so you get a ranked map rather than PRs." },
    ],
    scopeAsk: "Where should it look?",
    scopes: [
      { label: "AWS", short: "AWS", match: /\baws\b|amazon/i },
      { label: "GCP", short: "GCP", match: /\bgcp\b|google cloud/i },
      { label: "Cloudflare edge", short: "Edge", match: /cloudflare|edge|cdn/i },
      { label: "Production accounts", short: "Prod", match: /\bprod(uction)?\b/i },
      { label: "New in the last 7 days", short: "Fresh", match: /new|recent|this week/i },
    ],
    event: { label: "When a new asset becomes internet-facing", match: /new asset|becomes? (public|internet)|whenever|as soon as/i },
    channel: "#sec-exposure",
    asks: ["Which critical findings are exposed to the internet?", "Did anything new become internet-facing this week?", "Which exposed assets match an active campaign?"],
    example: "Just AWS and Cloudflare, whenever a new asset becomes public, post in #edge-team",
    altNames: ["Edge Watch", "Surface Patrol"],
    brief: (s) => `What's exploitable from the internet in ${s || "our clouds"}?`,
    limits: ["Staging and non-prod only", "Draft rules, never apply them", "At most 3 changes a day"],
  },
  "injection-shield": {
    purposes: [
      { label: "Test and harden guardrails", recommended: true, why: "it closes the gaps it finds instead of just reporting them", purpose: "Replay the newest prompt-injection techniques against our agents and patch whatever gets through.", note: "Full playbook: attack in staging, then patch the guardrails." },
      { label: "Test only, report weak spots", purpose: "Replay injection techniques against our agents and report weak spots to their owners.", pattern: [["threat-intel", "red-team"], ["reporting"]], autonomy: { auto: ["Attack staging replicas (never production)", "Write findings reports"], approval: [] } , brief: (s: string) => `Find injection weak spots in ${s || "our agents"}`, note: "Remediation is out and a reporting agent is in: it finds gaps, you decide the fix." },
      { label: "Regression-test guardrail changes", purpose: "Re-run the full payload library whenever guardrails change, so a fix never reopens an old hole.", note: "Same team, aimed at regressions." },
    ],
    scopeAsk: "Which agents should it attack?",
    scopes: [
      { label: "support-copilot", short: "Support", match: /support/i },
      { label: "internal-search", short: "Search", match: /search/i },
      { label: "HR Bot", short: "HR", match: /\bhr\b/i },
      { label: "billing-assistant", short: "Billing", match: /billing/i },
      { label: "All customer-facing agents", short: "Customer", match: /customer|external|all/i },
    ],
    event: { label: "When a new jailbreak technique is published", match: /new (jailbreak|technique|injection)|whenever|as soon as/i },
    channel: "#ai-guardrails",
    asks: ["Is internal-search vulnerable to the latest prompt injection?", "Which of my agents is most exposed to jailbreaks?", "Did any payload get past the guardrails this week?"],
    example: "Attack support-copilot and billing every Monday, open a Jira ticket for anything that gets through",
    altNames: ["Guardrail Gauntlet", "Prompt Patrol"],
    brief: (s) => `Test ${s || "our agents"} against this month's injection techniques`,
    limits: ["Staging only", "Pattern-list changes only", "At most 1 release a day"],
  },
  "leak-sentinel": {
    purposes: [
      { label: "Catch leaks and file the report", recommended: true, why: "privacy gets a 72-hour-ready report without chasing anyone", purpose: "Catch AI agents leaking PII or secrets, trace the owner and draft the incident report.", note: "Keeping the full flow: detect, trace owner, report." },
      { label: "Alert owners in real time", purpose: "Tell an agent's owner the moment it leaks personal data or a secret.", pattern: [["data-leak"], ["ownership"]], autonomy: { auto: ["Scan agent responses and data access", "Notify owners"], approval: ["Send reports to privacy"] } , brief: (s: string) => `Which agents leaked ${s || "sensitive data"} today, and who owns them?`, note: "Dropped the reporting stage so alerts go out fast; owners get pinged directly." },
      { label: "Weekly privacy digest", purpose: "Summarize the week's leaks and near-misses for the privacy team.", pattern: [["data-leak"], ["reporting"]] , brief: (s: string) => `Summarize this week's leaks of ${s || "sensitive data"}`, note: "Lighter team: detection and a digest, no owner tracing." },
    ],
    scopeAsk: "What kind of data matters most here?",
    scopes: [
      { label: "Customer PII", short: "Customer", match: /customer|pii|personal/i },
      { label: "Employee data", short: "HR", match: /employee|\bhr\b|staff/i },
      { label: "API keys & secrets", short: "Secrets", match: /key|secret|token|credential/i },
      { label: "Health data", short: "Health", match: /health|phi|medical/i },
    ],
    event: { label: "When an agent response is flagged", match: /flag|real.?time|as soon as|whenever|immediately/i },
    channel: "#privacy-alerts",
    asks: ["Which agents leaked PII this week?", "Did any agent print an API key in a response?", "Who owns the agent with the most leaks this month?"],
    example: "Watch HR Bot for employee data in real time and ping #people-privacy",
    altNames: ["PII Watch", "Leak Radar"],
    brief: (s) => `Did any agent leak ${s || "sensitive data"} this week?`,
    limits: ["Notify owners only, never privacy", "Redact samples in reports", "At most 5 alerts an hour"],
  },
  "red-team-drill": {
    purposes: [
      { label: "Go / no-go before launch", recommended: true, why: "you get a clear launch decision with evidence", purpose: "Run a full adversarial drill on an AI agent before it ships and return a go / no-go.", note: "Full drill: plan, attack, report." },
      { label: "Tool-permission audit only", purpose: "Find tools an attacker could reach from an agent's input, without running a full drill.", pattern: [["exploitability"], ["reporting"]] , brief: (s: string) => `Which tools can an attacker reach in ${s || "our agents"}?`, note: "Lighter, faster: only checks which tools are reachable from input." },
      { label: "Recurring drills on live agents", purpose: "Keep drilling agents that are already live, against a staging replica, as new techniques appear.", note: "Same team, on repeat." },
    ],
    scopeAsk: "Which agents and attacks should it focus on?",
    scopes: [
      { label: "billing-assistant", short: "Billing", match: /billing/i },
      { label: "support-copilot", short: "Support", match: /support/i },
      { label: "Agents with payment tools", short: "Payments", match: /payment|stripe|refund/i },
      { label: "Data exfiltration", short: "Exfil", match: /exfil|data theft|leak/i },
      { label: "MITRE ATLAS top 10", short: "ATLAS", match: /atlas|mitre/i },
    ],
    event: { label: "When an agent is tagged for launch", match: /launch|release|ship|tagged/i },
    channel: "#ai-launches",
    asks: ["Is billing-assistant ready to launch?", "What would an attacker try first against HR Bot?", "Which tools can an attacker reach from user input?"],
    example: "Drill every agent with payment tools when it's tagged for launch, email me the go / no-go",
    altNames: ["Launch Gate", "Pre-flight Drill"],
    brief: (s) => `Run a full drill on ${s || "the next agent to launch"}`,
    limits: ["Staging only", "Read-only tool calls", "No more than 1 drill at a time"],
  },
  "audit-ready": {
    purposes: [
      { label: "SOC 2 evidence pack", recommended: true, why: "that's what your auditors ask for first", purpose: "Turn our AI estate into SOC 2 evidence: agents, tools, data access and approvals.", note: "Keeping the SOC 2 playbook: CC6.1 and CC6.3." },
      { label: "ISO 42001 evidence", purpose: "Assemble ISO 42001 evidence for our AI management system." , brief: (s: string) => `Prepare ISO 42001 evidence for ${s || "our AI agents"}`, note: "Same team, mapped to ISO 42001 controls instead." },
      { label: "Customer-data access review", purpose: "Show which agents can reach customer data and who approved it.", pattern: [["asset-discovery"], ["data-leak"], ["reporting"]] , brief: (s: string) => `Which agents can reach customer data${s ? ` (${s})` : ""}, and who approved it?`, note: "Dropped ownership tracing: it's an access review, the approver is what matters." },
    ],
    scopeAsk: "Which part of the AI estate is in scope?",
    scopes: [
      { label: "All AI agents", short: "All", match: /\ball\b|every/i },
      { label: "Agents with customer data", short: "Customer", match: /customer/i },
      { label: "Production agents", short: "Prod", match: /\bprod(uction)?\b/i },
      { label: "Third-party models", short: "Vendor", match: /third.?party|vendor|openai|external model/i },
    ],
    event: { label: "When an agent gets a new tool", match: /new tool|permission change|gets? (a )?tool|whenever/i },
    channel: "#grc",
    asks: ["Which agents can access customer data, and who approved it?", "What's still missing from our SOC 2 evidence?", "Which agent permissions changed this month?"],
    example: "Agents with customer data, first of the month, share it in #grc",
    altNames: ["Evidence Desk", "Audit Copilot"],
    brief: (s) => `Prepare audit evidence for ${s || "our AI agents"}`,
    limits: ["Security team only", "Read-only checks", "Weekly at most"],
  },
}

export const configFor = (sa: SuperAgent) => configs[sa.clonedFrom ?? sa.id] ?? configs["patch-pilot"]

/* ---------- The questions ---------- */

const list = (xs: string[]) => xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`

// Each question is shown in the questionnaire card above the chat (components/clone/question-card.tsx):
// title = the question, detail = one line of context under it, option hints = the line under each option.
export function questions(sa: SuperAgent): Question[] {
  const c = configFor(sa)
  const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
  return [
    {
      slot: "name",
      header: "Name",
      title: () => "What should we call your agent?",
      detail: () => "Type a name, or pick one. You can rename it any time.",
      otherPlaceholder: "Type a name",
      options: (d) => nameIdeas(sa, d).map((n, i) => ({ label: n, hint: i === 0 ? "Says it's your version" : "Short and easy to spot on Home", recommended: i === 0, why: "it's clearly your version", note: "", apply: () => ({ name: n }) })),
    },
    {
      slot: "purpose",
      header: "Mission",
      title: () => "What's its mission?",
      otherPlaceholder: "Describe it in your own words",
      detail: () => `Pick one or describe it. Skip to keep ${sa.name}'s: ${lower(sa.tagline)}`,
      options: () => c.purposes.map((p) => ({
        ...p,
        hint: p.purpose,
        // Switching purpose resets the team and permissions to what that purpose needs
        apply: () => ({
          purpose: p.purpose, focus: p.label, pattern: p.pattern ?? sa.pattern.map((s) => [...s]),
          autonomy: p.autonomy ?? { auto: [...sa.autonomy.auto], approval: [...sa.autonomy.approval] }, autonomyLabel: undefined, limits: undefined,
        }),
      })),
    },
    {
      slot: "scope",
      header: "Scope",
      multi: true,
      title: () => c.scopeAsk,
      detail: () => "Select all that apply. Leave it empty to cover everything.",
      options: () => c.scopes.map((s, i) => ({
        label: s.label, hint: s.hint, recommended: i === 0, why: "it's the smallest scope that still catches what matters",
        note: "", apply: (d) => ({ scope: d.scope.includes(s.label) ? d.scope : [...d.scope, s.label] }),
      })),
    },
    {
      slot: "trigger",
      header: "Runs",
      title: () => "When should it run?",
      detail: (d) => d.scope.length ? `With ${list(d.scope.map(lc))} in scope, a trigger usually beats a schedule.` : "Pick what wakes it up.",
      options: () => [
        { label: c.event.label, hint: "Reacts the moment it matters, no schedule needed", recommended: true, why: "it reacts the moment it matters instead of waiting for a schedule", note: "It'll wake up on that event, no schedule needed.", apply: () => ({ trigger: { kind: "event", label: c.event.label } }) },
        { label: "On a schedule", hint: "Pick the days and time", schedule: true, note: "", apply: () => ({ trigger: { kind: "schedule", label: "On a schedule" } }) },
        { label: "Only when I brief it", hint: "Waits on Home until you give it a task", note: "On demand it is. You'll find it on Home, ready to brief.", apply: () => ({ trigger: { kind: "manual", label: "On demand" } }) },
      ],
    },
    {
      slot: "autonomy",
      header: "Permissions",
      title: () => "How much should it do without asking you?",
      detail: (d) => d.autonomy.approval.length ? `Today it asks before it will ${list(d.autonomy.approval.map(lower))}.` : "Today it never stops to ask.",
      options: (d) => [
        { label: "Keep Rival's defaults", hint: "Works on its own; anything that touches production waits for you", recommended: true, why: "it already asks before anything reaches production", note: "Keeping the defaults: it works on its own, and anything that changes production waits for you.", apply: () => ({ autonomyLabel: "Rival's defaults" }) },
        { label: "Ask me before every change", hint: "Investigates on its own, asks before it changes or sends anything", note: "Tighter: it'll investigate on its own but ask before it changes or sends anything.", apply: (x) => ({ autonomyLabel: "Ask first", autonomy: { auto: x.autonomy.auto.slice(0, 1), approval: [...x.autonomy.auto.slice(1), ...x.autonomy.approval] } }) },
        ...d.autonomy.approval.slice(0, 1).map((a) => ({
          label: `Let it ${lower(a)} on its own`, hint: "Everything else still waits for you", note: `Done. It'll ${lower(a)} without waiting for you.`,
          apply: (x: Draft) => ({ autonomyLabel: "Custom", autonomy: { auto: [...x.autonomy.auto, a], approval: x.autonomy.approval.filter((y) => y !== a) } }),
        })),
        { label: "Hands-off", hint: "Acts on its own. You'll set a guardrail next", note: "Hands-off it is; I'll ask for a guardrail next.", apply: (x) => ({ autonomyLabel: "Hands-off", autonomy: { auto: [...x.autonomy.auto, ...x.autonomy.approval], approval: [] } }) },
      ],
    },
    {
      slot: "limits",
      header: "Guardrail",
      when: (d) => d.autonomyLabel === "Hands-off",
      // Without a remediation agent it changes nothing, so the guardrail is about who it bothers, not what it changes
      title: (d) => fixes(d) ? "What can it change by itself?" : "How loud can it be on its own?",
      detail: (d) => fixes(d) ? "Hands-off is a lot of trust. Anything beyond the guardrail comes back to you." : "It won't change anything, but it will reach people without asking.",
      options: (d) => [
        ...(fixes(d) ? c.limits : ["Business hours only", "Never page, only post", "At most 5 notifications a day"]).map((label, i) => ({ label, hint: i === 0 ? "Smallest blast radius while you build trust" : "Anything beyond it waits for you", recommended: i === 0, why: "it keeps the blast radius small while you build trust", note: `Guardrail set: ${label.toLowerCase()}. Anything beyond that comes back to you.`, apply: () => ({ limits: label }) })),
        { label: "No limits", hint: "Every action is still logged in Agent activity", note: "No limits. I'll still log everything it does in Agent activity.", apply: () => ({ limits: "None" }) },
      ],
    },
    {
      slot: "escalation",
      header: "Escalation",
      multi: true,
      title: (d) => d.autonomyLabel === "Hands-off" ? "Who should hear when it acts?" : "Where should it reach you?",
      detail: () => "Select all that apply.",
      options: () => [
        { label: `Slack ${c.channel}`, hint: "The team sees it, and you can approve from the thread", recommended: true, why: "the whole team sees it, and you can approve from the thread", note: "", apply: (d) => ({ escalation: [...d.escalation, `Slack ${c.channel}`] }) },
        { label: "Owning team's channel", hint: "Goes to whoever owns the affected asset", note: "", apply: (d) => ({ escalation: [...d.escalation, "Owning team's channel"] }) },
        { label: "Page on-call (PagerDuty)", hint: "For anything critical, day or night", note: "", apply: (d) => ({ escalation: [...d.escalation, "Page on-call (PagerDuty)"], needs: [...d.needs, "PagerDuty"] }) },
        { label: "Jira ticket", hint: "A ticket with the evidence attached", note: "", apply: (d) => ({ escalation: [...d.escalation, "Jira ticket"] }) },
        { label: "Email digest", hint: "One summary a day", note: "", apply: (d) => ({ escalation: [...d.escalation, "Email digest"] }) },
      ],
    },
    {
      slot: "connect",
      header: "Apps",
      when: (d) => missing(d).length > 0,
      title: (d) => `Connect ${list(missing(d).map((t) => t.name))}?`,
      detail: (d) => {
        const m = missing(d)
        return m.some((t) => t.required)
          ? `It's required: ${sa.name} can't run without it.`
          : `It isn't connected yet, so ${d.escalation.some((e) => e.includes("PagerDuty")) ? "it can't page on-call" : "it will skip the steps that need it"}.`
      },
      options: (d) => [
        { label: `Connect ${list(missing(d).map((t) => t.name))} now`, hint: "One-time sign-in, takes a few seconds", recommended: true, why: "it's a one-time sign-in and unlocks the whole flow", note: `${list(missing(d).map((t) => t.name))} connected.`, apply: (x) => ({ tools: x.tools.map((t) => missing(x).includes(t) ? { ...t, connected: true } : t) }) },
        { label: "Skip for now", hint: missing(d).some((t) => t.required) ? "It'll show Needs setup until it's connected" : "It falls back to Slack until then", note: missing(d).some((t) => t.required) ? "Skipped. You can still create it; it'll show *Needs setup* until it's connected." : "Skipped. Until it's connected, it'll fall back to Slack.", apply: (x) => ({ escalation: missing(x).some((t) => t.name === "PagerDuty") ? x.escalation.filter((e) => !e.includes("PagerDuty")) : x.escalation }) },
      ],
    },
  ]
}

// Does this team change things (a remediation agent), or only find and tell?
const fixes = (d: Draft) => d.pattern.flat().includes("remediation")

// Tools an answer depends on (or the template requires) that aren't connected
export function missing(d: Draft) {
  const tools = d.tools
  return tools.filter((t) => !t.connected && (t.required || d.needs.includes(t.name)))
}

export function nameIdeas(sa: SuperAgent, d: Draft) {
  const c = configFor(sa)
  const base = sa.clonedFrom ? sa.name.replace(/ \(.*\)$/, "") : sa.name
  const short = c.scopes.find((s) => d.scope.includes(s.label))?.short
  return [...new Set([short ? `${short} ${base}` : `My ${base}`, ...c.altNames])].slice(0, 3)
}

export function initialDraft(sa: SuperAgent): Draft {
  const hasPd = sa.tools.some((t) => t.name === "PagerDuty")
  return {
    name: `${sa.name} (copy)`,
    scope: [],
    autonomy: { auto: [...sa.autonomy.auto], approval: [...sa.autonomy.approval] },
    escalation: [],
    needs: [],
    pattern: sa.pattern.map((s) => [...s]),
    // PagerDuty is offered for paging on-call; add it (disconnected) so the draft can show and connect it
    tools: [...sa.tools.map((t) => ({ ...t })), ...(hasPd ? [] : [{ name: "PagerDuty", connected: false }])],
    answered: [],
  }
}

export const nextQuestion = (qs: Question[], d: Draft) => qs.find((q) => !d.answered.includes(q.slot) && (!q.when || q.when(d)))

/* ---------- Reading free text ---------- */

const UNSURE = /^(not sure|idk|i don'?t know|you (pick|choose|decide)|whatever you (think|recommend)|recommend|default|up to you|dunno|no idea)/i
export const DONE = /^(create( it)?|looks good|lgtm|ship it|done|yes|perfect|go|that'?s it)\b/i

// Reads one free-text answer against every open slot. Returns the patch, the slots it filled, and what to say.
// No current question = the review: any slot can change, and nothing is taken literally.
export function interpret(sa: SuperAgent, qs: Question[], d: Draft, current: Question | undefined, text: string, own = false): { patch: Draft; filled: Slot[]; notes: string[] } {
  const c = configFor(sa)
  const t = text.trim()
  const notes: string[] = []
  let draft = { ...d }
  const filled: Slot[] = []
  const fill = (slot: Slot, patch: Partial<Draft>) => { draft = { ...draft, ...patch }; filled.push(slot) }
  const open = (slot: Slot) => !current || !d.answered.includes(slot)

  if (current) {
    const opts = current.options(d)
    // "You pick": the recommended option, with the reason
    if (UNSURE.test(t)) {
      const rec = opts.find((o) => o.recommended) ?? opts[0]
      fill(current.slot, rec.apply(draft))
      // The option's own note, unless it just repeats the pick
      const extra = rec.note && !rec.note.toLowerCase().includes(rec.label.toLowerCase()) ? ` ${rec.note}` : ""
      notes.push(`I'd go with **${rec.label}**${rec.why ? `: ${rec.why}` : ""}.${extra}`)
      return { patch: draft, filled, notes }
    }
    // Yes / no to connecting an app
    if (current.slot === "connect") {
      const o = /skip|later|not now|\bno\b|don'?t/i.test(t) ? opts[1] : opts[0]
      fill("connect", o.apply(draft)); notes.push(o.note)
      return { patch: draft, filled, notes }
    }
    // An option typed out (or close to it)
    const typed = opts.find((o) => t.toLowerCase().includes(o.label.toLowerCase()) || (t.length > 3 && o.label.toLowerCase().includes(t.toLowerCase())))
    if (typed && !current.multi) {
      fill(current.slot, typed.apply(draft)); if (typed.note) notes.push(typed.note)
    }
  }

  // Purpose: strong signals only
  if (open("purpose") && !filled.includes("purpose") && /don'?t (fix|change)|no (code )?changes|just (report|triage|route|alert)|report only|read.?only|without touching/i.test(t)) {
    const o = qs[0].options(draft)[1]
    fill("purpose", o.apply(draft)); notes.push(o.note)
  }

  // Scope: every chip it mentions
  if (open("scope")) {
    const hits = c.scopes.filter((s) => s.match.test(t)).map((s) => s.label)
    if (hits.length) fill("scope", { scope: [...new Set([...(current ? draft.scope : []), ...hits])] })
  }

  // Trigger + cadence
  if (open("trigger") && !filled.includes("trigger")) {
    const cadence = t.match(/\b(every (?:week)?day|every (?:monday|tuesday|wednesday|thursday|friday|week|morning|night)|twice a day|first of the month|daily|weekly|nightly|monthly|hourly)\b/i)
    if (cadence) {
      const k = cadence[1].toLowerCase()
      const label = ({ daily: "Every day", weekly: "Every week", nightly: "Nightly at 02:00", monthly: "Every month", hourly: "Every hour" } as Record<string, string>)[k] ?? k.charAt(0).toUpperCase() + k.slice(1)
      fill("trigger", { trigger: { kind: "schedule", label } }); filled.push("cadence")
    } else if (c.event.match.test(t)) {
      fill("trigger", { trigger: { kind: "event", label: c.event.label } })
    } else if (/on demand|manual|when i (ask|brief)|only when i/i.test(t)) {
      fill("trigger", { trigger: { kind: "manual", label: "On demand" } })
    }
  }

  // Autonomy
  if (open("autonomy") && !filled.includes("autonomy")) {
    const q = qs.find((x) => x.slot === "autonomy")!.options({ ...draft, autonomy: current ? draft.autonomy : { auto: [...sa.autonomy.auto], approval: [...sa.autonomy.approval] } })
    if (/hands.?off|on its own|automatically|without asking|auto.?merge|full(y)? auto|trust it/i.test(t)) { fill("autonomy", q.at(-1)!.apply(draft)); notes.push("Hands-off it is.") }
    else if (/ask (me )?(first|before)|approv|check with me|nothing without/i.test(t)) { fill("autonomy", q[1].apply(draft)); notes.push(q[1].note) }
  }

  // Escalation: channels, paging, tickets
  if (open("escalation")) {
    const esc: string[] = []
    const needs: string[] = []
    const channel = t.match(/#[\w-]+/)?.[0]
    if (channel) esc.push(`Slack ${channel}`)
    else if (/slack/i.test(t)) esc.push(`Slack ${c.channel}`)
    if (/\bpage|pagerduty|on.?call/i.test(t)) { esc.push("Page on-call (PagerDuty)"); needs.push("PagerDuty") }
    if (/jira|ticket/i.test(t)) esc.push("Jira ticket")
    if (/e-?mail|digest/i.test(t)) esc.push("Email digest")
    if (/owner|owning team|team'?s channel/i.test(t) && current?.slot === "escalation") esc.push("Owning team's channel")
    if (esc.length) fill("escalation", { escalation: [...new Set([...draft.escalation, ...esc])], needs: [...draft.needs, ...needs] })
  }

  // Name
  const named = t.match(/(?:call it|name it|rename it(?: to)?|named?)\s+["“]?([^"”.,]+)/i)?.[1]
  if (named) fill("name", { name: titleCase(named.trim()) })

  // Nothing structured matched the question we asked: take the words as the answer itself
  // (only when it answered nothing else: otherwise the open question is asked again, in context)
  // own = typed into that question's own "Other" row: it always answers that question (plus anything else it covers)
  if (current && !filled.includes(current.slot) && (filled.length === 0 || own)) {
    const said = sentence(t).replace(/\.$/, "")
    const literal: Record<Slot, Partial<Draft>> = {
      purpose: { purpose: sentence(t), focus: "Custom mission" },
      scope: { scope: [...draft.scope, said] },
      trigger: { trigger: { kind: "schedule", label: said } },
      cadence: { trigger: { kind: "schedule", label: said } },
      autonomy: { autonomyLabel: "Custom", limits: sentence(t) },
      limits: { limits: sentence(t) },
      escalation: { escalation: [...draft.escalation, said] },
      name: { name: titleCase(t.replace(/[."]/g, "")) },
      connect: {},
    }
    fill(current.slot, literal[current.slot])
    if (current.slot === "purpose") notes.push("I wrote that into its mission in your words, and kept Rival's team of agents behind it.")
    if (current.slot === "autonomy") notes.push("I added that as a rule it has to follow.")
  }

  return { patch: draft, filled: [...new Set(filled)], notes }
}

// Multi-select chips (scope, escalation): the picked set replaces the slot
export function applyMulti(slot: Slot, d: Draft, picked: string[]): Partial<Draft> {
  if (slot === "scope") return { scope: picked }
  const pd = picked.some((p) => p.includes("PagerDuty"))
  return { escalation: picked, needs: pd ? [...new Set([...d.needs, "PagerDuty"])] : d.needs.filter((n) => n !== "PagerDuty") }
}

const sentence = (s: string) => { const x = s.charAt(0).toUpperCase() + s.slice(1); return /[.!?]$/.test(x) ? x : `${x}.` }
const titleCase = (s: string) => s.replace(/\b\w/g, (m) => m.toUpperCase())

/* ---------- Labels, for the "Updated draft" step and the panel ---------- */

export const sectionLabels: Record<Slot, string> = {
  purpose: "Mission", scope: "Scope", trigger: "Runs", cadence: "Runs", autonomy: "Permissions", limits: "Permissions",
  escalation: "Escalation", connect: "Apps", name: "Name",
}

// Which panel sections changed between two drafts
export function changedSections(a: Draft, b: Draft): string[] {
  const out: string[] = []
  if (a.purpose !== b.purpose) out.push("Mission")
  if (a.scope.join() !== b.scope.join()) out.push("Scope")
  if (a.trigger?.label !== b.trigger?.label) out.push("Runs")
  if (JSON.stringify(a.pattern) !== JSON.stringify(b.pattern)) out.push("Team")
  if (JSON.stringify(a.autonomy) !== JSON.stringify(b.autonomy) || a.limits !== b.limits) out.push("Permissions")
  if (a.escalation.join() !== b.escalation.join()) out.push("Escalation")
  if (JSON.stringify(a.tools) !== JSON.stringify(b.tools)) out.push("Apps")
  if (a.name !== b.name) out.push("Name")
  return out
}

// What's different from the template, for the review
export function diffFromTemplate(sa: SuperAgent, d: Draft): string[] {
  const out: string[] = []
  if (d.purpose && d.focus !== configFor(sa).purposes[0].label) out.push(`Mission: ${d.focus}`)
  if (d.scope.length) out.push(`Scoped to ${list(d.scope.map(lc))}`)
  if (d.trigger && d.trigger.kind !== "manual") out.push(`Runs ${d.trigger.label.charAt(0).toLowerCase()}${d.trigger.label.slice(1)}`)
  const had = sa.pattern.flat(), has = d.pattern.flat()
  const name = (k: AgentKind) => agents[k].name.replace(/ agent$/, "").toLowerCase()
  const added = has.filter((k) => !had.includes(k)).map(name), dropped = had.filter((k) => !has.includes(k)).map(name)
  if (added.length || dropped.length) out.push(`Team: ${[added.length && `adds ${list(added)}`, dropped.length && `drops ${list(dropped)}`].filter(Boolean).join(", ")}`)
  // Kept the defaults: any difference just follows the team change above
  if (d.autonomyLabel && d.autonomyLabel !== "Rival's defaults") out.push(`Permissions: ${d.autonomyLabel ?? "custom"}${d.limits && d.limits !== "None" ? ` (${d.limits.toLowerCase().replace(/\.$/, "")})` : ""}`)
  if (d.escalation.length) out.push(`Escalates to ${list(d.escalation.map(lc))}`)
  return out
}

// Lowercase a label's first letter unless it's a name or acronym ("Payments services" → "payments services", "HR Bot" stays)
export const lc = (s: string) => /^[A-Z][a-z]/.test(s) && !/^(Jira|Slack|Cloudflare|Okta|Vanta)\b/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s
export function briefFor(sa: SuperAgent, d: Draft) {
  const c = configFor(sa)
  const brief = c.purposes.find((p) => p.label === d.focus)?.brief ?? c.brief // the purpose's own wording, if it changed the job
  return brief(list(d.scope.slice(0, 2).map(lc)))
}

/* ---------- Composer suggestions: free-text examples for the open question ---------- */

export function examples(sa: SuperAgent, slot: Slot | "review", d: Draft): string[] {
  const c = configFor(sa)
  switch (slot) {
    case "purpose": return [c.example, "Just triage and route to owners, don't change any code"]
    case "scope": return [`${c.scopes[1].label} and ${lc(c.scopes[2].label)}`, c.example]
    case "trigger": return ["Every Monday morning", c.event.label]
    case "cadence": return ["Every weekday at 8:30", "Twice a day"]
    case "autonomy": return ["Ask me before it changes anything", "Hands-off, I trust it"]
    case "limits": return ["Only in staging", c.limits[0]]
    case "escalation": return [`Post in ${c.channel} and open a Jira ticket`, "Page on-call if it's critical"]
    case "connect": return ["Connect it now", "Skip it for now"]
    case "name": return nameIdeas(sa, d).map((n) => `Call it ${n}`)
    case "review": return ["Looks good, create it", "Make it run nightly instead", "Also open a Jira ticket"]
  }
}

/* ---------- Create: the draft becomes a super agent ---------- */

// Scripts for helper agents a template didn't have (a purpose can swap one in), so the clone can still be run
const fallbackScripts: Partial<Record<AgentKind, SubagentScript>> = {
  reporting: {
    activity: "Writing up findings with evidence…",
    summary: "Report drafted with evidence and owners",
    tool: { name: "create_report", title: "Draft report", input: { format: "markdown", evidence: true }, output: { sections: 4, tickets: 2 } },
  },
  ownership: {
    activity: "Correlating tags, CODEOWNERS and deploys…",
    summary: "Owner found with high confidence",
    tool: { name: "trace_owner", title: "Trace resource owner", input: { resource: "affected assets" }, output: { teams: 1 } },
  },
  exploitability: {
    activity: "Checking which targets are reachable…",
    summary: "Reachable paths mapped",
    tool: { name: "trace_route", title: "Trace reachable paths", input: { from: "untrusted input" }, output: { reachable: 1 } },
  },
  "data-leak": {
    activity: "Scanning responses and data access…",
    summary: "Data access mapped against policy",
    tool: { name: "scan_data_access", title: "Scan data access", input: { range: "7d" }, output: { flagged: 2 } },
  },
}

export function buildAgent(sa: SuperAgent, d: Draft): Partial<SuperAgent> {
  const kinds = d.pattern.flat()
  const agents = { ...sa.script.agents }
  for (const k of kinds) if (!agents[k]) agents[k] = fallbackScripts[k] ?? fallbackScripts.reporting
  const handoffs = d.pattern.slice(1).map((_, i) => sa.script.handoffs[i] ?? "Passing what matters to the next agent.")
  const limits = d.limits && d.limits !== "None" ? [`Anything beyond: ${lc(d.limits.replace(/\.$/, ""))}`] : []
  const scope = d.scope.length ? ` Scope: ${list(d.scope.map(lc))}.` : ""
  return {
    name: d.name,
    tagline: d.purpose ?? sa.tagline,
    about: `${d.purpose ?? sa.about}${scope}`,
    pattern: d.pattern,
    autonomy: { auto: d.autonomy.auto, approval: [...d.autonomy.approval, ...limits] },
    tools: d.tools.filter((t) => sa.tools.some((x) => x.name === t.name) || d.needs.includes(t.name)),
    briefs: [briefFor(sa, d), ...sa.briefs],
    escalation: d.escalation,
    trigger: d.trigger ?? { kind: "manual", label: "On demand" },
    script: {
      ...sa.script, agents, handoffs,
      // The approval card names the agent that drafted the change; drop it if that agent left the team
      approval: sa.script.approval && kinds.includes(sa.script.approval.via) ? sa.script.approval : undefined,
    },
  }
}

// Questions are asked in rounds grouped by topic, one card each:
//   1. Identity:  name, mission
//   2. Technical: scope, when it runs (picking "On a schedule" opens the schedule picker right there)
//   3. Guardrails: permissions, escalation
// Follow-ups that only exist because of an answer (a guardrail after hands-off, connecting PagerDuty) come after.
export const rounds: { title: string; slots: Slot[]; intro: string }[] = [
  { title: "Basics", slots: ["name", "purpose"], intro: "First, the basics: a name and a mission." },
  { title: "Technical", slots: ["scope", "trigger"], intro: "Now the technical bits: what it covers and when it runs." },
  { title: "Guardrails", slots: ["autonomy", "escalation"], intro: "Last up: what it can do on its own, and how it reaches you." },
  { title: "Follow-ups", slots: ["limits", "connect"], intro: "Two quick follow-ups from your answers." },
]
export function nextRound(qs: Question[], d: Draft) {
  const open = (s: Slot) => { const q = qs.find((x) => x.slot === s); return q && !d.answered.includes(s) && (!q.when || q.when(d)) ? q : undefined }
  for (const [i, r] of rounds.entries()) {
    const qsIn = r.slots.map(open).filter((q): q is Question => !!q)
    if (qsIn.length) return { index: i, intro: r.intro, questions: qsIn }
  }
  return undefined
}

/* ---------- Schedules (the picker inside "On a schedule") ---------- */

export type Schedule = { freq: "weekdays" | "daily" | "weekly" | "monthly"; days: string[]; time: string }
export const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
export const defaultSchedule: Schedule = { freq: "weekdays", days: ["Mon"], time: "09:00" }

export function scheduleLabel(s: Schedule) {
  const at = `at ${s.time}`
  if (s.freq === "weekdays") return `Every weekday ${at}`
  if (s.freq === "daily") return `Every day ${at}`
  if (s.freq === "monthly") return `On the 1st of every month ${at}`
  const days = weekDays.filter((d) => s.days.includes(d))
  return `Every ${days.length ? list(days) : "Monday"} ${at}`
}
