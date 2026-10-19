import { useEffect, useRef } from "react"

/*
 * Hovering the header box: a faint grid shows up around the pointer (like the Hex look's New chat, but lighter)
 * with a soft Rival-blue glow under it. Both trail the pointer with a little lag (eased each frame), and fade
 * in and out, so the box feels alive rather than mechanical. Styles: .alive-* in index.css.
 */
function useAliveHover() {
  const el = useRef<HTMLDivElement>(null)
  const target = useRef({ x: 0, y: 0 })
  const pos = useRef({ x: 0, y: 0 })
  const raf = useRef(0)
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

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
  const point = (e: React.PointerEvent<HTMLDivElement>) => {
    const b = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - b.left, y: e.clientY - b.top }
  }
  const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

  return {
    ref: el,
    onPointerEnter: (e: React.PointerEvent<HTMLDivElement>) => {
      // Start right under the pointer, no slide in from a corner
      target.current = point(e); pos.current = { ...target.current }; set(pos.current.x, pos.current.y)
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      target.current = point(e)
      if (still()) { pos.current = { ...target.current }; set(pos.current.x, pos.current.y); return }
      if (!raf.current) raf.current = requestAnimationFrame(tick)
    },
  }
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
    <div className="flex flex-col items-start bg-white whitespace-nowrap">
      <div {...alive} className="alive-box relative isolate flex w-full flex-col items-start justify-center gap-3 overflow-hidden border-b border-[#ecebe9] bg-white p-10">
        <span aria-hidden className="alive-glow" />
        <span aria-hidden className="alive-grid" />
        <p className="text-[1.25rem] leading-4 font-medium text-[#121212]">Agents Library</p>
        <p className="text-[0.875rem] leading-4 font-normal text-[#6c6a68]">
          Ready-made security agents by Rival. Pick one, make it yours in a short chat, and it joins My Agents.
        </p>
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
