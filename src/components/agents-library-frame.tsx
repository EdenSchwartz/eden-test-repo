import { useEffect, useRef } from "react"
import { Bot, Clock, Play } from "lucide-react"
import { agentOutcomes, type Outcome } from "@/data/outcomes"
import { blockers, superAgents, type SuperAgent } from "@/data/super-agents"
import { useNav } from "@/lib/nav"

/*
 * Hovering the header box: a faint, shimmering grid (ShimmerGrid) shows up around the pointer (like the Hex look's New chat, but lighter)
 * with a soft Rival-blue glow under it. Both trail the pointer with a little lag (eased each frame), and fade
 * in and out, so the box feels alive rather than mechanical. Styles: .alive-* in index.css.
 */
function useAliveHover() {
  const el = useRef<HTMLDivElement>(null)
  const target = useRef({ x: 0, y: 0 })
  const pos = useRef({ x: 0, y: 0 })
  const raf = useRef(0)

  const set = (x: number, y: number) => {
    el.current?.style.setProperty("--ax", `${x}px`)
    el.current?.style.setProperty("--ay", `${y}px`)
  }
  const tick = () => {
    const p = pos.current, t = target.current
    p.x += (t.x - p.x) * 0.12
    p.y += (t.y - p.y) * 0.12
    set(p.x, p.y)
    raf.current = Math.abs(t.x - p.x) + Math.abs(t.y - p.y) > 0.3 ? requestAnimationFrame(tick) : 0
  }
  const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const follow = (x: number, y: number, jump = false) => {
    target.current = { x, y }
    if (jump || still()) { pos.current = { x, y }; set(x, y); return }
    if (!raf.current) raf.current = requestAnimationFrame(tick)
  }

  // The hint: coming near the box (within 18rem, from outside), the grid and glow peek in at the closest edge,
  // stronger the closer you get (--near 0 → 1), so it's clear something lives there before you're inside
  useEffect(() => {
    const box = el.current
    if (!box) return
    let wasNear = false
    const move = (e: PointerEvent) => {
      const b = box.getBoundingClientRect()
      const cx = Math.min(Math.max(e.clientX, b.left), b.right), cy = Math.min(Math.max(e.clientY, b.top), b.bottom)
      const d = Math.hypot(e.clientX - cx, e.clientY - cy)
      if (d === 0) return // inside: the hover takes over
      const range = parseFloat(getComputedStyle(document.documentElement).fontSize) * 18
      const near = Math.pow(Math.max(0, 1 - d / range), 0.6) // eases off slowly, so it still shows from a distance
      box.style.setProperty("--near", near.toFixed(3))
      if (near > 0) { box.dataset.near = ""; follow(cx - b.left, cy - b.top, !wasNear) } else delete box.dataset.near
      wasNear = near > 0
    }
    window.addEventListener("pointermove", move, { passive: true })
    return () => { window.removeEventListener("pointermove", move); cancelAnimationFrame(raf.current) }
  }, [])

  const point = (e: React.PointerEvent<HTMLDivElement>) => {
    const b = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - b.left, y: e.clientY - b.top }
  }
  return {
    ref: el,
    onPointerEnter: (e: React.PointerEvent<HTMLDivElement>) => {
      const p = point(e); follow(p.x, p.y, !e.currentTarget.hasAttribute("data-near"))
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => { const p = point(e); follow(p.x, p.y) },
  }
}

/*
 * The grid, drawn on a canvas so every short line (one cell edge, 1.25rem long) can breathe on its own:
 * each fades in and out on its own slow rhythm (2.5 to 6s) and phase, so the grid shimmers instead of
 * sitting still, like twinkling dots but with lines. The .alive-grid mask in index.css keeps it to the area
 * around the pointer. Only animates while the box is hovered (and through the fade-out); still if the user
 * prefers reduced motion.
 */
