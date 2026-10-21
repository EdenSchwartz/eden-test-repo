import { useSyncExternalStore } from "react"

// Which agent card is on while we explore: "current" (the approved card), "a" (round pixel marks), "b" (next idea).
// Picked with the switch on the Agents Library tabs row; remembered in this browser; My Agents follows it too.
export type CardLook = "current" | "a" | "b"
const KEY = "rival-card-look"
const listeners = new Set<() => void>()
let value: CardLook = (() => { try { const v = localStorage.getItem(KEY); return v === "a" || v === "b" ? v : "current" } catch { return "current" } })()

export const setCardLook = (v: CardLook) => {
  value = v
  try { localStorage.setItem(KEY, v) } catch { /* ok */ }
  listeners.forEach((l) => l())
}
export const getCardLook = () => value
export const useCardLook = () =>
  useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, () => value)
