import { useEffect, useRef, useState } from "react"
import { AppWindow, Bandage, Cloud, Crosshair, KeyRound, Search, ShieldCheck, Swords, UsersRound, X, type LucideIcon } from "lucide-react"
import { agentOutcomes, subOutcomes, type Outcome } from "@/data/outcomes"
import { getSuperAgent, type SuperAgent } from "@/data/super-agents"
import { RivalMark } from "@/components/nav-icons"
import { useNav } from "@/lib/nav"
import { agents, type AgentKind } from "@/components/chat/agents"
import { SubAgentDetail, subName, usedBy } from "@/components/tasks/sub-agent-card"
import { TemplateDetail } from "@/components/tasks/template-detail"
import { withTransition } from "@/lib/view-transition"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { colorFor, flatColors, registerColor } from "@/components/tasks/color-tile"
import { StatusChip } from "@/components/tasks/status-chip"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useEnabled } from "@/lib/enabled"
import type { TaskStatus } from "@/lib/task-status"
import { cn } from "@/lib/utils"
import { APP, CLOUD, GRC, THREATS, VM, CategoryTag } from "@/components/category-tag"
import { CapabilityMarks, type Capability } from "@/components/capability"
import { IdeaALogoChip, IdeaAMark, IdeaATag, figmaLogos, ideaAColors } from "@/components/agent-card-a"
import { setCardLook, useCardLook, type CardLook } from "@/lib/card-look"

/*
 * The header box's grid lit by a fluid. A small Navier-Stokes simulation (Jos Stam's "stable fluids":
 * add forces, diffuse, advect, project so it stays incompressible) runs on a grid twice as fine as the drawn one.
 * Moving the pointer pushes the fluid and pours in dye; the dye swirls, curls and fades. Nothing is painted
 * as an area: only the grid lines take the dye's color, so the flow shows through the lines alone.
 * The color is silver like chrome: tight dark-steel to bright-silver bands that shift with the dye, with
 * bluish silver-white highlights sweeping through and, where the flow is fast, short white glints (the shine) with a cool steel / faint champagne tint, and faster flow
 * catches the light. Darker than the resting grid so it reads on white, at most 80% strength.
 * Coming near the box from outside (within 18rem) pours a little dye in at the closest edge, as a hint.
 * Left alone, it pulses on its own now and then (every 8 to 13s, each from a shuffled place): one soft stroke drifts across and fades.
 * Runs only while there's dye to show; still (no fluid) if the user prefers reduced motion.
 */