function ShimmerGrid() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current, box = canvas?.parentElement
    if (!canvas || !box) return
    const ctx = canvas.getContext("2d")!
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let raf = 0, stopAt = 0, w = 0, h = 0, cell = 20

    // A fixed pseudo-random value per line, so each keeps its own rhythm
    const rand = (i: number, j: number, k: number) => {
      const x = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453
      return x - Math.floor(x)
    }
    const size = () => {
      const dpr = window.devicePixelRatio || 1
      w = box.clientWidth; h = box.clientHeight
      cell = parseFloat(getComputedStyle(document.documentElement).fontSize) * 1.25
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const alpha = (t: number, i: number, j: number, k: number) => {
      if (still) return 0.07
      const speed = (2 * Math.PI) / (2500 + rand(i, j, k) * 3500)
      const wave = Math.sin(t * speed + rand(j, i, k + 3) * 2 * Math.PI) * 0.5 + 0.5
      return 0.03 + 0.1 * wave * wave // mostly faint, now and then a line glows up
    }
    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      for (let i = 0; i * cell <= w; i++) {
        for (let j = 0; j * cell <= h; j++) {
          ctx.fillStyle = `rgba(18,18,18,${alpha(t, i, j, 0)})`
          ctx.fillRect(i * cell, j * cell, cell, 1) // the cell's top edge
          ctx.fillStyle = `rgba(18,18,18,${alpha(t, i, j, 1)})`
          ctx.fillRect(i * cell, j * cell, 1, cell) // its left edge
        }
      }
    }
    const loop = (t: number) => {
      draw(t)
      raf = !still && (box.matches(":hover") || box.hasAttribute("data-near") || t < stopAt) ? requestAnimationFrame(loop) : 0
    }
    const start = () => { if (!raf) raf = requestAnimationFrame(loop) }
    const leave = () => { stopAt = performance.now() + 700 } // keep moving through the 600ms fade-out

    size(); draw(0)
    const ro = new ResizeObserver(() => { size(); draw(performance.now()) })
    ro.observe(box)
    // Start when the pointer comes in or near (data-near, set by useAliveHover)
    const mo = new MutationObserver(() => { if (box.hasAttribute("data-near")) start(); else leave() })
    mo.observe(box, { attributes: true, attributeFilter: ["data-near"] })
    box.addEventListener("pointerenter", start)
    box.addEventListener("pointerleave", leave)
    return () => { cancelAnimationFrame(raf); ro.disconnect(); mo.disconnect(); box.removeEventListener("pointerenter", start); box.removeEventListener("pointerleave", leave) }
  }, [])
  return <canvas ref={ref} aria-hidden className="alive-grid size-full" />
}

/*
 * The page area of Figma "Frame 2147206359", exactly: a white header block (p 40, gap 12, #ECEBE9 line under it)
 * with the title (Geist Medium 20, line height 16, #121212) and the description (Geist 14/16, #6C6A68),
 * four 12px white squares with a #DDDCDA edge at the frame's own positions, and empty white space below.
 * Positions are relative to the area right of the sidebar, top bar included (the squares sit on the two lines).
 */
export function AgentsLibraryFrame() {
  const alive = useAliveHover()
  return (
    <div className="flex flex-1 flex-col items-start bg-white whitespace-nowrap">
      <div {...alive} className="alive-box relative isolate flex w-full flex-col items-start justify-center gap-3 overflow-hidden border-b border-[#ecebe9] bg-white p-10">
        <span aria-hidden className="alive-glow" />
        <ShimmerGrid />
        <p className="text-[1.25rem] leading-4 font-medium text-[#121212]">Agents Library</p>
        <p className="text-[0.875rem] leading-4 font-normal text-[#6c6a68]">
          Ready-made security agents by Rival. Pick one, make it yours in a short chat, and it joins My Agents.
        </p>
      </div>
      {/* The cards area: a drafting-sheet margin on both sides (fine diagonal hatching, a hairline rail), cards go between */}
      <div className="relative flex w-full flex-1">
        <span aria-hidden className="sheet-margin left-0 border-r" />
        <div className="grid min-w-0 flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(23.8125rem,1fr))] gap-4 px-2 pt-8 pb-10">
          {superAgents.filter((sa) => !sa.custom).map((sa) => <AgentCard key={sa.id} sa={sa} />)}
        </div>
        <span aria-hidden className="sheet-margin right-0 border-l" />
      </div>
    </div>
  )
}

