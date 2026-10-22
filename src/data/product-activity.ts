import { minutesAgo } from "@/data/conversations"

// The runs on each product agent's Activity tab (pages/product-agents.tsx), by agent id, newest first. Each ends in
// one of that agent's own outcomes (data/product-agents.ts) by label; agents that list none just say what they found.
// Sub-agents say which agent ran them (via). Made up for the demo, around the demo's own CVEs, repos and assets.
export type RunTarget = "cve" | "sast" | "secret" | "branch" | "repo" | "asset" | "identity"
export type ProductRun = {
  ago: number // minutes
  target: [RunTarget, string]
  outcome?: string // an outcome label of the agent; none while it runs, or for agents without outcomes
  running?: boolean
  summary: string
  via?: string // the agent that ran this sub-agent
  secs?: number
}

const H = 60, D = 24 * H

export const productRuns: Record<string, ProductRun[]> = {
  "red-team-simulation": [
    { ago: 3, target: ["cve", "CVE-2025-29927"], running: true, summary: "Carving the middleware out of admin-portal into a sandboxed demo…" },
    { ago: 3 * H, target: ["sast", "Path traversal · files.ts:41"], outcome: "Exploit Demonstrated", summary: "The demo read /etc/passwd through the download route with an encoded ../ path.", secs: 190 },
    { ago: D + 5 * H, target: ["cve", "CVE-2024-4068"], outcome: "Not Reproduced", summary: "braces is only called by the build; no request reaches the vulnerable path.", secs: 150 },
  ],
  "app-inventory": [
    { ago: 2 * H, target: ["branch", "main · 6 repositories"], summary: "Found 2 new deployable apps and 1 shared library.", secs: 95 },
    { ago: 3 * D, target: ["branch", "main · 6 repositories"], summary: "The same 14 apps and 5 libraries as last week.", secs: 88 },
  ],
  "application-inventory": [
    { ago: 40, target: ["repo", "payments-api"], outcome: "Updated", summary: "Added the new refunds worker and its queue to the inventory.", secs: 64 },
    { ago: D + 2 * H, target: ["repo", "storefront"], outcome: "Unchanged", summary: "No new apps or entry points since the last run.", secs: 41 },
    { ago: 2 * D, target: ["repo", "admin-portal"], outcome: "Updated", summary: "Marked the legacy /v1 API as removed.", secs: 52 },
  ],
  "attack-surface-review": [
    { ago: 25, target: ["cve", "CVE-2026-94545"], outcome: "Exposed", summary: "storefront-prod-1 serves the upload route to the internet with no WAF in front.", secs: 72 },
    { ago: 5 * H, target: ["sast", "SQL injection · orders.ts:88"], outcome: "Mitigated", summary: "The /orders path is behind the managed SQLi rule set.", secs: 58 },
    { ago: D + 6 * H, target: ["cve", "CVE-2024-21538"], outcome: "Not deployed", summary: "The affected script is in the repository but never shipped.", secs: 33 },
  ],
  "cve-triage": [
    { ago: 1, target: ["cve", "CVE-2026-61002"], running: true, summary: "Checking 14 internet-facing assets against the affected versions…" },
    { ago: 6 * H, target: ["cve", "CVE-2024-4068"], outcome: "Not exploitable", summary: "braces is only loaded by the build tooling; nothing reaches it at runtime.", secs: 42 },
    { ago: 7 * H, target: ["cve", "CVE-2026-94545"], outcome: "Action required", summary: "Exploitable on storefront-prod-1 and on CISA KEV; owned by the Storefront team.", secs: 61 },
    { ago: D + 9 * H, target: ["cve", "CVE-2025-29927"], outcome: "Action required", summary: "The middleware bypass works on admin-portal; a fix needs Next.js 15.", secs: 77 },
    { ago: 3 * D, target: ["cve", "CVE-2023-44487"], outcome: "Needs review", summary: "Couldn't reach the staging replica to confirm; the rest of the evidence is mixed.", secs: 300 },
  ],
  "sast-fix-pipeline": [
    { ago: 50, target: ["sast", "Path traversal · files.ts:41"], outcome: "Fix planned", summary: "Normalise the path and check it stays in the uploads folder; PR drafted.", secs: 240 },
    { ago: D + 3 * H, target: ["sast", "XSS · profile.tsx:120"], outcome: "Not exploitable", summary: "React escapes the value; the flagged sink never gets raw HTML.", secs: 96 },
    { ago: 2 * D, target: ["sast", "SQL injection · orders.ts:88"], outcome: "Needs review", summary: "Reachable, but an upstream validator may already reject the payload.", secs: 130 },
  ],
  "secret-leak-response": [
    { ago: 35, target: ["secret", "AWS key · infra/.env"], outcome: "Rotate now", summary: "A live key, committed 3 days ago; the Platform team owns it.", secs: 28 },
    { ago: D + 7 * H, target: ["secret", "Stripe key · README.md"], outcome: "False positive", summary: "A documented test key; nothing to rotate.", secs: 14 },
    { ago: 3 * D, target: ["secret", "Slack token · scripts/notify.sh"], outcome: "Needs review", summary: "The token is revoked, but it was valid for 2 days after the commit.", secs: 31 },
  ],

  "code-cve-exploitability": [
    { ago: 6 * H, target: ["cve", "CVE-2024-4068"], outcome: "Not Exploitable", summary: "braces is only loaded by the build tooling; nothing reaches it at runtime.", via: "CVE Triage", secs: 42 },
    { ago: D + 9 * H, target: ["cve", "CVE-2025-29927"], outcome: "Exploitable", summary: "The header isn't stripped at the edge, so the middleware check can be skipped.", via: "CVE Triage", secs: 37 },
    { ago: 2 * D, target: ["cve", "CVE-2024-21538"], outcome: "Unclear", summary: "cross-spawn gets user input in one script, but only behind an admin flag.", via: "Attack Surface Review", secs: 58 },
  ],
  "cloud-exploitability": [
    { ago: 1, target: ["cve", "CVE-2026-61002"], running: true, summary: "Checking 14 internet-facing assets against the affected versions…", via: "CVE Triage" },
    { ago: 7 * H, target: ["cve", "CVE-2026-94545"], outcome: "Exploitable", summary: "storefront-prod-1 runs imgproc 4.1.7 and is reachable from the internet.", via: "CVE Triage", secs: 18 },
    { ago: 3 * D, target: ["cve", "CVE-2023-44487"], outcome: "Failed", summary: "Couldn't reach the staging replica; the sandbox timed out after 5 minutes.", via: "CVE Triage", secs: 300 },
  ],
  "code-sast-exploitability": [
    { ago: 55, target: ["sast", "Path traversal · files.ts:41"], outcome: "Exploitable", summary: "The download route joins the file name from the query string without normalising it.", via: "SAST Fix Pipeline", secs: 49 },
    { ago: D + 3 * H, target: ["sast", "XSS · profile.tsx:120"], outcome: "Not Exploitable", summary: "React escapes the value before it reaches the page.", via: "SAST Fix Pipeline", secs: 31 },
    { ago: 2 * D, target: ["sast", "SQL injection · orders.ts:88"], outcome: "Unclear", summary: "The query is reachable, but an upstream validator may already reject the payload.", via: "SAST Fix Pipeline", secs: 64 },
  ],
  "finding-ownership": [
    { ago: 20, target: ["cve", "CVE-2026-94545"], summary: "Storefront team (on call: Maya R.), from CODEOWNERS and the deploy history.", via: "CVE Triage", secs: 6 },
    { ago: 35, target: ["secret", "AWS key · infra/.env"], summary: "Platform team; the last commit to the file was theirs.", via: "Secret Leak Response", secs: 4 },
    { ago: D + 5 * H, target: ["asset", "legacy-cron-02"], summary: "No CODEOWNERS and no deploys in a year; left for a person to decide.", via: "CVE Triage", secs: 11 },
  ],
  "waf-analysis": [
    { ago: 5 * H, target: ["sast", "SQL injection · orders.ts:88"], outcome: "Mitigated", summary: "The managed SQLi rule set blocks every payload on the /orders path.", via: "Attack Surface Review", secs: 22 },
    { ago: D + H, target: ["cve", "CVE-2025-29927"], outcome: "Suggestion", summary: "No rule strips x-middleware-subrequest; a one-line custom rule would block it.", via: "Attack Surface Review", secs: 19 },
    { ago: 3 * D, target: ["cve", "CVE-2024-4068"], outcome: "Irrelevant", summary: "Not reachable over HTTP, so the WAF has nothing to do here.", via: "Attack Surface Review", secs: 8 },
  ],
  remediation: [
    { ago: 50, target: ["sast", "Path traversal · files.ts:41"], outcome: "Easy", summary: "A 6-line change in one file; the tests pass in a sandbox copy.", via: "SAST Fix Pipeline", secs: 210 },
    { ago: D + 6 * H, target: ["sast", "SQL injection · orders.ts:88"], outcome: "Medium", summary: "Switch to a parameterised query; 2 callers need a small change.", via: "SAST Fix Pipeline", secs: 340 },
    { ago: 2 * D, target: ["cve", "CVE-2025-29927"], outcome: "Hard", summary: "The fix needs Next.js 15; 31 files use APIs that changed.", via: "CVE Triage", secs: 420 },
  ],
  "secret-validation": [
    { ago: 35, target: ["secret", "AWS key · infra/.env"], outcome: "Exposed", summary: "The key still authenticates and can read 3 S3 buckets.", via: "Secret Leak Response", secs: 8 },
    { ago: D + 7 * H, target: ["secret", "Stripe key · README.md"], outcome: "No Risk", summary: "A documented test-mode key.", via: "Secret Leak Response", secs: 5 },
    { ago: 3 * D, target: ["secret", "Slack token · scripts/notify.sh"], outcome: "Unknown", summary: "Revoked now; couldn't tell how long it stayed valid.", via: "Secret Leak Response", secs: 9 },
  ],
  "deployment-mapping": [
    { ago: 5 * H, target: ["asset", "AWS · prod account"], summary: "Tied 3 EC2 apps to their repositories through their deploy scripts.", via: "Application Inventory", secs: 130 },
    { ago: 2 * D, target: ["asset", "AWS · prod account"], summary: "Every workload is already mapped.", via: "Application Inventory", secs: 120 },
  ],

  "privilege-access-reviewer": [
    { ago: 4 * H, target: ["identity", "Okta · 1,240 users"], summary: "14 admins haven't signed in for 90 days; 3 service accounts have org-wide write.", secs: 410 },
    { ago: 7 * D, target: ["identity", "AWS · prod account"], summary: "2 roles can assume any other role; least-privilege policies drafted.", secs: 380 },
  ],
  "vulnerability-auto-fixer": [
    { ago: 15, target: ["repo", "web-monorepo"], running: true, summary: "Fixing 5 CVEs in packages/checkout; running the test suite…" },
    { ago: 9 * H, target: ["repo", "web-monorepo"], outcome: "Pr opened", summary: "PR #918 bumps 4 vulnerable packages and fixes 1 SAST finding; waiting on review.", secs: 620 },
    { ago: D + 4 * H, target: ["repo", "web-monorepo"], outcome: "Fixes merged", summary: "PR #901 merged: 6 CVEs fixed across 3 packages.", secs: 540 },
    { ago: 3 * D, target: ["repo", "web-monorepo"], outcome: "Partial success", summary: "3 of 5 fixes passed the tests; the other 2 need a major-version upgrade.", secs: 700 },
    { ago: 5 * D, target: ["repo", "web-monorepo"], outcome: "Failed", summary: "The install step failed on a private registry timeout; nothing was changed.", secs: 95 },
  ],
}

export const runStarted = (r: ProductRun) => minutesAgo(r.ago)
