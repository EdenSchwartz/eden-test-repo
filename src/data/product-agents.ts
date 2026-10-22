// The real product's agents (app.us1-dev.rival-internal.io/investigations/agent-gallery and /agents, read 2026-10-22).
// Names, descriptions, tags, colors, pixel marks, capabilities, outcomes and prompts are the product's own;
// prompts are cut to their opening lines. Used by pages/product-agents.tsx.

export type RunsOn = "CVE" | "SAST" | "Branch" | "Secret" | "Deployable"
export type Capability = "Internet search" | "Knowledge graph" | "Memory"
// Product color pairs (--<tone>-fill / --<tone>-text), defined in looks/product.css
export type Tone = "severity-high" | "palette-green" | "remplan" | "tag-purple" | "type-wiz" | "palette-blue" | "info-disclosure"
// Outcome chip colors and icons, as the product draws them
export type OutcomeTone = "unknown" | "vulnerable" | "safe" | "failed" | "severity-high" | "severity-low" | "severity-medium" | "palette-blue" | "effort-easy" | "effort-medium" | "effort-hard"
export type OutcomeIcon = "circle-dot" | "swords" | "shield-check" | "shield-x" | "alert-square" | "alert-square-off" | "alert-triangle" | "x" | "alert-circle" | "question" | "circle-minus" | "bulb" | "clock"
export type Outcome = { label: string; tone: OutcomeTone; icon: OutcomeIcon }

export type ProductAgent = {
  id: string
  name: string
  kind: "Agent" | "Sub-agent"
  runsOn: RunsOn[]
  description: string
  tone: Tone
  pixels: string // the mark's filled cells (an SVG path); agents are 5×5, sub-agents 3×3
  capabilities: Capability[]
  outcomes: Outcome[]
  subAgents?: string[] // ids, in run order
  prompt?: string
  createdBy?: string // your own agents; Rival's say "Rival"
  enabled?: boolean // your own agents
  triggers?: string[] // your own agents
}

const neutral = (...labels: string[]): Outcome[] => labels.map((label) => ({ label, tone: "unknown", icon: "circle-dot" }))
const exploitability: Outcome[] = [
  { label: "Exploitable", tone: "vulnerable", icon: "alert-square" },
  { label: "Not Exploitable", tone: "safe", icon: "alert-square-off" },
  { label: "Unclear", tone: "unknown", icon: "alert-triangle" },
  { label: "Failed", tone: "failed", icon: "x" },
]