function FluidGrid() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current, box = canvas?.parentElement
    if (!canvas || !box) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const ctx = canvas.getContext("2d")!
    let w = 0, h = 0, cell = 20, res = 10, N = 0, M = 0
    let u: Float32Array, v: Float32Array, u0: Float32Array, v0: Float32Array, d: Float32Array, d0: Float32Array
    const IX = (i: number, j: number) => i + (N + 2) * j

    const size = () => {
      const dpr = window.devicePixelRatio || 1
      w = box.clientWidth; h = box.clientHeight
      cell = parseFloat(getComputedStyle(document.documentElement).fontSize) * 1.25
      res = cell / 2
      N = Math.ceil(w / res); M = Math.ceil(h / res)
      const n = (N + 2) * (M + 2)
      u = new Float32Array(n); v = new Float32Array(n); u0 = new Float32Array(n); v0 = new Float32Array(n)
      d = new Float32Array(n); d0 = new Float32Array(n)
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    // ---- stable fluids ----
    const bound = (b: number, x: Float32Array) => {
      for (let i = 1; i <= N; i++) { x[IX(i, 0)] = b === 2 ? -x[IX(i, 1)] : x[IX(i, 1)]; x[IX(i, M + 1)] = b === 2 ? -x[IX(i, M)] : x[IX(i, M)] }
      for (let j = 1; j <= M; j++) { x[IX(0, j)] = b === 1 ? -x[IX(1, j)] : x[IX(1, j)]; x[IX(N + 1, j)] = b === 1 ? -x[IX(N, j)] : x[IX(N, j)] }
    }
    const lin = (b: number, x: Float32Array, x0: Float32Array, a: number, c: number) => {
      for (let k = 0; k < 6; k++) {
        for (let j = 1; j <= M; j++) for (let i = 1; i <= N; i++)
          x[IX(i, j)] = (x0[IX(i, j)] + a * (x[IX(i - 1, j)] + x[IX(i + 1, j)] + x[IX(i, j - 1)] + x[IX(i, j + 1)])) / c
        bound(b, x)
      }
    }
    const diffuse = (b: number, x: Float32Array, x0: Float32Array, k: number, dt: number) => { const a = dt * k * N * M; lin(b, x, x0, a, 1 + 4 * a) }
    const advect = (b: number, dd: Float32Array, d0_: Float32Array, uu: Float32Array, vv: Float32Array, dt: number) => {
      for (let j = 1; j <= M; j++) for (let i = 1; i <= N; i++) {
        let x = i - dt * uu[IX(i, j)], y = j - dt * vv[IX(i, j)]
        x = Math.min(Math.max(x, 0.5), N + 0.5); y = Math.min(Math.max(y, 0.5), M + 0.5)
        const i0 = Math.floor(x), j0 = Math.floor(y), s1 = x - i0, t1 = y - j0
        dd[IX(i, j)] = (1 - s1) * ((1 - t1) * d0_[IX(i0, j0)] + t1 * d0_[IX(i0, j0 + 1)]) + s1 * ((1 - t1) * d0_[IX(i0 + 1, j0)] + t1 * d0_[IX(i0 + 1, j0 + 1)])
      }
      bound(b, dd)
    }
    const project = (uu: Float32Array, vv: Float32Array, p: Float32Array, div: Float32Array) => {
      for (let j = 1; j <= M; j++) for (let i = 1; i <= N; i++) {
        div[IX(i, j)] = -0.5 * (uu[IX(i + 1, j)] - uu[IX(i - 1, j)] + vv[IX(i, j + 1)] - vv[IX(i, j - 1)])
        p[IX(i, j)] = 0
      }
      bound(0, div); bound(0, p); lin(0, p, div, 1, 4)
      for (let j = 1; j <= M; j++) for (let i = 1; i <= N; i++) {
        uu[IX(i, j)] -= 0.5 * (p[IX(i + 1, j)] - p[IX(i - 1, j)])
        vv[IX(i, j)] -= 0.5 * (p[IX(i, j + 1)] - p[IX(i, j - 1)])
      }
      bound(1, uu); bound(2, vv)
    }
    const step = (dt: number) => {
      // velocity
      u0.set(u); v0.set(v); diffuse(1, u, u0, 0.00002, dt); diffuse(2, v, v0, 0.00002, dt); project(u, v, u0, v0)
      u0.set(u); v0.set(v); advect(1, u, u0, u0, v0, dt); advect(2, v, v0, u0, v0, dt); project(u, v, u0, v0)
      // dye
      d0.set(d); advect(0, d, d0, u, v, dt)
      for (let k = 0; k < d.length; k++) { d[k] *= 0.98; u[k] *= 0.996; v[k] *= 0.996 } // slow fade, long swirl
    }

    // ---- pointer: push the fluid and pour dye in a soft disc ----
    let last: { x: number; y: number } | null = null
    const splat = (x: number, y: number, fx: number, fy: number, amount: number) => {
      const ci = x / res + 1, cj = y / res + 1, r = 2.6
      for (let j = Math.max(1, Math.floor(cj - r)); j <= Math.min(M, Math.ceil(cj + r)); j++)
        for (let i = Math.max(1, Math.floor(ci - r)); i <= Math.min(N, Math.ceil(ci + r)); i++) {
          const f = Math.exp(-((i - ci) ** 2 + (j - cj) ** 2) / (r * r * 0.5))
          u[IX(i, j)] += fx * f; v[IX(i, j)] += fy * f; d[IX(i, j)] = Math.min(1.6, d[IX(i, j)] + amount * f)
        }
    }
    let touched = -Infinity // when the pointer last stirred the fluid (inside or near the box)
    const move = (e: PointerEvent) => {
      const b = box.getBoundingClientRect()
      const x = e.clientX - b.left, y = e.clientY - b.top
      const inside = x >= 0 && y >= 0 && x <= b.width && y <= b.height
      if (inside) {
        touched = performance.now()
        const dx = last ? x - last.x : 0, dy = last ? y - last.y : 0
        splat(x, y, dx * 0.75, dy * 0.75, 0.35 + Math.min(0.6, Math.hypot(dx, dy) * 0.02))
        last = { x, y }
      } else {
        last = null
        // The hint: a little dye at the closest edge, more the nearer you are, drifting inward
        const cx = Math.min(Math.max(x, 0), b.width), cy = Math.min(Math.max(y, 0), b.height)
        const range = parseFloat(getComputedStyle(document.documentElement).fontSize) * 18
        const near = Math.max(0, 1 - Math.hypot(x - cx, y - cy) / range)
        if (near <= 0) return
        touched = performance.now()
        splat(cx, cy, (cx - x) * 0.01 * near, (cy - y) * 0.01 * near, 0.12 * near ** 1.5)
      }
      start()
    }

    // ---- draw: only the grid lines, colored by the dye under them ----
    const metal = (p: number, sheen: number) => {
      // brushed metal: graphite to silver bands, a cool steel tint one way and a faint champagne the other;
      // faster flow catches the light (a brighter, cooler sheen)
      const band = 0.5 + 0.5 * Math.cos(2 * Math.PI * p)
      const tint = Math.sin(2 * Math.PI * p * 0.5 + 1.3)
      const l = Math.min(1, band * 0.7 + sheen * 0.4)
      const base = [80 + l * 104, 90 + l * 106, 110 + l * 104]
      // now and then a bluish silver-white highlight sweeps through the bands
      const hi = Math.pow(Math.max(0, Math.cos(2 * Math.PI * (p * 0.7 + 0.2))), 3) * 0.7
      const blue = [170, 190, 232]
      return [base[0] + tint * 6, base[1] + tint * 2, base[2] - tint * 4]
        .map((c, i) => c + (blue[i] - c) * hi)
        .map((c) => Math.round(Math.min(232, Math.max(80, c))))
    }
    const sample = (x: number, y: number) => {
      const i = Math.min(N, Math.max(1, Math.round(x / res + 0.5))), j = Math.min(M, Math.max(1, Math.round(y / res + 0.5)))
      return IX(i, j)
    }
    const seg = (x: number, y: number, horiz: boolean, t: number) => {
      const k = sample(horiz ? x + res / 2 : x, horiz ? y : y + res / 2)
      const a = Math.min(1, d[k] * 1.6) * 0.5 // kept subtle (the movement is unchanged)
      if (a < 0.02) return 0
      const speed = Math.hypot(u[k], v[k])
      let [r, g, b] = metal(x / w * 3.2 + y / h * 0.9 + d[k] * 0.6 + t * 0.00005, Math.min(1, speed * 0.25))
      // The shine: now and then a short glint, where the flow moves fast, the line flashes to near white
      const glint = Math.pow(Math.max(0, Math.sin(t * 0.0035 + x * 0.071 + y * 0.113)), 14) * Math.min(1, speed * 0.5)
      r += (248 - r) * glint; g += (250 - g) * glint; b += (255 - b) * glint
      // a soft 3px sheen around the line (the metal catching light), then the line itself
      ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${a * 0.1})`
      if (horiz) ctx.fillRect(x, y - 1, res, 3); else ctx.fillRect(x - 1, y, 3, res)
      ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${a})`
      if (horiz) ctx.fillRect(x, y, res, 1); else ctx.fillRect(x, y, 1, res)
      return a
    }
    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      let lit = 0
      // rows counted up from the bottom stroke, like the resting grid (index.css .alive-base)
      for (let y = h % cell; y < h; y += cell) for (let x = 0; x < w; x += res) lit += seg(x, y, true, t)
      for (let x = 0; x <= w; x += cell) for (let y = 0; y < h; y += res) lit += seg(x, y, false, t)
      return lit
    }

    let raf = 0, prev = 0
    const loop = (t: number) => {
      const dt = Math.min(0.033, (t - (prev || t)) / 1000) * 6
      prev = t
      step(dt || 0.1)
      const lit = draw(t)
      raf = lit > 0.05 || box.matches(":hover") ? requestAnimationFrame(loop) : 0
      if (!raf) { prev = 0; ctx.clearRect(0, 0, w, h) }
    }
    const start = () => { if (!raf) raf = requestAnimationFrame(loop) }

    // The idle pulse: now and then (first a few seconds in, then every 8 to 13s, each from a new place; never while you're on or near it, never in a hidden tab)
    // a soft stroke drifts across part of the header by itself, as if someone breathed on it, then fades
    let pulseTimer = 0, pulseRaf = 0, lastStart = { x: -1e4, y: -1e4 }
    const schedule = (first = false) => { pulseTimer = window.setTimeout(pulse, first ? 2500 + Math.random() * 1500 : 8000 + Math.random() * 5000) }
    const pulse = () => {
      if (document.hidden || box.matches(":hover") || performance.now() - touched < 6000 || !w) return schedule()
      // Shuffled: a new start each time, anywhere in the box (but not where the last one began), heading any way
      // that stays mostly inside, with its own length, curve and pace
      let x0 = 0, y0 = 0
      for (let k = 0; k < 8; k++) {
        x0 = w * (0.08 + Math.random() * 0.84); y0 = h * (0.2 + Math.random() * 0.6)
        if (Math.hypot(x0 - lastStart.x, y0 - lastStart.y) > w * 0.25) break
      }
      lastStart = { x: x0, y: y0 }
      const toCenter = Math.atan2(h / 2 - y0, w / 2 - x0)
      const angle = toCenter + (Math.random() - 0.5) * 2.2
      const len = Math.min(w * (0.18 + Math.random() * 0.2), 24 * cell)
      const ax = Math.cos(angle), ay = Math.sin(angle) * 0.35 // flatter: the box is wide and short
      const bend = (Math.random() - 0.5) * h * 0.3, waves = 0.8 + Math.random() * 1.2
      const t0 = performance.now(), dur = 750 + Math.random() * 400
      let px = x0, py = y0
      const stroke = (t: number) => {
        const p = Math.min(1, (t - t0) / dur), e = p * p * (3 - 2 * p)
        const x = x0 + ax * len * e, y = y0 + ay * len * e + Math.sin(e * Math.PI * waves) * bend
        splat(x, y, (x - px) * 0.45, (y - py) * 0.45, 0.16 * Math.sin(p * Math.PI))
        px = x; py = y
        start()
        if (p < 1) pulseRaf = requestAnimationFrame(stroke); else schedule()
      }
      pulseRaf = requestAnimationFrame(stroke)
    }
    schedule(true)

    size()
    const ro = new ResizeObserver(size)
    ro.observe(box)
    window.addEventListener("pointermove", move, { passive: true })
    return () => { cancelAnimationFrame(raf); cancelAnimationFrame(pulseRaf); clearTimeout(pulseTimer); ro.disconnect(); window.removeEventListener("pointermove", move) }
  }, [])
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 -z-1 size-full" />
}

