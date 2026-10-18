import { Combine, Crosshair, FileText, Fingerprint, Hammer, ListOrdered, Radar, ScanSearch, Swords, UserRoundSearch, type LucideIcon } from "lucide-react"

// Helper agents the orchestrator can delegate to. Each gets a fixed name + glyph (never a color:
// color is reserved for "needs you"). Add a new agent type with one line here.
// Super agents (data/super-agents.ts) are patterns built from these. role = its one job, in a sentence.
export const agents = {
  exploitability: { name: "Exploitability agent", icon: Crosshair, role: "Checks whether a weakness is actually reachable and exploitable in your environment", short: "Confirms it's exploitable" },
  remediation: { name: "Remediation agent", icon: Hammer, role: "Drafts the fix (PR, WAF rule, policy change) and verifies it", short: "Drafts and verifies the fix" },
  "threat-intel": { name: "Threat intel agent", icon: Radar, role: "Matches findings against active campaigns, KEV and public exploits", short: "Matches active threats" },
  "red-team": { name: "Red team agent", icon: Swords, role: "Attacks an isolated staging replica, never production", short: "Attacks a staging replica" },
  "asset-discovery": { name: "Asset discovery agent", icon: ScanSearch, role: "Inventories assets, AI agents and their tools across clouds", short: "Inventories assets and agents" },
  ownership: { name: "Ownership agent", icon: UserRoundSearch, role: "Finds the team and on-call who own a resource", short: "Finds the owning team" },
  "data-leak": { name: "Data leak agent", icon: Fingerprint, role: "Scans agent traffic and data access for PII and secrets", short: "Scans for PII and secrets" },
  reporting: { name: "Reporting agent", icon: FileText, role: "Turns results into a report, evidence pack or ticket", short: "Files tickets and reports" },
  correlation: { name: "Correlation agent", icon: Combine, role: "Merges duplicate findings from every scanner into one issue per asset", short: "Merges duplicate findings" },
  prioritization: { name: "Prioritization agent", icon: ListOrdered, role: "Ranks issues by exploitability, active threat and asset criticality, and sets an SLA", short: "Ranks issues and sets SLAs" },
} satisfies Record<string, { name: string; icon: LucideIcon; role: string; short: string }>

export type AgentKind = keyof typeof agents