export const rivalAgents: ProductAgent[] = [
  {
    id: "red-team-simulation", name: "Red Team Simulation", kind: "Agent", runsOn: ["CVE", "SAST"], tone: "severity-high",
    description: "Builds and runs an isolated proof-of-concept that reproduces a finding with the application's own code, and writes up the exploitation process.",
    pixels: "M1 0h1v1h-1zM3 0h1v1h-1zM2 1h1v1h-1zM1 2h1v1h-1zM3 2h1v1h-1zM2 2h1v1h-1zM0 3h1v1h-1zM4 3h1v1h-1zM1 3h1v1h-1zM3 3h1v1h-1z",
    capabilities: ["Knowledge graph"],
    outcomes: [{ label: "Exploit Demonstrated", tone: "severity-high", icon: "swords" }, { label: "Not Reproduced", tone: "severity-low", icon: "shield-check" }],
    prompt: `You are an offensive security engineer building a safe, faithful proof-of-concept. Your task is to take a vulnerability finding and demonstrate it using the application's OWN code — carved out into a separate, self-contained demo that runs in your sandbox, never against the real product.

<context>
The repository and application in scope are owned by the operator running this analysis — their own defender, responsible for securing their own code. This is an authorized, internal defensive-security exercise.
</context>

You work with:
1. The finding's knowledge graph node (the finding data from the source scanner), which the request names by its label and external id.
2. Optionally, an exploitability analysis report: the latest \`Investigation:Exploitability\` node that investigates the finding, when there is one.
3. The affected repository, cloned into your sandbox at the path stated in <affected_repository_info>.

Your goal is to reproduce the vulnerability in context: same language, same code, same idioms as the real application, isolated into a runnable demo that proves the weakness, plus a plan the defender can follow to reproduce it.`,
  },
  {
    id: "app-inventory", name: "App Inventory", kind: "Agent", runsOn: ["Branch"], tone: "palette-green",
    description: "Discovers every deployable application and shared library in a repository, with its type, manifest, and dependency files.",
    pixels: "M1 1h1v1h-1zM3 1h1v1h-1zM2 1h1v1h-1zM1 2h1v1h-1zM3 2h1v1h-1zM0 3h1v1h-1zM4 3h1v1h-1zM1 4h1v1h-1zM3 4h1v1h-1zM2 4h1v1h-1z",
    capabilities: ["Knowledge graph"], outcomes: [],
    prompt: `<role>
You are a DevOps expert that discovers applications and libraries within a code repository.
Your goal is to find every unit of code that is either deployed to run on compute infrastructure, or packaged as a shared library.
</role>

<inputs>
- The repository to inventory, cloned in your sandbox at its default branch, as described in <affected_repository_info>.
- Its \`CodeRepository\` node in the Security Knowledge Graph, which the request names by its label and external id.
</inputs>

<classification>
Classify each application as one of:
- DEPLOYABLE_IMAGE: application deployed via a container image.
- DEPLOYABLE: application deployed directly to compute without a container image.
- LIBRARY: a shared library or package consumed by other applications.
</classification>`,
  },
  {
    id: "application-inventory", name: "Application Inventory", kind: "Agent", runsOn: ["Branch"], tone: "palette-green",
    description: "Keeps track of where every application in a repository runs and who owns it.",
    pixels: "M0 0h1v1h-1zM4 0h1v1h-1zM1 0h1v1h-1zM3 0h1v1h-1zM2 0h1v1h-1zM0 1h1v1h-1zM4 1h1v1h-1zM2 1h1v1h-1zM2 2h1v1h-1zM1 3h1v1h-1zM3 3h1v1h-1zM2 3h1v1h-1zM2 4h1v1h-1z",
    capabilities: ["Knowledge graph", "Memory"], outcomes: neutral("Updated", "Unchanged"),
    subAgents: ["deployment-mapping", "finding-ownership"],
    prompt: `You maintain the application inventory of a repository.

1. Run deployment-mapping to link each of its applications to its cloud workloads.
2. Run finding-ownership to name an owner for each application.

Answer UPDATED when anything changed since the last run, and UNCHANGED otherwise.`,
  },
  {
    id: "attack-surface-review", name: "Attack Surface Review", kind: "Agent", runsOn: ["CVE", "SAST"], tone: "severity-high",
    description: "Maps where a vulnerable application is deployed and tests whether the WAF blocks the attack on each path to it.",
    pixels: "M2 0h1v1h-1zM0 1h1v1h-1zM4 1h1v1h-1zM2 1h1v1h-1zM1 2h1v1h-1zM3 2h1v1h-1zM1 3h1v1h-1zM3 3h1v1h-1zM2 3h1v1h-1zM0 4h1v1h-1zM4 4h1v1h-1zM1 4h1v1h-1zM3 4h1v1h-1z",
    capabilities: ["Internet search", "Knowledge graph", "Memory"], outcomes: neutral("Exposed", "Mitigated", "Not deployed"),
    subAgents: ["deployment-mapping", "waf-analysis"],
    prompt: `You review how exposed a finding is.

1. Run deployment-mapping to find the workloads running the affected code.
2. Run waf-analysis on each ingress path to those workloads.

Answer EXPOSED when any path is left unblocked, MITIGATED when WAF rules block every path, and NOT_DEPLOYED when nothing runs the code.`,
  },
  {
    id: "cve-triage", name: "CVE Triage", kind: "Agent", runsOn: ["CVE"], tone: "severity-high",
    description: "Decides whether a new CVE needs action by checking exploitability in code and in the cloud, then routes the ones that matter to the team that owns them.",
    pixels: "M0 0h1v1h-1zM4 0h1v1h-1zM1 0h1v1h-1zM3 0h1v1h-1zM2 1h1v1h-1zM2 3h1v1h-1zM0 4h1v1h-1zM4 4h1v1h-1zM1 4h1v1h-1zM3 4h1v1h-1zM2 4h1v1h-1z",
    capabilities: ["Internet search", "Knowledge graph", "Memory"], outcomes: neutral("Action required", "Not exploitable", "Needs review"),
    subAgents: ["code-cve-exploitability", "cloud-exploitability", "finding-ownership"],
    prompt: `You triage a CVE finding end to end.

1. Run code-cve-exploitability to learn whether the vulnerable package is reachable from user input.
2. Run cloud-exploitability on every workload that ships the package.
3. When either says exploitable, run finding-ownership and name the owner.

Answer ACTION_REQUIRED when anything is exploitable, NOT_EXPLOITABLE when nothing is, and NEEDS_REVIEW when the evidence conflicts.`,
  },
  {
    id: "sast-fix-pipeline", name: "SAST Fix Pipeline", kind: "Agent", runsOn: ["SAST"], tone: "remplan",
    description: "Filters static-analysis findings down to the exploitable ones and hands each a ready-to-review remediation plan.",
    pixels: "M0 0h1v1h-1zM4 0h1v1h-1zM1 0h1v1h-1zM3 0h1v1h-1zM0 1h1v1h-1zM4 1h1v1h-1zM1 1h1v1h-1zM3 1h1v1h-1zM1 2h1v1h-1zM3 2h1v1h-1zM2 3h1v1h-1zM0 4h1v1h-1zM4 4h1v1h-1z",
    capabilities: ["Knowledge graph"], outcomes: neutral("Fix planned", "Not exploitable", "Needs review"),
    subAgents: ["code-sast-exploitability", "remediation"],
    prompt: `You turn SAST findings into fixes.

1. Run code-sast-exploitability to trace the data flow of the finding.
2. When it is exploitable, run remediation to produce a focused fix.

Answer FIX_PLANNED with the plan attached, NOT_EXPLOITABLE when the flow is unreachable, and NEEDS_REVIEW otherwise.`,
  },
  {
    id: "secret-leak-response", name: "Secret Leak Response", kind: "Agent", runsOn: ["Secret"], tone: "tag-purple",
    description: "Confirms whether a leaked secret is a real credential, finds who owns it, and drafts the rotation and cleanup steps.",
    pixels: "M0 0h1v1h-1zM4 0h1v1h-1zM1 0h1v1h-1zM3 0h1v1h-1zM2 0h1v1h-1zM1 1h1v1h-1zM3 1h1v1h-1zM0 2h1v1h-1zM4 2h1v1h-1zM1 2h1v1h-1zM3 2h1v1h-1zM0 3h1v1h-1zM4 3h1v1h-1zM2 3h1v1h-1zM1 4h1v1h-1zM3 4h1v1h-1zM2 4h1v1h-1z",
    capabilities: ["Knowledge graph", "Memory"], outcomes: neutral("Rotate now", "False positive", "Needs review"),
    subAgents: ["secret-validation", "finding-ownership", "remediation"],
    prompt: `You respond to a leaked secret.

1. Run secret-validation to decide whether the value is a live credential.
2. When it is, run finding-ownership to find who committed and owns it.
3. Run remediation to plan the rotation and the history cleanup.

Answer ROTATE_NOW for a live credential, FALSE_POSITIVE when it is not one, and NEEDS_REVIEW when validation is inconclusive.`,
  },
]