/*
 * The page area of Figma "Frame 2147206359", exactly: a white header block (p 40, gap 12, #ECEBE9 line under it)
 * with the title (Geist Medium 20, line height 16, #121212) and the description (Geist 14/16, #6C6A68),
 * four 12px white squares with a #DDDCDA edge at the frame's own positions, and empty white space below.
 * Positions are relative to the area right of the sidebar, top bar included (the squares sit on the two lines).
 */
export function AgentsLibraryFrame() {
  const { navigate } = useNav()
  // The picked card's details in a drawer (shadcn Sheet): an agent's, or a sub agent's. Esc, ✕ or clicking outside closes it.
  // `picked` stays set while it slides out, so the drawer doesn't empty mid-animation; `open` drives the slide
  const [picked, setPicked] = useState<{ agent?: string; kind?: AgentKind; name: string } | null>(null)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"agents" | "subs">("agents")
  const switchTab = (t: typeof tab) => withTransition(() => { setTab(t); setOpen(false); setStackedOpen(false) })
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const list = (tab === "agents" ? library : subLibrary).filter((a) => !q || [a.name, a.tagline, ...a.outcomes.map((o) => o.label), ...a.runsOn].some((f) => f.toLowerCase().includes(q)))
  const pick = (a: LibraryAgent) => { setPicked(a.templateId ? { agent: a.templateId, name: a.name } : { kind: a.kind, name: a.name }); setOpen(true) }
  const close = () => setOpen(false)
  // An agent opened from a sub agent's "Part of" list: a second drawer stacked on the first, so closing it lands you back
  const [stacked, setStacked] = useState<string | null>(null)
  const [stackedOpen, setStackedOpen] = useState(false)
  const stackedAgent = stacked ? getSuperAgent(stacked) : undefined
  const agent = picked?.agent ? getSuperAgent(picked.agent) : undefined
  // The drawer's icon tile keeps the picked card's colour
  const pickedLib = [...library, ...subLibrary].find((a) => a.name === picked?.name)
  const look = useCardLook()
  const pickedColor = pickedLib ? (look === "a" ? ideaAColors[ideaIndex(pickedLib) % ideaAColors.length][0] : colorOf(pickedLib)) : undefined
  // The drawer's ↓ 1 / 9 ↑: steps through the cards on screen (this tab, after the search), in their order
  const at = list.findIndex((a) => a.name === picked?.name)
  const nav = { index: at, total: list.length, onPrev: () => at > 0 && pick(list[at - 1]), onNext: () => at < list.length - 1 && pick(list[at + 1]) }
  return (
    <div className="flex flex-1 flex-col items-start bg-white whitespace-nowrap">
      <div className="alive-box relative isolate flex w-full flex-col items-start justify-center gap-3 overflow-hidden border-b border-[#ecebe9] bg-white p-10">
        <span aria-hidden className="alive-noise" />
        <span aria-hidden className="alive-base" />
        <FluidGrid />
        <p className="text-[1.25rem] leading-4 font-medium text-[#121212]">Agents Library</p>
        <p className="max-w-full truncate text-[0.875rem] leading-4 font-normal text-[#6c6a68]">
          Ready-made security agents by Rival. Pick one, make it yours in a short chat, and it joins My Agents.
        </p>
      </div>
      {/* Agents | Sub Agents: a row of tabs under the header, its own line below */}
      <div className="flex w-full items-center gap-2 border-b border-[#ecebe9] py-2 pr-4 pl-10">
        <div role="tablist" aria-label="Library" className="flex items-center gap-2">
          {([["agents", "Agents"], ["subs", "Sub Agents"]] as const).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => switchTab(id)} className="lib-tab">{label}</button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-4">
          <CardLookSwitch />
          <LibrarySearch value={query} onChange={setQuery} />
        </div>
      </div>
      {/* The cards area: plain white space around the cards, nothing in the margins */}
      <div className="relative flex w-full flex-1">
        {/* Always 3 to a row, centered, the cards 342px at most (71.125rem), on any screen size. The drawer slides over them, nothing reflows */}
        <div className="mx-auto grid max-w-[71.125rem] min-w-0 flex-1 content-start gap-4 px-10 pt-6 pb-10 grid-cols-[repeat(3,minmax(0,1fr))]">
          {list.map((a) => <AgentCard key={a.name} a={a} selected={open && picked?.name === a.name} onSelect={() => pick(a)} />)}
          {list.length === 0 && (
            <p className="col-span-full py-10 text-center text-[0.875rem] leading-5 whitespace-normal text-[#6c6a68]">
              Nothing matches “{query.trim()}”. <button onClick={() => setQuery("")} className="cursor-pointer text-[#2e4eca] hover:underline">Clear search</button>
            </p>
          )}
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent showCloseButton={false} aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()} className="w-full gap-0 overflow-hidden border-[#ecebe9] p-0 whitespace-normal sm:max-w-[35rem]">
          <SheetTitle className="sr-only">{picked?.name}</SheetTitle>
          {agent
            ? <TemplateDetail key={agent.id} sa={agent} color={pickedColor} nav={nav} {...drawerProps(pickedLib)} onUse={(sa) => navigate("chat", { superAgentId: sa.id, startChat: true })} onClose={close} />
            : picked?.kind && <SubAgentDetail key={picked.name} kind={picked.kind} color={pickedColor} categories={pickedLib && metaOf(pickedLib).categories} nav={nav} template onClose={close} onOpenAgent={(sa) => { setStacked(sa.id); setStackedOpen(true) }} />}
        </SheetContent>
      </Sheet>
      {/* Narrower than the first, so the first drawer's edge stays in sight underneath; its overlay only adds a light dim */}
      <Sheet open={stackedOpen} onOpenChange={setStackedOpen}>
        <SheetContent showCloseButton={false} aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()} overlayClassName="bg-white/40 dark:bg-black/15" className="w-full gap-0 overflow-hidden border-[#ecebe9] p-0 whitespace-normal sm:max-w-[32rem]">
          <SheetTitle className="sr-only">{stackedAgent?.name}</SheetTitle>
          {stackedAgent && <TemplateDetail key={stackedAgent.id} sa={stackedAgent} {...drawerProps(library.find((l) => l.templateId === stackedAgent.id))} onUse={(sa) => navigate("chat", { superAgentId: sa.id, startChat: true })} onClose={() => setStackedOpen(false)} />}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// While we explore card ideas: Current · Idea A · Idea B, as small tabs left of Search (remembered in this browser)
