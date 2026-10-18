import { useSyncExternalStore } from "react"

// Which agents and sub agents are switched off (Enabled / Disabled on the Agents page, pages/gallery.tsx).
// Everything starts enabled. Kept in memory like the rest of the demo: a reload turns everything back on.
// Keys: an agent's id ("triage", a clone's id) or "sub:<kind>" for a sub agent.
const off = new Set<string>()
const listeners = new Set<() => void>()
let version = 0

export const isEnabled = (key: string) => !off.has(key)
export function setEnabled(key: string, on: boolean) {
  if (on) off.delete(key)
  else off.add(key)
  version++
  listeners.forEach((l) => l())
}

// Re-renders when any switch flips
export function useEnabled() {
  useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => version)
  return { isEnabled, setEnabled }
}
