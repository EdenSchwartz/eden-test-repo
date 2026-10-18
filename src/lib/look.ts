import { useSyncExternalStore } from "react"

// Which look is on ("rival" or "hex"): <html data-look>, set by the header switch (components/look-switch.tsx).
// For the few places where Hex changes structure, not just style (e.g. Home's grid, components/home/hex-home.tsx).
const subscribe = (cb: () => void) => {
  const mo = new MutationObserver(cb)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-look"] })
  return () => mo.disconnect()
}
export const useLook = () =>
  useSyncExternalStore(subscribe, () => (document.documentElement.dataset.look === "hex" ? "hex" : "rival"))