function CardLookSwitch() {
  const look = useCardLook()
  const opts: [CardLook, string][] = [["current", "Current"], ["a", "Idea A"], ["b", "Idea B"]]
  return (
    <div role="tablist" aria-label="Card idea" className="flex items-center gap-1">
      <span className="mr-1 text-[0.75rem] leading-4 text-[#a2a4a8]">Card</span>
      {opts.map(([id, label]) => (
        <button key={id} role="tab" aria-selected={look === id} disabled={id === "b"} title={id === "b" ? "Coming next" : undefined} onClick={() => withTransition(() => setCardLook(id))}
          className="lib-tab !h-6 !text-[0.75rem] disabled:cursor-default disabled:opacity-40 disabled:hover:border-transparent disabled:hover:bg-transparent">
          {label}
        </button>
      ))}
    </div>
  )
}

/*
 * Search, on the right of the tabs: a secondary button (white, hairline edge, soft shadow, like Ask Rival) that
 * widens into a field when clicked and filters the cards as you type (name, tagline, outcomes, what it runs on).
 * Esc, ✕, or clicking away while empty folds it back into the button. "/" opens it from anywhere on the page.
 */
function LibrarySearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const show = () => { setOpen(true); requestAnimationFrame(() => input.current?.focus()) }
  const hide = () => { onChange(""); setOpen(false) }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea, [contenteditable]")
      if (e.key === "/" && !typing) { e.preventDefault(); show() }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
  return (
    <div
      className={cn(
        "ml-auto flex h-6 items-center gap-1.5 overflow-hidden rounded-[0.25rem] border border-[#ecebe9] bg-white pl-1.5 text-[0.75rem] leading-4 text-[#121212] drop-shadow-[0px_1px_0.5px_rgba(119,131,152,0.2)] transition-[width,border-color] duration-300 ease-[cubic-bezier(.3,.7,.15,1)]",
        open ? "w-64 border-[#dddcda] pr-1" : "w-[4.75rem] cursor-pointer pr-2 hover:border-[#dddcda] hover:bg-[#fcfcfa]",
      )}
      onClick={() => !open && show()}
    >
      <Search className="size-3.5 shrink-0 text-[#6c6a68]" />
      {open ? <>
        <input
          ref={input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); hide() } }}
          onBlur={() => { if (!value.trim()) setOpen(false) }}
          placeholder="Search agents"
          aria-label="Search agents"
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#9a9893]"
        />
        <button onMouseDown={(e) => e.preventDefault()} onClick={hide} aria-label="Close search" className="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[0.1875rem] text-[#9a9893] hover:bg-[#f4f4f2] hover:text-[#6c6a68]">
          <X className="size-3" />
        </button>
      </> : <span className="whitespace-nowrap">Search</span>}
    </div>
  )
}

// The four squares, on the top bar's line and the header's line, at both ends (as in the frame).
// The right pair goes while the side panel covers that side. Not shown for now (felt like noise);
// to bring them back, render <FrameCorners right={!open} /> in AgentsLibraryFrame.
export function FrameCorners({ right }: { right: boolean }) {
  const sq = "absolute size-3 border border-[#dddcda] bg-white"
  return (
    <>
      <div aria-hidden className={sq} style={{ left: -1, top: "10.4375rem" }} />
      <div aria-hidden className={sq} style={{ left: -1, top: "2.625rem" }} />
      {right && <div aria-hidden className={sq} style={{ right: 0, top: "2.625rem" }} />}
      {right && <div aria-hidden className={sq} style={{ right: -1, top: "10.4375rem" }} />}
    </>
  )
}