export const rivalSubAgents: ProductAgent[] = [
  {
    id: "code-cve-exploitability", name: "Code CVE Exploitability", kind: "Sub-agent", runsOn: ["CVE"], tone: "severity-high",
    description: "Investigates whether a CVE found by a code dependency scan is actually exploitable by tracing how the vulnerable package is loaded, reached, and fed user input.",
    pixels: "M0 1h1v1h-1zM2 1h1v1h-1zM0 2h1v1h-1zM1 2h1v1h-1z", capabilities: ["Knowledge graph", "Memory"], outcomes: exploitability,
  },
  {
    id: "cloud-exploitability", name: "Cloud Exploitability", kind: "Sub-agent", runsOn: ["CVE"], tone: "severity-high",
    description: "Investigates whether a cloud scanner vulnerability finding (Wiz, Upwind, AWS Inspector) is actually exploitable on the affected cloud workload.",
    pixels: "M1 0h1v1h-1zM2 0h1v1h-1zM0 1h1v1h-1zM1 1h1v1h-1zM2 1h1v1h-1zM0 2h1v1h-1z", capabilities: ["Internet search", "Knowledge graph"], outcomes: exploitability,
  },
  {
    id: "code-sast-exploitability", name: "Code SAST Exploitability", kind: "Sub-agent", runsOn: ["SAST"], tone: "severity-high",
    description: "Investigates whether a static-analysis (SAST) code finding is actually exploitable by tracing its data flow through the repository.",
    pixels: "M0 0h1v1h-1zM2 0h1v1h-1zM2 1h1v1h-1zM0 2h1v1h-1z", capabilities: ["Knowledge graph", "Memory"], outcomes: exploitability,
  },
  {
    id: "finding-ownership", name: "Finding Ownership", kind: "Sub-agent", runsOn: ["CVE", "SAST", "Secret"], tone: "type-wiz",
    description: "Resolves the person or team that should own the fix for a finding, from git history, CODEOWNERS, and repository files.",
    pixels: "M1 1h1v1h-1zM0 2h1v1h-1zM1 2h1v1h-1zM2 2h1v1h-1z", capabilities: ["Knowledge graph"], outcomes: [],
  },
  {
    id: "waf-analysis", name: "WAF Analysis", kind: "Sub-agent", runsOn: ["CVE", "SAST"], tone: "palette-blue",
    description: "Determines whether WAF rules protecting the affected asset's ingress path block a finding's attack vector, and proposes a minimal rule when none do.",
    pixels: "M1 0h1v1h-1zM2 0h1v1h-1zM2 1h1v1h-1zM2 2h1v1h-1z", capabilities: ["Internet search", "Knowledge graph", "Memory"],
    outcomes: [{ label: "Irrelevant", tone: "severity-low", icon: "circle-minus" }, { label: "Mitigated", tone: "palette-blue", icon: "shield-check" }, { label: "Suggestion", tone: "severity-medium", icon: "bulb" }],
  },
  {
    id: "remediation", name: "Remediation", kind: "Sub-agent", runsOn: ["CVE", "SAST"], tone: "remplan",
    description: "Fixes a vulnerability finding in a sandbox copy of the repository and delivers a focused remediation plan with the resulting git diff.",
    pixels: "M0 0h1v1h-1zM2 0h1v1h-1zM1 1h1v1h-1zM2 2h1v1h-1z", capabilities: ["Knowledge graph"],
    outcomes: [{ label: "Easy", tone: "effort-easy", icon: "clock" }, { label: "Medium", tone: "effort-medium", icon: "clock" }, { label: "Hard", tone: "effort-hard", icon: "clock" }],
  },
  {
    id: "secret-validation", name: "Secret Validation", kind: "Sub-agent", runsOn: ["Secret"], tone: "tag-purple",
    description: "Decides whether a secret-scanner finding is a real exposed credential or a false positive by classifying the file and checking whether the surrounding code is used.",
    pixels: "M0 0h1v1h-1zM1 0h1v1h-1zM0 1h1v1h-1zM2 1h1v1h-1z", capabilities: ["Knowledge graph"],
    outcomes: [{ label: "Exposed", tone: "vulnerable", icon: "shield-x" }, { label: "No Risk", tone: "safe", icon: "shield-check" }, { label: "Unknown", tone: "unknown", icon: "question" }, { label: "Failed", tone: "failed", icon: "alert-circle" }],
  },
  {
    id: "deployment-mapping", name: "Deployment Mapping", kind: "Sub-agent", runsOn: ["Deployable"], tone: "info-disclosure",
    description: "Maps a repository's non-containerized applications to the durable cloud workloads they are deployed to, confirmed against the knowledge graph.",
    pixels: "M0 0h1v1h-1zM1 0h1v1h-1zM0 2h1v1h-1zM1 2h1v1h-1z", capabilities: ["Knowledge graph"], outcomes: [],
  },
]

