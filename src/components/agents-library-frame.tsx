import { useEffect, useRef, useState } from "react"
import { Activity, AppWindow, Bandage, Box, Brain, Cloud, Combine, Crosshair, FileSearch, FileText, Fingerprint, FolderSearch, GitBranch, GitPullRequest, KeyRound, Network, Radar, Search, ShieldCheck, Swords, UsersRound, X, type LucideIcon } from "lucide-react"
import { agentOutcomes, subOutcomes, type Outcome } from "@/data/outcomes"
import { getSuperAgent } from "@/data/super-agents"
import { RivalMark } from "@/components/nav-icons"
import { useNav } from "@/lib/nav"
import { agents, type AgentKind } from "@/components/chat/agents"
import { SubAgentDetail, subName, usedBy } from "@/components/tasks/sub-agent-card"
import { TemplateDetail } from "@/components/tasks/template-detail"
import { withTransition } from "@/lib/view-transition"
import { cn } from "@/lib/utils"

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
  // The picked card's side panel (the Hex version's docked panel): an agent's, or a sub agent's. Esc or ✕ closes it
  const [picked, setPicked] = useState<{ agent?: string; kind?: AgentKind; name: string } | null>(null)
  const [tab, setTab] = useState<"agents" | "subs">("agents")
  const switchTab = (t: typeof tab) => withTransition(() => { setTab(t); setPicked(null) })
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const list = (tab === "agents" ? library : subLibrary).filter((a) => !q || [a.name, a.tagline, ...a.outcomes.map((o) => o.label), ...a.runsOn].some((f) => f.toLowerCase().includes(q)))
  const pick = (a: LibraryAgent) => withTransition(() => setPicked(a.templateId ? { agent: a.templateId, name: a.name } : { kind: a.kind, name: a.name }))
  const close = () => withTransition(() => setPicked(null))
  useEffect(() => {
    if (!picked) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [picked])
  const agent = picked?.agent ? getSuperAgent(picked.agent) : undefined
  return (
    // With a panel open, the page makes room for it (the panel takes the whole right side, under the top bar)
    <div className={cn("flex flex-1 flex-col items-start bg-white whitespace-nowrap", picked && "mr-[35rem]")}>
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
        <LibrarySearch value={query} onChange={setQuery} />
      </div>
      {/* The cards area: plain white space around the cards, nothing in the margins */}
      <div className="relative flex w-full flex-1">
        {/* Smaller screens (under 1800px): centered, 3 to a row (68rem at most). Big screens: in line with the title and
            the tabs, filling the width between the strips (4 or more to a row). Beside the panel: as many as fit */}
        <div className={cn("grid min-w-0 flex-1 content-start gap-4 pt-6 pb-10", picked
          ? "mx-8 grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] px-2"
          : "mx-auto max-w-[68rem] grid-cols-[repeat(3,minmax(0,1fr))] px-10 min-[1800px]:mx-8 min-[1800px]:max-w-none min-[1800px]:grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] min-[1800px]:px-2")}>
          {list.map((a) => <AgentCard key={a.name} a={a} selected={picked?.name === a.name} onSelect={() => pick(a)} />)}
          {list.length === 0 && (
            <p className="col-span-full py-10 text-center text-[0.875rem] leading-5 whitespace-normal text-[#6c6a68]">
              Nothing matches “{query.trim()}”. <button onClick={() => setQuery("")} className="cursor-pointer text-[#2e4eca] hover:underline">Clear search</button>
            </p>
          )}
        </div>
      </div>
      {picked && (
        // The whole right side, from the top bar down, and stays put while the cards scroll
        <section aria-label={picked.name} className="fixed top-12 right-0 bottom-0 z-30 w-[35rem] overflow-hidden border-l border-[#ecebe9] bg-background whitespace-normal" style={{ viewTransitionName: "template-detail" }}>
            {agent
              ? <TemplateDetail key={agent.id} sa={agent} onUse={(sa) => navigate("chat", { superAgentId: sa.id, startChat: true })} onClose={close} />
              : picked.kind && <SubAgentDetail key={picked.name} kind={picked.kind} template onClose={close} onOpenAgent={(sa) => withTransition(() => setPicked({ agent: sa.id, name: sa.name }))} />}
        </section>
      )}
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
// to bring them back, render <FrameCorners right={!picked} /> in AgentsLibraryFrame.
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
 * Trying a second look: one flat colour per agent (no gradient, no grain), with the white circle. The colours
 * grow from a warm, muted four (sage, slate blue, ochre, brick) into a family of 21, one per agent, in order.
 * Switch TILE_STYLE back to "gradient" for the grainy gradients.
 */
const TILE_STYLE: "flat" | "gradient" = "flat"
const flatColors = [
  "#4f8a5f", "#3e6f8e", "#cf9f45", "#b85a55", // sage, slate blue, ochre, brick (the reference)
  "#6a7f4a", "#2f7a78", "#c47a4a", "#8a6aa0", // olive, teal, terracotta, dusty violet
  "#5a6f9e", "#a3835a", "#9a4f6a", "#6e9a8a", // denim, camel, mulberry, eucalyptus
  "#d08a5e", "#4a5d7a", "#8f9a4f", "#b86a7a", // apricot, navy slate, moss, rose
  "#5f8fae", "#a35d3e", "#7a8f6a", "#c2a35e", // steel, rust, lichen, soft mustard
  "#6a5a8a", // plum
]
const colors = new Map([...library, ...subLibrary].map((a, i) => [a, flatColors[i % flatColors.length]]))
const colorOf = (a: LibraryAgent) => colors.get(a) ?? flatColors[0]

function FlatTile({ color }: { color: string }) {
  return (
    <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-[0.375rem]" style={{ background: color }}>
      <span className="size-3.5 rounded-[0.1875rem] bg-white" />
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
 * An agent card (the design: Figma "Triage Hunter" card). White, a #ECEBE9 hairline, 6px corners, 24px padding.
 *   Top:    the agent's colour tile (40px, a white rounded square in the middle) and its name (Geist 16, #121212),
 *           its category as a small mono chip (#F2F2F1), then the description (14/20, #6C6A68, up to two lines)
 *   Footer: under a hairline, three columns: Created by (the Rival mark) · Capabilities (icon + name) ·
 *           Context (the tools it reads from, as small marks; their names on hover). One line, never wraps.
 * Click: opens its side panel.
 */
type Tool = "defender" | "sunburst" | "paloalto" | "wiz" | "github" | "aws"
type Meta = { category: string; cap: [string, LucideIcon]; ctx: Tool[] }
const VM = "Vuln Management", APP = "AppSec", CLOUD = "CloudSec", THREATS = "Threats", GRC = "GRC"
const meta: Record<string, Meta> = {
  "Triage Hunter": { category: VM, cap: ["Memory Usage", Brain], ctx: ["defender", "sunburst", "paloalto"] },
  "Code CVE Exploitability": { category: VM, cap: ["Code Search", FileSearch], ctx: ["github", "sunburst"] },
  "Cloud Exploitability": { category: CLOUD, cap: ["Cloud Graph", Network], ctx: ["wiz", "aws", "paloalto"] },
  "Code SAST Exploitability": { category: APP, cap: ["Code Search", FileSearch], ctx: ["github", "sunburst"] },
  "Red Team Simulation": { category: THREATS, cap: ["Sandbox", Box], ctx: ["aws", "github", "defender"] },
  "Finding Ownership": { category: VM, cap: ["Git History", GitBranch], ctx: ["github", "wiz"] },
  "WAF Analysis": { category: CLOUD, cap: ["Traffic Replay", Activity], ctx: ["paloalto", "aws"] },
  "Remediation": { category: VM, cap: ["Code Changes", GitPullRequest], ctx: ["github", "wiz", "sunburst"] },
  "Secret Validation": { category: APP, cap: ["Live Check", KeyRound], ctx: ["github", "aws"] },
  "App Inventory": { category: APP, cap: ["Repo Scan", FolderSearch], ctx: ["github", "wiz"] },
  "Deployment Mapping": { category: CLOUD, cap: ["Cloud Graph", Network], ctx: ["aws", "wiz", "github"] },
}
const subMeta: Partial<Record<AgentKind, Meta>> = {
  exploitability: { category: VM, cap: ["Sandbox", Box], ctx: ["github", "wiz"] },
  remediation: { category: VM, cap: ["Code Changes", GitPullRequest], ctx: ["github", "paloalto"] },
  "threat-intel": { category: THREATS, cap: ["Threat Feeds", Radar], ctx: ["defender", "sunburst"] },
  "red-team": { category: THREATS, cap: ["Sandbox", Box], ctx: ["aws", "defender"] },
  "asset-discovery": { category: CLOUD, cap: ["Cloud Graph", Network], ctx: ["aws", "wiz", "github"] },
  ownership: { category: VM, cap: ["Git History", GitBranch], ctx: ["github"] },
  "data-leak": { category: APP, cap: ["Traffic Scan", Fingerprint], ctx: ["defender", "paloalto"] },
  reporting: { category: GRC, cap: ["Reports", FileText], ctx: ["github", "sunburst"] },
  correlation: { category: VM, cap: ["Dedup", Combine], ctx: ["wiz", "sunburst", "defender"] },
  prioritization: { category: VM, cap: ["Memory Usage", Brain], ctx: ["wiz", "defender"] },
}
const metaOf = (a: LibraryAgent): Meta =>
  meta[a.name] ?? ((a.partOf !== undefined && a.kind && subMeta[a.kind]) || { category: VM, cap: ["Memory Usage", Brain], ctx: ["github"] })

// Small marks for the tools an agent reads from, in each tool's colours (simplified, not the official logos)
const toolNames: Record<Tool, string> = { defender: "Microsoft Defender", sunburst: "Sumo Logic", paloalto: "Palo Alto Networks", wiz: "Wiz", github: "GitHub", aws: "AWS" }
function ToolMark({ tool }: { tool: Tool }) {
  const art: Record<Tool, React.ReactNode> = {
    defender: <path d="M8 1.2 2.6 3.1v4.3c0 3.4 2.3 6.1 5.4 7.4 3.1-1.3 5.4-4 5.4-7.4V3.1L8 1.2Zm-.6 2.1v4.4H3.8V4.1l3.6-.8Zm1.2 0 3.6.8v3.6H8.6V3.3ZM3.9 8.9h3.5v4.2C5.5 12.1 4.2 10.6 3.9 8.9Zm4.7 0h3.5c-.3 1.7-1.6 3.2-3.5 4.2V8.9Z" fill="#0078d4" />,
    sunburst: <g stroke="#121212" strokeWidth="1.3" strokeLinecap="round">{Array.from({ length: 12 }, (_, i) => { const t = (i / 12) * Math.PI * 2; return <line key={i} x1={8 + Math.cos(t) * 3.4} y1={8 + Math.sin(t) * 3.4} x2={8 + Math.cos(t) * 6.6} y2={8 + Math.sin(t) * 6.6} /> })}</g>,
    paloalto: <g fill="#fa582d"><path d="m6.2 2.4 3 3-5.3 5.3-3-3z" /><path d="m11.1 5.3 3 3-5.3 5.3-3-3z" /></g>,
    wiz: <text x="8" y="12" textAnchor="middle" fontSize="11" fontWeight="800" fontFamily="Geist, sans-serif" fill="#1b4dff">W</text>,
    github: <><circle cx="8" cy="8" r="6.6" fill="#24292f" /><path d="M6.2 11.6v-1.4c-1.6.3-2-.7-2-.7-.3-.7-.7-.9-.7-.9-.6-.4 0-.4 0-.4.6 0 1 .7 1 .7.5.9 1.4.7 1.7.5 0-.4.2-.7.4-.8-1.3-.1-2.6-.6-2.6-2.8 0-.6.2-1.1.6-1.5-.1-.2-.3-.8 0-1.5 0 0 .5-.2 1.6.6a5.4 5.4 0 0 1 2.9 0c1.1-.8 1.6-.6 1.6-.6.3.7.1 1.3 0 1.5.4.4.6.9.6 1.5 0 2.2-1.3 2.7-2.6 2.8.2.2.4.5.4 1v1.9" fill="#fff" /></>,
    aws: <><path d="M2.5 10.2c3.4 2 7.6 2 11 0" stroke="#ff9900" strokeWidth="1.4" fill="none" strokeLinecap="round" /><path d="m12 9.2 1.8.9-.6 1.9" stroke="#ff9900" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" /><text x="8" y="8" textAnchor="middle" fontSize="6.4" fontWeight="700" fontFamily="Geist, sans-serif" fill="#232f3e">aws</text></>,
  }
  return <svg viewBox="0 0 16 16" className="size-[1.125rem] shrink-0" role="img" aria-label={toolNames[tool]}><title>{toolNames[tool]}</title>{art[tool]}</svg>
}

function AgentCard({ a, selected, onSelect }: { a: LibraryAgent; selected: boolean; onSelect: () => void }) {
  const m = metaOf(a)
  const Cap = m.cap[1]
  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className="group flex cursor-pointer flex-col items-stretch rounded-[0.375rem] border border-[#ecebe9] bg-white text-left shadow-[0px_1px_1px_rgba(0,0,0,0.04)] transition-[border-color,translate] duration-200 hover:-translate-y-px hover:border-[#dddcda] aria-pressed:border-[#2e4eca]/40"
    >
      <span className="flex flex-col items-start gap-3.5 p-5">
        <span className="flex w-full min-w-0 items-center gap-2.5">
          {TILE_STYLE === "flat" ? <FlatTile color={colorOf(a)} /> : <AgentTile seed={a.name} hue={hueOf(a)} />}
          <span className="min-w-0 flex-1 truncate text-[1rem] leading-5 font-medium text-[#121212]">{a.name}</span>
        </span>
        <span className="rounded-[0.25rem] bg-[#f2f2f1] px-2 py-0.5 font-[IBM_Plex_Mono,ui-monospace,monospace] text-[0.75rem] leading-5 whitespace-nowrap text-[#6c6a68]">{m.category}</span>
        <span className="line-clamp-2 text-[0.875rem] leading-5 text-pretty text-[#6c6a68]">{a.tagline}</span>
      </span>
      <span className="mt-auto grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-4 border-t border-[#ecebe9] px-5 pt-5 pb-5 whitespace-nowrap">
        <span className="flex flex-col gap-3">
          <span className="text-[0.875rem] leading-4 text-[#6c6a68]">Created by</span>
          <span className="flex h-5 items-center"><RivalMark className="size-4 text-[#0350d0]" /></span>
        </span>
        <span className="flex min-w-0 flex-col gap-3">
          <span className="truncate text-[0.875rem] leading-4 text-[#6c6a68]">Capabilities</span>
          <span className="flex h-5 min-w-0 items-center gap-1.5 text-[0.875rem] leading-5 text-[#121212]">
            <Cap className="size-4 shrink-0 text-[#6c6a68]" strokeWidth={1.5} />
            <span className="truncate">{m.cap[0]}</span>
          </span>
        </span>
        <span className="flex flex-col gap-3">
          <span className="text-[0.875rem] leading-4 text-[#6c6a68]">Context</span>
          <span className="flex h-5 items-center gap-1">{m.ctx.map((t) => <ToolMark key={t} tool={t} />)}</span>
        </span>
      </span>
    </button>
  )
}