/*
 * The library: Triage Hunter (the demo's own multi-step agent), then the product's built-in agents
 * (the real Agents page on dev): their outcomes and what they run on, as there. Taglines shortened to fit the card.
 */
// kind: the sub agent whose panel it opens (closest match in the demo); templateId: an agent with its own panel
type LibraryAgent = { name: string; tagline: string; icon: LucideIcon; outcomes: Outcome[]; runsOn: string[]; templateId?: string; kind?: AgentKind; partOf?: number }
const exploit: Outcome[] = [{ label: "Exploitable", tone: "risk" }, { label: "Not exploitable", tone: "clear" }, { label: "Unclear", tone: "unclear" }]
const triage = getSuperAgent("triage")!
const library: LibraryAgent[] = [
  { name: triage.name, tagline: triage.tagline, icon: triage.icon, outcomes: agentOutcomes.triage.filter((o) => o.label !== "Failed"), runsOn: ["CVE", "SAST"], templateId: "triage" },
  { name: "Code CVE Exploitability", tagline: "Checks if a CVE in a code dependency is really exploitable.", icon: Crosshair, outcomes: exploit, runsOn: ["CVE"], kind: "exploitability" },
  { name: "Cloud Exploitability", tagline: "Checks if a cloud scanner finding is really exploitable.", icon: Crosshair, outcomes: exploit, runsOn: ["CVE"], kind: "exploitability" },
  { name: "Code SAST Exploitability", tagline: "Traces a SAST finding to see if it's really reachable.", icon: Crosshair, outcomes: exploit, runsOn: ["SAST"], kind: "exploitability" },
  { name: "Red Team Simulation", tagline: "Reproduces a finding with an isolated proof of concept.", icon: Swords, outcomes: [{ label: "Exploit demonstrated", tone: "risk" }, { label: "Not reproduced", tone: "unclear" }], runsOn: ["CVE", "SAST"], kind: "red-team" },
  { name: "Finding Ownership", tagline: "Finds the person or team that should own the fix.", icon: UsersRound, outcomes: [], runsOn: ["CVE", "SAST", "Secret"], kind: "ownership" },
  { name: "WAF Analysis", tagline: "Checks if WAF rules block a finding's ingress path.", icon: ShieldCheck, outcomes: [{ label: "Irrelevant", tone: "unclear" }, { label: "Mitigated", tone: "clear" }, { label: "Suggestion", tone: "warn" }], runsOn: ["CVE", "SAST"], kind: "exploitability" },
  { name: "Remediation", tagline: "Fixes a finding in a sandbox copy of the repository.", icon: Bandage, outcomes: [{ label: "Easy", tone: "clear" }, { label: "Medium", tone: "warn" }, { label: "Hard", tone: "risk" }], runsOn: ["CVE", "SAST"], kind: "remediation" },
  { name: "Secret Validation", tagline: "Decides if a leaked secret is real or a false positive.", icon: KeyRound, outcomes: [{ label: "Yes", tone: "risk" }, { label: "No", tone: "good" }], runsOn: ["Secret"], kind: "data-leak" },
  { name: "App Inventory", tagline: "Discovers every deployable app and shared library.", icon: AppWindow, outcomes: [], runsOn: ["Branch"], kind: "asset-discovery" },
  { name: "Deployment Mapping", tagline: "Maps non-containerized apps to their cloud workloads.", icon: Cloud, outcomes: [], runsOn: [], kind: "asset-discovery" },
]

// The Sub Agents tab: the demo's single-mission agents (components/chat/agents.ts), with the agents they're part of
const subLibrary: LibraryAgent[] = (Object.keys(agents) as AgentKind[]).map((k) => ({
  name: subName(k), tagline: agents[k].role + ".", icon: agents[k].icon, kind: k,
  outcomes: (subOutcomes[k] ?? []).filter((o) => o.label !== "Failed"), runsOn: [], partOf: usedBy(k).length,
}))

// Each tile's hue: one per agent, never repeated (golden-angle steps from Rival blue)
const hues = new Map([...library, ...subLibrary].map((a, i) => [a, (255 + i * 137.508) % 360]))
const hueOf = (a: LibraryAgent) => hues.get(a) ?? 255

/*
 * Trying a second look: one colour per agent as an accent (ColorTile, components/tasks/color-tile.tsx, also in the
 * drawers), one of the 21 per agent, in order.
 * Switch TILE_STYLE back to "gradient" for the grainy gradients.
 */
const TILE_STYLE: "flat" | "gradient" = "flat"
const colors = new Map([...library, ...subLibrary].map((a, i) => [a, flatColors[i % flatColors.length]]))
const colorOf = (a: LibraryAgent) => colors.get(a) ?? flatColors[0]
// Shared with every other place an agent's icon shows (color-tile.tsx), so an agent keeps its colour across the demo
for (const [a, c] of colors) { registerColor(a.name, c); if (a.partOf !== undefined && a.kind) registerColor(`sub:${a.kind}`, c) }

// The card's colour mark: a small square in the agent's colour with a white square in the middle
function FlatTile({ color }: { color: string }) {
  return (
    <span aria-hidden className="tile-gloss grid size-11 shrink-0 place-items-center rounded-[0.25rem]" style={{ background: color }}>
      <span className="size-3 rounded-[0.125rem] bg-white" />
    </span>
  )
}


/*
 * An agent's tile: a soft gradient under heavy film grain in the agent's own colour, with a white circle in the middle.
 * Every agent gets a different hue (spread around the colour wheel by the golden angle, in the order of the
 * library: agents, then sub agents), so no two share a gradient; that hue is meant to become the agent's colour.
 * Each gradient mixes the hue with two neighbours and a lighter tint of it, in muted, deeper tones (oklch).
 */
const grain = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.25' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncR type='linear' slope='2.4' intercept='-0.7'/%3E%3CfeFuncG type='linear' slope='2.4' intercept='-0.7'/%3E%3CfeFuncB type='linear' slope='2.4' intercept='-0.7'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='96' height='96' filter='url(%23g)'/%3E%3C/svg%3E")`
const hash = (t: string) => { let h = 2166136261; for (const c of t) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0 }

