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

const dayLabel = (d: Date) => {
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((start(new Date()) - start(d)) / 86_400_000)
  return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
}
const clock = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
const ago = (m: number) => m < 1 ? "just now" : m < H ? `${m} min ago` : m < D ? `${Math.round(m / H)} hours ago` : `${Math.round(m / D)} days ago`
const took = (s: number) => s < 60 ? `${s}s` : `${Math.round(s / 60)}m`

export const hasActivity = (kind: AgentKind) => Boolean(runs[kind]?.length)

export function ActivityTimeline({ kind, bars }: { kind: AgentKind; bars?: Partial<Record<Outcome["tone"], string>> }) {
  const list = runs[kind] ?? []
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
                      via {r.via}{r.secs !== undefined && ` · ${took(r.secs)}`}
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
