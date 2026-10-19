import { flushSync } from "react-dom"

// Animate a layout change with the browser's view transitions (styles in index.css, scoped by data-vt).
// Falls back to an instant change where unsupported or with reduced motion.
// before/after run just before the old state is captured and right after the change (e.g. to move a view-transition-name).
// kind picks the motion in index.css: "split" (default: the side panel) or "expand" (a card grows into a full page).
export function withTransition(change: () => void, hooks: { before?: () => void; after?: () => void; done?: () => void } = {}, kind: "split" | "expand" = "split") {
  if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    change()
    hooks.done?.()
    return
  }
  const root = document.documentElement
  root.dataset.vt = kind
  hooks.before?.()
  document.startViewTransition(() => { flushSync(change); hooks.after?.() }).finished.finally(() => {
    delete root.dataset.vt
    hooks.done?.()
  })
}