// The four squares, placed against the area right of the sidebar (left -1 / 1712 / 1713 at a 1724px wide area)
export function FrameCorners() {
  const sq = "absolute size-3 border border-[#dddcda] bg-white"
  return (
    <>
      <div aria-hidden className={sq} style={{ left: -1, top: "10.4375rem" }} />
      <div aria-hidden className={sq} style={{ left: -1, top: "2.625rem" }} />
      <div aria-hidden className={sq} style={{ right: 0, top: "2.625rem" }} />
      <div aria-hidden className={sq} style={{ right: -1, top: "10.4375rem" }} />
    </>
  )
}

/*
 * An agent card. The top is the Figma card "Frame 2147206362" as drawn: white, a #F0F0F0 edge, drop shadow
 * 0 1 1 rgba(0,0,0,.04), p 8, 4px corners; a 48px #5E64BF tile (6px corners) with the white icon; the name
 * (Geist Medium 16/16, #121212) and the tagline (14/16, #6C6A68), 10 apart.
 * Under a hairline, what the earlier cards told you: what a run ends in (its outcomes), and one quiet line,
 * never wrapping: made by Rival · sub agents · time per run · runs this month · Needs setup when a tool is missing.
 * Click: make it yours in a short chat (the Customize page).
 */
const tone: Record<Outcome["tone"], string> = {
  risk: "bg-[#d8453a]", clear: "bg-[#2e4eca]", good: "bg-[#2f9e5b]", warn: "bg-[#d9921a]", unclear: "bg-[#9a9893]", failed: "bg-[#9a9893]",
}

function AgentCard({ sa }: { sa: SuperAgent }) {
  const { navigate } = useNav()
  const Icon = sa.icon
  const outcomes = (agentOutcomes[sa.id] ?? []).filter((o) => o.label !== "Failed").slice(0, 3)
  const setup = blockers(sa).length > 0
  return (
    <button
      onClick={() => navigate("clone", { templateId: sa.id })}
      className="group flex cursor-pointer flex-col items-stretch rounded-[0.25rem] border border-[#f0f0f0] bg-white p-2 text-left drop-shadow-[0px_1px_1px_rgba(0,0,0,0.04)] transition-[border-color,translate] duration-200 hover:-translate-y-px hover:border-[#e2e1df]"
    >
      <span className="flex w-full items-center gap-2">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-[0.375rem] bg-[#5e64bf] text-white">
          <Icon className="size-6" strokeWidth={1.5} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col items-start gap-2.5">
          <span className="w-full truncate text-[1rem] leading-4 font-medium text-[#121212]">{sa.name}</span>
          <span className="w-full truncate text-[0.875rem] leading-4 text-[#6c6a68]">{sa.tagline}</span>
        </span>
      </span>

      <span className="mt-2 flex flex-col gap-2.5 border-t border-[#f0f0f0] px-1 pt-2.5 pb-1 text-[0.75rem] leading-4 whitespace-nowrap text-[#6c6a68]">
        {outcomes.length > 0 && (
          <span className="flex min-w-0 items-center gap-3 overflow-hidden">
            <span className="text-[#9a9893]">Ends in</span>
            {outcomes.map((o) => (
              <span key={o.label} className="inline-flex items-center gap-1.5">
                <span aria-hidden className={`size-1.5 rounded-full ${tone[o.tone]}`} />
                {o.label}
              </span>
            ))}
          </span>
        )}
        <span className="flex min-w-0 items-center gap-3 overflow-hidden text-[#9a9893]">
          <span className="inline-flex items-center gap-1.5"><img src="/rival-logo.png" alt="" className="size-3.5" />Rival</span>
          <span className="inline-flex items-center gap-1.5"><Bot className="size-3.5" />{sa.pattern.flat().length} agents</span>
          <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" />~{sa.runtime}</span>
          <span className="inline-flex items-center gap-1.5"><Play className="size-3.5" />{sa.runsThisMonth} runs / mo</span>
          {setup && (
            <span className="ml-auto inline-flex items-center gap-1.5 font-medium text-[#b7791f]">
              <span aria-hidden className="size-1.5 rounded-full bg-[#d9921a]" />Needs setup
            </span>
          )}
        </span>
      </span>
    </button>
  )
}
