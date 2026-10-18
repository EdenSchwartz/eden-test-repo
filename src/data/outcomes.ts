import type { AgentKind } from "@/components/chat/agents"

/*
 * Outcomes: the results a run can end in, like the real product's Agents page
 * (e.g. Exploitable · Not Exploitable · Unclear · Failed). Shown in the panel's Overview tab
 * (components/tasks/outcomes.tsx). Your agents use their template's.
 * tone: risk (red) · clear (blue: checked, nothing to act on) · good (green: job done) · warn (amber) · unclear (grey) · failed (red ✕)
 */
export type Outcome = { label: string; tone: "risk" | "clear" | "good" | "warn" | "unclear" | "failed" }

const failed: Outcome = { label: "Failed", tone: "failed" }
const unclear: Outcome = { label: "Unclear", tone: "unclear" }

// Agents (the multi-step ones), by template id
export const agentOutcomes: Record<string, Outcome[]> = {
  triage: [{ label: "Tickets filed", tone: "good" }, { label: "Nothing to fix", tone: "clear" }, { label: "Needs approval", tone: "warn" }, failed],
  "patch-pilot": [{ label: "PR opened", tone: "good" }, { label: "No fix available", tone: "warn" }, { label: "Not affected", tone: "clear" }, failed],
  "exposure-hunter": [{ label: "Exposed", tone: "risk" }, { label: "Not exposed", tone: "clear" }, unclear, failed],
  "injection-shield": [{ label: "Vulnerable", tone: "risk" }, { label: "Partially resistant", tone: "warn" }, { label: "Resistant", tone: "clear" }, failed],
  "leak-sentinel": [{ label: "Leak found", tone: "risk" }, { label: "No leaks", tone: "clear" }, unclear, failed],
  "red-team-drill": [{ label: "Exploit demonstrated", tone: "risk" }, { label: "Not reproduced", tone: "clear" }, failed],
  "audit-ready": [{ label: "Audit-ready", tone: "good" }, { label: "Gaps found", tone: "warn" }, failed],
}

// Sub agents, by kind (the product's built-in agents where they match). None = the section is left out
export const subOutcomes: Partial<Record<AgentKind, Outcome[]>> = {
  exploitability: [{ label: "Exploitable", tone: "risk" }, { label: "Not exploitable", tone: "clear" }, unclear, failed],
  "threat-intel": [{ label: "Actively exploited", tone: "risk" }, { label: "Public exploit", tone: "warn" }, { label: "No activity", tone: "clear" }, failed],
  "red-team": [{ label: "Exploit demonstrated", tone: "risk" }, { label: "Not reproduced", tone: "clear" }, failed],
  remediation: [{ label: "Easy", tone: "good" }, { label: "Medium", tone: "warn" }, { label: "Hard", tone: "risk" }],
  "data-leak": [{ label: "Leak found", tone: "risk" }, { label: "Clean", tone: "clear" }, unclear, failed],
  prioritization: [{ label: "P1", tone: "risk" }, { label: "P2", tone: "warn" }, { label: "P3", tone: "unclear" }, { label: "P4", tone: "unclear" }],
}
