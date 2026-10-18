import { useSyncExternalStore } from "react"
import type { SuperAgent } from "@/data/super-agents"

/*
 * What starts one of your agents (the Triggers section of its Activity tab, components/tasks/triggers.tsx).
 * Every agent has three: On demand (always on: you can always ask it), a Schedule (when / how often) and an Event
 * (which event, from where). Schedule and Event each have their own on/off switch, so an agent can run on several.
 * Defaults come from the template it was made from; kept in memory like the rest of the demo.
 */

export type Schedule = { every: "day" | "week" | "month"; day?: number; time: string } // week: day 0–6 (Sun–Sat); month: day of month
export type EventConfig = { event: string; source: string; filter?: string }
export type Triggers = { schedule: Schedule & { on: boolean }; event: EventConfig & { on: boolean } }

// Per template: a sensible schedule and the event it reacts to
const defaults: Record<string, { schedule: Schedule; event: EventConfig }> = {
  triage: { schedule: { every: "week", day: 1, time: "09:00" }, event: { event: "New findings", source: "Wiz, Snyk, Dependabot", filter: "Severity high or critical" } },
  "patch-pilot": { schedule: { every: "day", time: "08:00" }, event: { event: "New CVE in your dependencies", source: "Snyk, GitHub", filter: "CVSS 7.0 or higher" } },
  "exposure-hunter": { schedule: { every: "day", time: "07:00" }, event: { event: "New critical threat", source: "Threat intel", filter: "On CISA KEV, public PoC or active campaign" } },
  "injection-shield": { schedule: { every: "week", day: 1, time: "09:00" }, event: { event: "Prompt or tool change on an AI agent", source: "Agent registry" } },
  "leak-sentinel": { schedule: { every: "week", day: 5, time: "16:00" }, event: { event: "New AI agent deployed", source: "Agent registry" } },
  "red-team-drill": { schedule: { every: "month", day: 1, time: "10:00" }, event: { event: "AI agent release about to ship", source: "GitHub", filter: "Release tagged on main" } },
  "audit-ready": { schedule: { every: "month", day: 1, time: "09:00" }, event: { event: "Agent permissions change", source: "Okta, cloud IAM" } },
}
const fallback = defaults.triage

const store = new Map<string, Triggers>()
const listeners = new Set<() => void>()
let version = 0

export function triggersOf(sa: SuperAgent): Triggers {
  const saved = store.get(sa.id)
  if (saved) return saved
  const d = defaults[sa.clonedFrom ?? sa.id] ?? fallback
  // One on and one off by default, so both states show: the schedule, unless an event was picked while customizing it (pages/clone.tsx)
  const event = sa.trigger?.kind === "event"
  return { schedule: { ...d.schedule, on: !event }, event: { ...d.event, on: event } }
}
export function setTrigger(sa: SuperAgent, kind: "schedule" | "event", on: boolean) {
  const t = triggersOf(sa)
  store.set(sa.id, { ...t, [kind]: { ...t[kind], on } })
  version++
  listeners.forEach((l) => l())
}
export function useTriggers(sa: SuperAgent) {
  useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => version)
  return triggersOf(sa)
}

export const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
export const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`

// "Every Monday at 09:00", split into how often and when
export const howOften = (s: Schedule) => (s.every === "day" ? "Daily" : s.every === "week" ? "Weekly" : "Monthly")
export const when = (s: Schedule) =>
  s.every === "day" ? `Every day at ${s.time}` : s.every === "week" ? `${days[s.day ?? 1]}s at ${s.time}` : `The ${ordinal(s.day ?? 1)} at ${s.time}`

// The next time it fires, e.g. "Mon, Oct 19 · 09:00"
export function nextRun(s: Schedule, now = new Date()) {
  const [h, m] = s.time.split(":").map(Number)
  const d = new Date(now)
  d.setHours(h, m, 0, 0)
  if (s.every === "week") d.setDate(d.getDate() + ((s.day ?? 1) - d.getDay() + 7) % 7)
  if (s.every === "month") d.setDate(s.day ?? 1)
  if (d <= now) {
    if (s.every === "day") d.setDate(d.getDate() + 1)
    else if (s.every === "week") d.setDate(d.getDate() + 7)
    else d.setMonth(d.getMonth() + 1)
  }
  return `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${s.time}`
}
