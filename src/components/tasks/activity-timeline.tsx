import { Box, Bug, FileCode2, GitBranch, KeyRound, Server, type LucideIcon } from "lucide-react"
import type { AgentKind } from "@/components/chat/agents"
import { minutesAgo } from "@/data/conversations"
import type { Outcome } from "@/data/outcomes"
import { Hint } from "@/components/ui/hint"
import { PanelOutcomeChip, outcomeColor } from "@/components/tasks/panel-ui"
import { cn } from "@/lib/utils"

/*
 * A sub agent's Activity tab as a timeline (after the product's runs table: agent, target, outcome, started at):
 * its runs, newest first, grouped by day (Today · Yesterday · the date). Each run hangs off one faint rail
 * (#E5E3E3, a touch firmer than How it works) by a small node in its outcome's colour (blue and breathing while it runs);
 * beside it, the target it ran on (its icon and name), the outcome chip, the time on the right (how long ago in a
 * tooltip), a line on what it found, and which agent ran it and how long it took.
 */
type Target = "cve" | "sast" | "secret" | "asset" | "repo" | "branch"
const targetIcon: Record<Target, LucideIcon> = { cve: Bug, sast: FileCode2, secret: KeyRound, asset: Server, repo: Box, branch: GitBranch }
type Run = { ago: number; target: [Target, string]; outcome?: Outcome; running?: boolean; summary: string; via: string; secs?: number }

const o = (label: string, tone: Outcome["tone"]): Outcome => ({ label, tone })
const H = 60, D = 24 * H