function AgentTile({ seed, hue }: { seed: string; hue: number }) {
  const h = hash(seed)
  const r = (k: number) => ((h >>> (k * 4)) & 15) / 15 // 0..1, fixed per agent: where its colour pools sit
  // Muted and deep: low chroma, mid-to-dark tones, so the colour has depth without shouting
  const tint = `oklch(0.8 0.03 ${hue})`
  const main = `oklch(0.56 0.07 ${hue})`
  const warm = `oklch(0.68 0.055 ${hue + 38})`
  const deep = `oklch(0.38 0.065 ${hue - 34})`
  const pools = [
    `radial-gradient(circle at ${5 + r(1) * 35}% ${5 + r(2) * 35}%, ${warm} 0%, transparent 85%)`,
    `radial-gradient(circle at ${60 + r(3) * 40}% ${50 + r(4) * 50}%, ${deep} 0%, transparent 80%)`,
    `radial-gradient(circle at ${r(5) * 100}% ${70 + r(6) * 30}%, ${main} 0%, transparent 75%)`,
    `radial-gradient(circle at ${70 + r(7) * 30}% ${r(0) * 30}%, ${tint} 0%, transparent 55%)`,
  ].join(", ")
  return (
    <span aria-hidden className="relative isolate grid size-12 shrink-0 place-items-center overflow-hidden rounded-[0.375rem]" style={{ background: `${pools}, linear-gradient(135deg, ${warm}, ${main} 55%, ${deep})` }}>
      {/* Film grain: high-contrast noise, overlaid twice (overlay for texture, soft-light for depth) */}
      <span className="absolute inset-0 opacity-65 mix-blend-overlay" style={{ background: `${grain} 0 0 / 48px 48px` }} />
      <span className="absolute inset-0 opacity-40 mix-blend-soft-light" style={{ background: `${grain} 13px 7px / 40px 40px` }} />
      <span className="relative size-5 rounded-full bg-white shadow-[0_1px_2px_rgba(18,18,18,0.08)]" />
    </span>
  )
}

/*
 * An agent card (the design: Figma "Frame 2147206365", Triage Hunter, 342px wide). White, a #ECEBE9 hairline drawn
 * inside the edge (an outline, so it takes no room), 6px corners, 16px padding.
 *   Top:    the agent's colour tile (44px, a 12px white square in the middle); beside it the name (Geist 16 medium,
 *           #121212) over its categories (soft grey tags, name only), then the description (14/20, #6C6A68, always two lines tall)
 *   Footer: under a hairline, three columns spread edge to edge: Created by (Rival mark + "Rival") · Capabilities
 *           (their icons in grey circles, names on hover; components/capability.tsx) · Context (the tools it reads from, their logos alone, 16px; names on hover).
 *           Labels Geist 11 uppercase #A2A4A8, values 14 #121212. One line, never wraps.
 * Click: opens its side panel.
 */
type Tool = "wiz" | "snyk" | "github" | "defender" | "paloalto" | "semgrep" | "okta"
// category: one or two; ctx: the integrations it pulls its data from (sources only)
type Meta = { categories: string[]; cap: Capability[]; ctx: Tool[] }
const meta: Record<string, Meta> = {
  "Triage Hunter": { categories: [APP, VM], cap: ["memory", "graph"], ctx: ["defender", "okta", "paloalto"] },
  "Code CVE Exploitability": { categories: [VM, APP], cap: ["graph", "sandbox"], ctx: ["snyk", "github"] },
  "Cloud Exploitability": { categories: [CLOUD, VM], cap: ["graph", "internet"], ctx: ["wiz", "defender", "paloalto"] },
  "Code SAST Exploitability": { categories: [APP], cap: ["graph", "sandbox"], ctx: ["semgrep", "github"] },
  "Red Team Simulation": { categories: [THREATS, APP], cap: ["sandbox", "internet"], ctx: ["snyk", "semgrep", "wiz"] },
  "Finding Ownership": { categories: [VM], cap: ["memory", "graph"], ctx: ["github", "wiz"] },
  "WAF Analysis": { categories: [CLOUD, THREATS], cap: ["sandbox", "internet"], ctx: ["paloalto", "wiz"] },
  "Remediation": { categories: [VM, APP], cap: ["memory", "sandbox"], ctx: ["github", "snyk", "semgrep"] },
  "Secret Validation": { categories: [APP, THREATS], cap: ["sandbox", "internet"], ctx: ["github", "semgrep"] },
  "App Inventory": { categories: [APP, GRC], cap: ["graph"], ctx: ["github", "wiz"] },
  "Deployment Mapping": { categories: [CLOUD, APP], cap: ["graph"], ctx: ["wiz", "github"] },
}
const subMeta: Partial<Record<AgentKind, Meta>> = {
  exploitability: { categories: [VM, APP], cap: ["graph", "sandbox"], ctx: ["snyk", "wiz"] },
  remediation: { categories: [VM], cap: ["sandbox"], ctx: ["github", "snyk"] },
  "threat-intel": { categories: [THREATS], cap: ["memory", "internet"], ctx: ["defender", "paloalto"] },
  "red-team": { categories: [THREATS, APP], cap: ["sandbox", "internet"], ctx: ["semgrep", "wiz"] },
  "asset-discovery": { categories: [CLOUD], cap: ["graph"], ctx: ["wiz", "github"] },
  ownership: { categories: [VM], cap: ["memory", "graph"], ctx: ["github"] },
  "data-leak": { categories: [APP, THREATS], cap: ["internet"], ctx: ["defender", "paloalto"] },
  reporting: { categories: [GRC], cap: ["memory"], ctx: ["wiz", "snyk"] },
  correlation: { categories: [VM], cap: ["memory", "graph"], ctx: ["wiz", "snyk", "semgrep"] },
  prioritization: { categories: [VM], cap: ["memory", "graph"], ctx: ["wiz", "defender"] },
}
const metaOf = (a: LibraryAgent): Meta =>
  meta[a.name] ?? ((a.partOf !== undefined && a.kind && subMeta[a.kind]) || { categories: [VM], cap: ["memory"], ctx: ["github"] })

// What an agent's drawer shows as Category, Capabilities and Context: the same as its card
const drawerProps = (a?: LibraryAgent) => {
  if (!a) return {}
  const m = metaOf(a)
  return {
    categories: m.categories,
    capabilities: <CapabilityMarks caps={m.cap} />,
    context: <span className="flex items-center gap-1.5">{m.ctx.map((t) => <ToolMark key={t} tool={t} />)}</span>,
  }
}

