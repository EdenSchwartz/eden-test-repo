import { flushSync } from "react-dom"
import { Sparkles } from "lucide-react"

// Circular reveal from the button into the new screen, via the native View Transitions API.
// The soft mask edge and glow ring are drawn in index.css; this just animates the radius.
// ponytail: browsers without it (or reduced-motion users) just switch instantly.
export function navigateWithReveal(navigate: () => void, x: number, y: number) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
  if (!document.startViewTransition || reduced) return navigate()

  const root = document.documentElement
  root.style.setProperty("--reveal-x", `${x}px`)
  root.style.setProperty("--reveal-y", `${y}px`)
  // Glow ring lives in the new state so it paints above the page snapshots
  const glow = document.createElement("div")
  glow.className = "reveal-glow"
  for (let i = 0; i < 60; i++) {
    const speck = document.createElement("i")
    const rand = Math.random
    speck.style.cssText = `--a:${rand() * 360}deg;--j:${-75 + rand() * 75}px;--s:${rand() < 0.3 ? 4 : 3}px;--d:${600 + rand() * 800}ms;--delay:-${rand() * 1400}ms`
    glow.append(speck)
  }

  const transition = document.startViewTransition(async () => {
    flushSync(navigate)
    // Let follow-up renders land before the new screen is captured: Run creates its conversation in an effect,
    // so without this the reveal shows Home first. ponytail: one macrotask is enough here; a ready signal if that changes
    await new Promise((r) => setTimeout(r))
    document.body.append(glow)
  })

  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 200
  // fill "forwards" keeps the final frame until the transition ends; without it the mask snaps
  // back to 0 for a frame and the old screen (with this button) flickers through.
  const timing = { duration: 900, easing: "cubic-bezier(0.3, 0, 0, 1)" /* short snappy ease-in, long hard ease-out */, fill: "forwards" } as const
  transition.ready.then(() => {
    // Start as a ~160px blob instead of a point, and fade the start in
    const r0 = "160px", r1 = `${radius}px`
    root.animate(
      [{ "--reveal-r": r0, opacity: 0 }, { opacity: 1, offset: 0.2 }, { "--reveal-r": r1, opacity: 1 }],
      { ...timing, pseudoElement: "::view-transition-new(root)" },
    )
    glow.animate([{ "--reveal-r": r0, opacity: 0 }, { opacity: 1, offset: 0.25 }, { "--reveal-r": r1, opacity: 0 }], timing)
  })
  transition.finished.finally(() => glow.remove())
}

export function NewChatFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        navigateWithReveal(onClick, r.left + r.width / 2, r.top + r.height / 2)
      }}
      className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-black/30 ring-1 ring-white/10 transition-transform duration-150 hover:scale-105 active:scale-95"
    >
      <Sparkles className="size-4" />
      New conversation
    </button>
  )
}