const runs: Partial<Record<AgentKind, Run[]>> = {
  exploitability: [
    { ago: 1, target: ["cve", "CVE-2026-61002"], running: true, summary: "Checking 14 internet-facing assets against the affected versions…", via: "Cloud Exploitability" },
    { ago: 6 * H, target: ["cve", "CVE-2024-4068"], outcome: o("Not exploitable", "clear"), summary: "braces is only loaded by the build tooling; nothing reaches it at runtime.", via: "Code CVE Exploitability", secs: 42 },
    { ago: 7 * H, target: ["cve", "CVE-2026-94545"], outcome: o("Exploitable", "risk"), summary: "storefront-prod-1 runs imgproc 4.1.7 and the upload route passes user input straight to it.", via: "Triage Hunter", secs: 18 },
    { ago: D + 3 * H, target: ["sast", "SQL injection · orders.ts:88"], outcome: o("Unclear", "unclear"), summary: "The query is reachable, but an upstream validator may already reject the payload.", via: "Code SAST Exploitability", secs: 64 },
    { ago: D + 9 * H, target: ["cve", "CVE-2025-29927"], outcome: o("Exploitable", "risk"), summary: "The Next.js middleware bypass works on admin-portal; the header isn't stripped at the edge.", via: "Code CVE Exploitability", secs: 37 },
    { ago: 3 * D, target: ["cve", "CVE-2023-44487"], outcome: o("Failed", "failed"), summary: "Couldn't reach the staging replica; the sandbox timed out after 5 minutes.", via: "Cloud Exploitability", secs: 300 },
  ],
  correlation: [
    { ago: 12, target: ["asset", "payments-api"], outcome: o("Merged", "good"), summary: "11 findings from Snyk, Wiz and Semgrep folded into 3 issues.", via: "Triage Hunter", secs: 9 },
    { ago: 5 * H, target: ["asset", "storefront-prod-1"], outcome: o("Merged", "good"), summary: "The same imgproc CVE from 4 scanners is now one issue.", via: "Triage Hunter", secs: 7 },
    { ago: D + 2 * H, target: ["repo", "billing-service"], outcome: o("No duplicates", "clear"), summary: "Every finding was already unique.", via: "Triage Hunter", secs: 5 },
    { ago: 2 * D, target: ["asset", "admin-portal"], outcome: o("Merged", "good"), summary: "6 findings folded into 2 issues.", via: "Triage Hunter", secs: 8 },
  ],
  ownership: [
    { ago: 20, target: ["cve", "CVE-2026-94545"], outcome: o("Owner found", "good"), summary: "Storefront team (on call: Maya R.), from CODEOWNERS and the deploy history.", via: "Finding Ownership", secs: 6 },
    { ago: 4 * H, target: ["secret", "AWS key · infra/.env"], outcome: o("Owner found", "good"), summary: "Platform team; the last commit to the file was theirs.", via: "Secret Validation", secs: 4 },
    { ago: D + 5 * H, target: ["asset", "legacy-cron-02"], outcome: o("No owner", "warn"), summary: "No CODEOWNERS and no deploys in a year; flagged for a decision.", via: "Finding Ownership", secs: 11 },
  ],
  prioritization: [
    { ago: 15, target: ["cve", "CVE-2026-94545"], outcome: o("P1", "risk"), summary: "Exploitable, on CISA KEV and internet-facing: fix within 48 hours.", via: "Triage Hunter", secs: 3 },
    { ago: 6 * H, target: ["cve", "CVE-2024-4068"], outcome: o("P4", "unclear"), summary: "Not exploitable here; tracked, no SLA.", via: "Triage Hunter", secs: 2 },
    { ago: D + 4 * H, target: ["sast", "SQL injection · orders.ts:88"], outcome: o("P2", "warn"), summary: "Reachable but unconfirmed; fix within 14 days.", via: "Triage Hunter", secs: 3 },
  ],
  "threat-intel": [
    { ago: 30, target: ["cve", "CVE-2026-61002"], outcome: o("Public exploit", "warn"), summary: "A working PoC was published on GitHub 2 hours ago.", via: "Triage Hunter", secs: 12 },
    { ago: 7 * H, target: ["cve", "CVE-2026-94545"], outcome: o("Actively exploited", "risk"), summary: "Added to CISA KEV; seen in 2 ransomware campaigns.", via: "Triage Hunter", secs: 9 },
    { ago: 2 * D, target: ["cve", "CVE-2024-4068"], outcome: o("No activity", "clear"), summary: "No exploits or campaigns on record.", via: "Triage Hunter", secs: 6 },
  ],
  reporting: [
    { ago: 18, target: ["cve", "CVE-2026-94545"], outcome: o("Ticket filed", "good"), summary: "STORE-1182 for the Storefront team, with the evidence attached.", via: "Triage Hunter", secs: 5 },
    { ago: D + H, target: ["repo", "payments-api"], outcome: o("Report sent", "good"), summary: "Weekly risk summary sent to #sec-payments.", via: "Triage Hunter", secs: 14 },
  ],
  remediation: [
    { ago: 40, target: ["cve", "CVE-2026-94545"], outcome: o("Easy", "good"), summary: "Bumped imgproc to 4.1.9 in a sandbox copy; tests pass. PR #412 is ready.", via: "Code CVE Exploitability", secs: 210 },
    { ago: D + 6 * H, target: ["sast", "SQL injection · orders.ts:88"], outcome: o("Medium", "warn"), summary: "Switched to a parameterised query; 2 callers need a small change.", via: "Code SAST Exploitability", secs: 340 },
  ],
  "red-team": [
    { ago: 3 * H, target: ["cve", "CVE-2025-29927"], outcome: o("Exploit demonstrated", "risk"), summary: "Reached /admin on the staging replica without a session.", via: "Red Team Simulation", secs: 190 },
    { ago: 2 * D, target: ["cve", "CVE-2024-4068"], outcome: o("Not reproduced", "clear"), summary: "The vulnerable path is never called from a request.", via: "Red Team Simulation", secs: 150 },
  ],
  "data-leak": [
    { ago: 50, target: ["secret", "AWS key · infra/.env"], outcome: o("Leak found", "risk"), summary: "A live key, committed 3 days ago and still valid.", via: "Secret Validation", secs: 8 },
    { ago: D + 7 * H, target: ["secret", "Stripe key · README.md"], outcome: o("Clean", "clear"), summary: "A documented test key; nothing to rotate.", via: "Secret Validation", secs: 5 },
  ],
  "asset-discovery": [
    { ago: 2 * H, target: ["branch", "main · 6 repositories"], outcome: o("New assets", "warn"), summary: "2 new deployable apps and 1 shared library found.", via: "App Inventory", secs: 95 },
    { ago: 2 * D, target: ["asset", "AWS · prod account"], outcome: o("No change", "clear"), summary: "Every workload is already mapped.", via: "Deployment Mapping", secs: 120 },
  ],
}