// Small marks for the tools an agent reads from, in each tool's colours (simplified, not the official logos)
const toolNames: Record<Tool, string> = { wiz: "Wiz", snyk: "Snyk", github: "GitHub", defender: "Microsoft Defender", paloalto: "Palo Alto Prisma", semgrep: "Semgrep", okta: "Okta" }
function ToolMark({ tool }: { tool: Tool }) {
  const art: Record<Exclude<Tool, "okta">, React.ReactNode> = {
    defender: <path d="M8 1.2 2.6 3.1v4.3c0 3.4 2.3 6.1 5.4 7.4 3.1-1.3 5.4-4 5.4-7.4V3.1L8 1.2Zm-.6 2.1v4.4H3.8V4.1l3.6-.8Zm1.2 0 3.6.8v3.6H8.6V3.3ZM3.9 8.9h3.5v4.2C5.5 12.1 4.2 10.6 3.9 8.9Zm4.7 0h3.5c-.3 1.7-1.6 3.2-3.5 4.2V8.9Z" fill="#0078d4" />,
    paloalto: <g fill="#fa582d"><path d="m6.2 2.4 3 3-5.3 5.3-3-3z" /><path d="m11.1 5.3 3 3-5.3 5.3-3-3z" /></g>,
    wiz: <><rect x="1" y="1" width="14" height="14" rx="3.5" fill="#1b4dff" /><text x="8" y="11.6" textAnchor="middle" fontSize="9.5" fontWeight="800" fontFamily="Geist, sans-serif" fill="#fff">W</text></>,
    snyk: <><rect x="1" y="1" width="14" height="14" rx="3.5" fill="#4c4a73" /><text x="8" y="11.6" textAnchor="middle" fontSize="9.5" fontWeight="800" fontFamily="Geist, sans-serif" fill="#fff">S</text></>,
    semgrep: <><circle cx="8" cy="8" r="7" fill="#2bc28a" /><circle cx="8" cy="8" r="2.6" fill="#fff" /></>,
    github: <><circle cx="8" cy="8" r="6.6" fill="#24292f" /><path d="M6.2 11.6v-1.4c-1.6.3-2-.7-2-.7-.3-.7-.7-.9-.7-.9-.6-.4 0-.4 0-.4.6 0 1 .7 1 .7.5.9 1.4.7 1.7.5 0-.4.2-.7.4-.8-1.3-.1-2.6-.6-2.6-2.8 0-.6.2-1.1.6-1.5-.1-.2-.3-.8 0-1.5 0 0 .5-.2 1.6.6a5.4 5.4 0 0 1 2.9 0c1.1-.8 1.6-.6 1.6-.6.3.7.1 1.3 0 1.5.4.4.6.9.6 1.5 0 2.2-1.3 2.7-2.6 2.8.2.2.4.5.4 1v1.9" fill="#fff" /></>,
  }
  if (tool === "okta") return <span title={toolNames.okta} className="relative size-4 shrink-0">{figmaLogos.okta}</span>
  return (
    <span title={toolNames[tool]} className="grid size-4 shrink-0 place-items-center">
      <svg viewBox="0 0 16 16" className="size-4" role="img" aria-label={toolNames[tool]}>{art[tool]}</svg>
    </span>
  )
}

// Idea A's context logos: the design's own three where they exist, else the same marks as above, 14px
function IdeaALogo({ tool }: { tool: Tool }) {
  if (tool === "defender" || tool === "okta" || tool === "paloalto") return figmaLogos[tool]
  return <span className="absolute inset-0"><ToolMarkArt tool={tool} /></span>
}
function ToolMarkArt({ tool }: { tool: Exclude<Tool, "okta" | "defender" | "paloalto"> }) {
  const m = <ToolMark tool={tool} />
  return <span className="[&>span]:size-3.5 [&_svg]:size-3.5">{m}</span>
}
// An agent's index in the library (agents, then sub agents): its colour and mark in idea A
const ideaIndex = (a: LibraryAgent) => { const i = [...library, ...subLibrary].indexOf(a); return i >= 0 ? i : hash(a.name) % ideaAColors.length }

/*
 * The cards' hover, after the reference video: the card turns toward the pointer in real perspective (6° at most),
 * lifts a little, and its shadow grows and leans away. Light comes from a fixed source (top left): the agent's
 * colour square catches it as a soft highlight that moves as the card turns, and the paper only shades faintly on
 * the side turning away. Eases back flat on leave. Styles: .tilt-card in index.css.
 */
function useTilt() {
  const still = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const set = (el: HTMLElement, x: number, y: number) => {
    el.style.setProperty("--rx", `${(-y * 6).toFixed(2)}deg`)
    el.style.setProperty("--ry", `${(x * 6).toFixed(2)}deg`)
    // where the light falls (from the top left): it moves against the tilt, like a fixed source on a turning surface
    el.style.setProperty("--bx", `${(35 - x * 30).toFixed(1)}%`)
    el.style.setProperty("--by", `${(30 - y * 30).toFixed(1)}%`)
    el.style.setProperty("--sx", `${(-x * 6).toFixed(1)}px`)
    el.style.setProperty("--sy", `${(8 - y * 4).toFixed(1)}px`)
  }
  return still ? {} : {
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const b = e.currentTarget.getBoundingClientRect()
      set(e.currentTarget, ((e.clientX - b.left) / b.width) * 2 - 1, ((e.clientY - b.top) / b.height) * 2 - 1)
    },
    onPointerLeave: (e: React.PointerEvent<HTMLElement>) => set(e.currentTarget, 0, 0),
  }
}