// The organization's own agents (the product's My Agents page)
export const myAgents: ProductAgent[] = [
  {
    id: "privilege-access-reviewer", name: "Privilege Access Reviewer", kind: "Agent", runsOn: [], tone: "type-wiz",
    description: "Review human and non-human identities across connected AWS, Azure, GCP, and Okta environments for excessive or unsafe privileges and recommend evidence-based least-privilege and privileged access management improvements without making changes.",
    pixels: "M1 0h1v1h-1zM3 0h1v1h-1zM1 1h1v1h-1zM3 1h1v1h-1zM2 1h1v1h-1zM0 2h1v1h-1zM4 2h1v1h-1zM0 3h1v1h-1zM4 3h1v1h-1zM1 3h1v1h-1zM3 3h1v1h-1zM0 4h1v1h-1zM4 4h1v1h-1zM1 4h1v1h-1zM3 4h1v1h-1z",
    capabilities: ["Knowledge graph", "Memory"], outcomes: [], enabled: true, triggers: [], // its panel wasn't read: no creator, prompt or outcomes yet
  },
  {
    id: "vulnerability-auto-fixer", name: "vulnerability-auto-fixer", kind: "Agent", runsOn: [], tone: "type-wiz",
    description: "Automatically selects and fixes CVE, SAST, and SECRET vulnerabilities in a JavaScript monorepo repository, opens a PR with the fixes, and monitors until merged. Checks for existing PRs to avoid duplicates. Prioritizes CVE findings and ensures lockfiles are properly updated for PR mergeability.",
    pixels: "M0 0h1v1h-1zM4 0h1v1h-1zM0 1h1v1h-1zM4 1h1v1h-1zM1 1h1v1h-1zM3 1h1v1h-1zM1 2h1v1h-1zM3 2h1v1h-1zM2 2h1v1h-1zM1 3h1v1h-1zM3 3h1v1h-1z",
    capabilities: ["Knowledge graph", "Memory"], outcomes: neutral("Fixes merged", "Pr opened", "Partial success", "Failed"),
    createdBy: "Ben Gilat", enabled: true, triggers: [],
    prompt: `You are an automated vulnerability remediation agent. Your role is to identify, fix, and merge vulnerability fixes for a given JavaScript monorepo repository.

## Your Task

1. **Find Vulnerabilities**: Query the knowledge graph to find vulnerabilities in the repository provided in the run input. Prioritize CVE findings first, then SAST, then SECRET findings.

2. **Check for Existing PRs**: Before proceeding, check if there are already open PRs from previous runs of this agent:
   - Search for open PRs in the repository with title pattern "Security: Fix * vulnerabilities" or similar
   - Check PR descriptions for references to the same finding IDs
   - If a PR already exists covering the same vulnerabilities, DO NOT create a duplicate

3. **Select Targets**: Choose approximately 5 vulnerabilities to fix. You may select more if the fixes are small/simple.`,
  },
]

export const allProductAgents = [...rivalAgents, ...rivalSubAgents, ...myAgents]
export const findProductAgent = (id: string) => allProductAgents.find((a) => a.id === id)