// Agents whose runs are their own story (not one step's), by name; the rest are built from their steps' runs
const agentOwn: Record<string, Run[]> = {
  "Triage Hunter": [
    { ago: 2, target: ["repo", "This week's findings · 214"], running: true, summary: "Merging scanner findings and ranking them by real risk…", via: "Triage Hunter" },
    { ago: 18, target: ["cve", "CVE-2026-94545"], outcome: o("Tickets filed", "good"), summary: "Exploitable and on CISA KEV: STORE-1182 filed for the Storefront team, due in 48 hours.", via: "Triage Hunter", secs: 46 },
    { ago: 4 * H, target: ["cve", "CVE-2026-61002"], outcome: o("Needs approval", "warn"), summary: "A public PoC on 3 internet-facing assets; the tickets are drafted and wait for your OK.", via: "Triage Hunter", secs: 38 },
    { ago: 6 * H, target: ["cve", "CVE-2024-4068"], outcome: o("Nothing to fix", "clear"), summary: "Only reachable from build tooling; tracked with no SLA.", via: "Triage Hunter", secs: 21 },
    { ago: D + 2 * H, target: ["repo", "billing-service"], outcome: o("Nothing to fix", "clear"), summary: "9 findings, all duplicates of issues already filed.", via: "Triage Hunter", secs: 17 },
    { ago: D + 4 * H, target: ["sast", "SQL injection · orders.ts:88"], outcome: o("Tickets filed", "good"), summary: "Ranked P2: ORD-331 filed for the Orders team, due in 14 days.", via: "Triage Hunter", secs: 52 },
    { ago: 2 * D, target: ["asset", "admin-portal"], outcome: o("Failed", "failed"), summary: "Jira rejected the tickets (the project key changed); nothing was filed.", via: "Triage Hunter", secs: 12 },
  ],
  "Code CVE Exploitability": [
    { ago: 6 * H, target: ["cve", "CVE-2024-4068"], outcome: o("Not exploitable", "clear"), summary: "braces is only loaded by the build tooling; nothing reaches it at runtime.", via: "", secs: 42 },
    { ago: D + 9 * H, target: ["cve", "CVE-2025-29927"], outcome: o("Exploitable", "risk"), summary: "The Next.js middleware bypass works on admin-portal; the header isn't stripped at the edge.", via: "", secs: 37 },
    { ago: 2 * D, target: ["cve", "CVE-2024-21538"], outcome: o("Unclear", "unclear"), summary: "cross-spawn is called with user input in one script, but only behind an admin flag.", via: "", secs: 58 },
  ],
  "Cloud Exploitability": [
    { ago: 1, target: ["cve", "CVE-2026-61002"], running: true, summary: "Checking 14 internet-facing assets against the affected versions…", via: "" },
    { ago: 7 * H, target: ["cve", "CVE-2026-94545"], outcome: o("Exploitable", "risk"), summary: "storefront-prod-1 runs imgproc 4.1.7 and is reachable from the internet.", via: "", secs: 18 },
    { ago: D + 3 * H, target: ["asset", "payments-api · Wiz finding"], outcome: o("Not exploitable", "clear"), summary: "The instance sits in a private subnet with no route from the internet.", via: "", secs: 26 },
  ],
  "Code SAST Exploitability": [
    { ago: 3 * H, target: ["sast", "Path traversal · files.ts:41"], outcome: o("Exploitable", "risk"), summary: "The download route joins the file name from the query string without normalising it.", via: "", secs: 49 },
    { ago: D + 3 * H, target: ["sast", "SQL injection · orders.ts:88"], outcome: o("Unclear", "unclear"), summary: "The query is reachable, but an upstream validator may already reject the payload.", via: "", secs: 64 },
    { ago: 3 * D, target: ["sast", "XSS · profile.tsx:120"], outcome: o("Not exploitable", "clear"), summary: "React escapes the value; the flagged sink is never given raw HTML.", via: "", secs: 31 },
  ],
  "Red Team Simulation": [
    { ago: 3 * H, target: ["cve", "CVE-2025-29927"], outcome: o("Exploit demonstrated", "risk"), summary: "Reached /admin on the staging replica without a session.", via: "", secs: 190 },
    { ago: 2 * D, target: ["sast", "Path traversal · files.ts:41"], outcome: o("Not reproduced", "unclear"), summary: "The staging proxy rejected every encoded path we tried.", via: "", secs: 150 },
  ],
  "Finding Ownership": [
    { ago: 20, target: ["cve", "CVE-2026-94545"], outcome: o("Owner found", "good"), summary: "Storefront team (on call: Maya R.), from CODEOWNERS and the deploy history.", via: "", secs: 6 },
    { ago: 5 * H, target: ["sast", "SQL injection · orders.ts:88"], outcome: o("Owner found", "good"), summary: "Orders team; they wrote 90% of the file in the last year.", via: "", secs: 5 },
    { ago: D + 5 * H, target: ["asset", "legacy-cron-02"], outcome: o("No owner", "warn"), summary: "No CODEOWNERS and no deploys in a year; flagged for a decision.", via: "", secs: 11 },
  ],
  "WAF Analysis": [
    { ago: 2 * H, target: ["sast", "SQL injection · orders.ts:88"], outcome: o("Mitigated", "clear"), summary: "The managed SQLi rule set blocks every payload on the /orders path.", via: "", secs: 22 },
    { ago: D + H, target: ["cve", "CVE-2025-29927"], outcome: o("Suggestion", "warn"), summary: "No rule strips x-middleware-subrequest; a one-line custom rule would block it.", via: "", secs: 19 },
    { ago: 3 * D, target: ["cve", "CVE-2024-4068"], outcome: o("Irrelevant", "unclear"), summary: "Not reachable over HTTP, so the WAF has nothing to do here.", via: "", secs: 8 },
  ],
  "Remediation": [
    { ago: 40, target: ["cve", "CVE-2026-94545"], outcome: o("Easy", "clear"), summary: "Bumped imgproc to 4.1.9 in a sandbox copy; tests pass. PR #412 is ready.", via: "", secs: 210 },
    { ago: D + 6 * H, target: ["sast", "SQL injection · orders.ts:88"], outcome: o("Medium", "warn"), summary: "Switched to a parameterised query; 2 callers need a small change.", via: "", secs: 340 },
    { ago: 2 * D, target: ["cve", "CVE-2025-29927"], outcome: o("Hard", "risk"), summary: "The fix needs Next.js 15; 31 files use APIs that changed.", via: "", secs: 420 },
  ],
  "Secret Validation": [
    { ago: 50, target: ["secret", "AWS key · infra/.env"], outcome: o("Yes", "risk"), summary: "A live key, committed 3 days ago and still valid.", via: "", secs: 8 },
    { ago: D + 7 * H, target: ["secret", "Stripe key · README.md"], outcome: o("No", "good"), summary: "A documented test key; nothing to rotate.", via: "", secs: 5 },
  ],
  "App Inventory": [
    { ago: 2 * H, target: ["branch", "main · 6 repositories"], outcome: o("New assets", "warn"), summary: "2 new deployable apps and 1 shared library found.", via: "", secs: 95 },
    { ago: 3 * D, target: ["branch", "main · 6 repositories"], outcome: o("No change", "clear"), summary: "The same 14 apps and 5 libraries as last week.", via: "", secs: 88 },
  ],
  "Deployment Mapping": [
    { ago: 5 * H, target: ["asset", "AWS · prod account"], outcome: o("Mapped", "good"), summary: "3 EC2 apps tied to their repositories through their deploy scripts.", via: "", secs: 130 },
    { ago: 2 * D, target: ["asset", "AWS · prod account"], outcome: o("No change", "clear"), summary: "Every workload is already mapped.", via: "", secs: 120 },
  ],
}