// mine: on My Agents: its status chip top right, you (IB) as Created by on your own agents, and switched off
// (Enabled, in the drawer's header) everything but the chip fades back. Look-up keys: `from` = the library card it's
// a copy of (same colour, category, capabilities), else its own name.
function AgentCard({ a, from = a, selected, onSelect, mine }: {
  a: LibraryAgent; from?: LibraryAgent; selected: boolean; onSelect: () => void
  mine?: { status: TaskStatus; enabledKey: string; you?: boolean }
}) {
  const tilt = useTilt()
  const m = metaOf(from)
  const tint = colors.has(from) ? colorOf(from) : colorFor(a.name)
  const { isEnabled } = useEnabled()
  const off = !!mine && !isEnabled(mine.enabledKey)
  const look = useCardLook()
  if (look === "a") return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      {...tilt}
      className="tilt-card group relative flex h-[12.5625rem] cursor-pointer flex-col items-stretch overflow-hidden rounded-[4px] border border-solid border-[#f0f0f0] bg-white text-left whitespace-nowrap hover:border-[#e4e4e4] aria-pressed:border-[#2e4eca]/40"
    >
      <span aria-hidden className="tilt-light" />
      <span className={cn("flex w-full flex-1 flex-col items-start justify-between gap-3 p-5 transition-opacity", off && "opacity-50")}>
        <span className="flex w-full min-w-0 items-center gap-3.5">
          <IdeaAMark index={ideaIndex(from)} size={60} />
          <span className="flex min-w-0 flex-1 flex-col justify-center gap-2">
            <span className="flex w-full min-w-0 items-center">
              <span className="min-w-0 flex-1 truncate text-[1rem] leading-4 font-medium text-[#121212]">{a.name}</span>
              {mine && <span className="mr-2 shrink-0"><StatusChip status={mine.status} /></span>}
              <span className="flex shrink-0 items-center">
                {m.ctx.map((t, i) => <IdeaALogoChip key={t} name={toolNames[t]} last={i === m.ctx.length - 1}><IdeaALogo tool={t} /></IdeaALogoChip>)}
              </span>
            </span>
            <span className="flex min-w-0 items-start gap-1.5 overflow-hidden">
              {m.categories.map((c) => <IdeaATag key={c}>{c}</IdeaATag>)}
            </span>
          </span>
        </span>
        <span className="line-clamp-2 min-h-10 w-full text-[0.875rem] leading-5 whitespace-normal text-pretty text-[#6c6a68]">{a.tagline}</span>
      </span>
    </button>
  )
  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      {...tilt}
      style={{ "--tint": tint } as React.CSSProperties}
      className="tilt-card group relative flex cursor-pointer flex-col items-stretch overflow-hidden rounded-[0.375rem] bg-white text-left whitespace-nowrap outline-1 -outline-offset-1 outline-[#ecebe9] hover:outline-[#dddcda] aria-pressed:outline-[#2e4eca]/40"
    >
      <span aria-hidden className="tilt-light" />
      <span className="flex flex-col items-start gap-3 px-4 pt-4 pb-3">
        <span className="flex w-full min-w-0 items-start gap-3">
          <span className={cn("flex min-w-0 flex-1 items-start gap-3 transition-opacity", off && "opacity-50")}>
            {TILE_STYLE === "flat" ? <FlatTile color={tint} /> : <AgentTile seed={a.name} hue={hueOf(from)} />}
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-[1rem] leading-5 font-medium text-[#121212]">{a.name}</span>
              <span className="flex min-w-0 items-center gap-1 overflow-hidden">
                {m.categories.map((c) => <CategoryTag key={c} category={c} />)}
              </span>
            </span>
          </span>
          {mine && <StatusChip status={mine.status} />}
        </span>
        <span className={cn("line-clamp-2 min-h-10 text-[0.875rem] leading-5 whitespace-normal text-pretty text-[#6c6a68] transition-opacity", off && "opacity-50")}>{a.tagline}</span>
      </span>
      <span className={cn("mt-auto flex items-start justify-between gap-4 border-t border-[#ecebe9] px-4 pt-4 pb-4 whitespace-nowrap transition-opacity", off && "opacity-50")}>
        <span className="flex flex-col gap-2">
          <span className="text-[0.6875rem] leading-4 text-[#a2a4a8] [text-transform:uppercase]">Created by</span>
          <span className="flex h-5 items-center gap-2 text-[0.875rem] leading-5 text-[#121212]">
            {mine?.you
              ? <><Avatar className="size-4" title="Created by you"><AvatarFallback className="text-[7px] font-semibold">IB</AvatarFallback></Avatar>You</>
              : <><RivalMark className="-mx-1.5 size-6 shrink-0 text-[#0350d0]" />Rival</>}
          </span>
        </span>
        <span className="flex min-w-0 flex-col gap-2">
          <span className="truncate text-[0.6875rem] leading-4 text-[#a2a4a8] [text-transform:uppercase]">Capabilities</span>
          <span className="-my-0.5 flex h-6 items-center"><CapabilityMarks caps={m.cap} /></span>
        </span>
        <span className="flex flex-col items-end gap-2">
          <span className="text-[0.6875rem] leading-4 text-[#a2a4a8] [text-transform:uppercase]">Context</span>
          <span className="flex h-5 items-center gap-1.5">{m.ctx.map((t) => <ToolMark key={t} tool={t} />)}</span>
        </span>
      </span>
    </button>
  )
}

// The drawers on My Agents (pages/gallery.tsx) show the same as the library's: by the agent it's a copy of
export const agentDrawerProps = (sa: SuperAgent) => drawerProps(library.find((l) => l.templateId === (sa.clonedFrom ?? sa.id)))
export const subCategories = (kind: AgentKind) => { const a = subLibrary.find((l) => l.kind === kind); return a ? metaOf(a).categories : undefined }

// The same card on My Agents (pages/gallery.tsx), so an agent looks the same everywhere in the demo
export function MyAgentCard({ sa, status, selected, onSelect }: { sa: SuperAgent; status: TaskStatus; selected: boolean; onSelect: () => void }) {
  const from = library.find((l) => l.templateId === (sa.clonedFrom ?? sa.id))
  const a: LibraryAgent = { name: sa.name, tagline: sa.tagline, icon: sa.icon, outcomes: from?.outcomes ?? [], runsOn: from?.runsOn ?? [], templateId: sa.id }
  return <AgentCard a={a} from={from} selected={selected} onSelect={onSelect} mine={{ status, enabledKey: sa.id, you: true }} />
}
export function MySubAgentCard({ kind, status, selected, onSelect }: { kind: AgentKind; status: TaskStatus; selected: boolean; onSelect: () => void }) {
  const a = subLibrary.find((l) => l.kind === kind)!
  return <AgentCard a={a} selected={selected} onSelect={onSelect} mine={{ status, enabledKey: `sub:${kind}` }} />
}