const dayLabel = (d: Date) => {
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((start(new Date()) - start(d)) / 86_400_000)
  return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
}
const clock = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
const ago = (m: number) => m < 1 ? "just now" : m < H ? `${m} min ago` : m < D ? `${Math.round(m / H)} hours ago` : `${Math.round(m / D)} days ago`
const took = (s: number) => s < 60 ? `${s}s` : `${Math.round(s / 60)}m`

// A sub agent's runs; an agent's: the runs it made through its steps (newest first, each target once), or, for one
// that made none here, its first step's runs as its own
export const subRuns = (kind: AgentKind) => runs[kind] ?? []
// outcomes: the agent's own (as in its Overview); each run ends in one of them — a failed run in Failed, the others
// in the one of the same tone (runs with none that fits are left out) — so a step's result never shows as the agent's
export function agentRuns(name: string, kinds: AgentKind[], outcomes?: Outcome[]): Run[] {
  if (agentOwn[name]) return agentOwn[name]
  const seen = new Set<string>()
  // its runs through its steps, keeping those whose result is one of its own outcomes (when it lists any)
  const mine = (r: Run) => !outcomes?.length || !r.outcome || outcomes.some((x) => x.label.toLowerCase() === r.outcome!.label.toLowerCase())
  let list = Object.values(runs).flat().filter((r) => r.via === name && mine(r)).sort((a, b) => a.ago - b.ago)
    .filter((r) => !seen.has(r.target[1]) && seen.add(r.target[1]))
  if (!list.length) {
    const first = kinds.find((k) => runs[k]?.length)
    list = first ? runs[first]!.map((r) => ({ ...r, via: name })) : []
  }
  if (!outcomes?.length) return list
  const ends = outcomes.filter((x) => x.tone !== "failed")
  return list.flatMap((r) => {
    if (!r.outcome) return [r]
    const same = outcomes.find((x) => x.label.toLowerCase() === r.outcome!.label.toLowerCase())
    const end = same ?? (r.outcome.tone === "failed" ? outcomes.find((x) => x.tone === "failed") : ends.find((x) => x.tone === r.outcome!.tone))
    return end ? [{ ...r, outcome: end }] : [] // no outcome of its own that fits: left out rather than mislabelled
  })
}

// own: the agent's own panel, where "via" would only repeat its name, so the line just says how long it took
export function ActivityTimeline({ runs: list, bars, own }: { runs: Run[]; bars?: Partial<Record<Outcome["tone"], string>>; own?: boolean }) {
  const days: { label: string; items: (Run & { at: Date })[] }[] = []
  for (const r of list) {
    const at = minutesAgo(r.ago)
    const label = dayLabel(at)
    const day = days.at(-1)?.label === label ? days.at(-1)! : (days.push({ label, items: [] }), days.at(-1)!)
    day.items.push({ ...r, at })
  }
  let n = 0 // for the entrance stagger
  return (
    <div className="flex flex-col gap-6">
      {days.map((day) => (
        <section key={day.label} className="flex flex-col gap-2">
          <h3 className="flex items-center gap-1.5 text-small leading-4 font-medium text-fg-secondary">
            {day.label}
            <span className="font-normal text-fg-tertiary">· {day.items.length} {day.items.length === 1 ? "run" : "runs"}</span>
          </h3>
          <ol className="relative">
            {day.items.map((r, i) => {
              const Icon = targetIcon[r.target[0]]
              const color = r.outcome ? bars?.[r.outcome.tone] ?? outcomeColor(r.outcome.tone) : "#0350d0"
              return (
                <li key={i} className="activity-in group/run relative flex gap-3 py-2.5 pl-7" style={{ animationDelay: `${n++ * 40}ms` }}>
                  {/* the rail, from this node down to the next */}
                  {i < day.items.length - 1 && <span aria-hidden className="absolute top-[22px] -bottom-[22px] left-[7px] w-px bg-[#e5e3e3]" />}
                  {/* the node: a white ring with the outcome's colour in it; a soft pulse while it runs */}
                  <span aria-hidden className="absolute top-[15px] left-0 grid size-[15px] place-items-center rounded-full bg-white shadow-[inset_0_0_0_1px_#e5e3e3] transition-shadow duration-200 group-hover/run:shadow-[inset_0_0_0_1px_#d6d3d1]">
                    {r.running && <span className="absolute size-[7px] animate-ping rounded-full opacity-40 motion-reduce:hidden" style={{ background: color }} />}
                    <span className="relative size-[7px] rounded-full" style={{ background: color }} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex h-6 min-w-0 items-center gap-2">
                      <Icon aria-hidden className="size-3.5 shrink-0 text-fg-secondary" />
                      <span className="min-w-0 truncate text-body leading-5 text-fg-primary">{r.target[1]}</span>
                      {r.outcome
                        ? <PanelOutcomeChip outcome={r.outcome} bar={bars?.[r.outcome.tone]} />
                        : <span className="flex h-5 shrink-0 items-center rounded-[2px] bg-[#ecf3ff] px-1.5 text-small leading-4 whitespace-nowrap text-[#0350d0]">Running</span>}
                      <Hint label={ago(r.ago)} side="left">
                        <span className="ml-auto shrink-0 pl-2 text-small leading-4 whitespace-nowrap text-fg-tertiary tabular-nums transition-colors group-hover/run:text-fg-secondary">{r.running ? "now" : clock(r.at)}</span>
                      </Hint>
                    </div>
                    <p className="text-body leading-5 text-pretty text-fg-secondary">{r.summary}</p>
                    <p className="text-small leading-4 text-fg-tertiary">
                      {own ? (r.secs !== undefined ? `Took ${took(r.secs)}` : "Running for a minute") : <>via {r.via}{r.secs !== undefined && ` · ${took(r.secs)}`}</>}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}

export const ActivityEmpty = ({ name, className }: { name: string; className?: string }) => (
  <p className={cn("text-body leading-5 text-fg-secondary", className)}>No activity yet. Runs of {name} will show here.</p>
)
