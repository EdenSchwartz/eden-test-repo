import { useEffect, useRef, useState } from "react"
import { AppWindow, Bandage, Bot, Clock, Cloud, Crosshair, KeyRound, ShieldCheck, Swords, UsersRound, type LucideIcon } from "lucide-react"
import { agentOutcomes, subOutcomes, type Outcome } from "@/data/outcomes"
import { blockers, getSuperAgent } from "@/data/super-agents"
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
 * The color is metallic: graphite-to-silver bands with a cool steel / faint champagne tint, and faster flow
 * catches the light. Darker than the resting grid so it reads on white, at most 80% strength.
 * Coming near the box from outside (within 18rem) pours a little dye in at the closest edge, as a hint.
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
      for (let k = 0; k < d.length; k++) { d[k] *= 0.975; u[k] *= 0.992; v[k] *= 0.992 }
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
    const move = (e: PointerEvent) => {
      const b = box.getBoundingClientRect()
      const x = e.clientX - b.left, y = e.clientY - b.top
      const inside = x >= 0 && y >= 0 && x <= b.width && y <= b.height
      if (inside) {
        const dx = last ? x - last.x : 0, dy = last ? y - last.y : 0
        splat(x, y, dx * 0.5, dy * 0.5, 0.3 + Math.min(0.45, Math.hypot(dx, dy) * 0.015))
        last = { x, y }
      } else {
        last = null
        // The hint: a little dye at the closest edge, more the nearer you are, drifting inward
        const cx = Math.min(Math.max(x, 0), b.width), cy = Math.min(Math.max(y, 0), b.height)
        const range = parseFloat(getComputedStyle(document.documentElement).fontSize) * 18
        const near = Math.max(0, 1 - Math.hypot(x - cx, y - cy) / range)
        if (near <= 0) return
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
      const base = [58 + l * 92, 64 + l * 96, 76 + l * 100]
      return [base[0] + tint * 14, base[1] + tint * 4, base[2] - tint * 16].map((c) => Math.round(Math.min(200, Math.max(40, c))))
    }
    const sample = (x: number, y: number) => {
      const i = Math.min(N, Math.max(1, Math.round(x / res + 0.5))), j = Math.min(M, Math.max(1, Math.round(y / res + 0.5)))
      return IX(i, j)
    }
    const seg = (x: number, y: number, horiz: boolean, t: number) => {
      const k = sample(horiz ? x + res / 2 : x, horiz ? y : y + res / 2)
      const a = Math.min(1, d[k] * 1.1)
      if (a < 0.02) return 0
      const speed = Math.hypot(u[k], v[k])
      const [r, g, b] = metal(x / w * 1.6 + y / h * 0.5 + t * 0.00004, Math.min(1, speed * 0.25))
      ctx.fillStyle = `rgba(${r},${g},${b},${a * 0.8})`
      if (horiz) ctx.fillRect(x, y, res, 1); else ctx.fillRect(x, y, 1, res)
      return a
    }
    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      let lit = 0
      for (let y = 0; y <= h; y += cell) for (let x = 0; x < w; x += res) lit += seg(x, y, true, t)
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

    size()
    const ro = new ResizeObserver(size)
    ro.observe(box)
    window.addEventListener("pointermove", move, { passive: true })
    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("pointermove", move) }
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
  const list = tab === "agents" ? library : subLibrary
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
        <span aria-hidden className="alive-base" />
        <FluidGrid />
        <p className="text-[1.25rem] leading-4 font-medium text-[#121212]">Agents Library</p>
        <p className="max-w-full truncate text-[0.875rem] leading-4 font-normal text-[#6c6a68]">
          Ready-made security agents by Rival. Pick one, make it yours in a short chat, and it joins My Agents.
        </p>
      </div>
      {/* Agents | Sub Agents: a row of tabs under the header, its own line below */}
      <div role="tablist" aria-label="Library" className="flex w-full items-center gap-2 border-b border-[#ecebe9] px-10 py-2">
        {([["agents", "Agents"], ["subs", "Sub Agents"]] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => switchTab(id)} className="lib-tab">{label}</button>
        ))}
      </div>
      {/* The cards area: a drafting-sheet margin on both sides (fine diagonal hatching, a hairline rail), cards go between */}
      <div className="relative flex w-full flex-1">
        <span aria-hidden className="sheet-margin left-0 border-r" />
        {/* Smaller screens (under 1800px): centered, 3 to a row (68rem at most). Big screens: in line with the title and
            the tabs, filling the width between the strips (4 or more to a row). Beside the panel: as many as fit */}
        <div className={cn("grid min-w-0 flex-1 content-start gap-4 pt-6 pb-10", picked
          ? "mx-8 grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] px-2"
          : "mx-auto max-w-[68rem] grid-cols-[repeat(3,minmax(0,1fr))] px-10 min-[1800px]:mx-8 min-[1800px]:max-w-none min-[1800px]:grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] min-[1800px]:px-2")}>
          {list.map((a) => <AgentCard key={a.name} a={a} selected={picked?.name === a.name} onSelect={() => pick(a)} />)}
        </div>
        {!picked && <span aria-hidden className="sheet-margin right-0 border-l" />}
      </div>
      <FrameCorners right={!picked} />
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

// The four squares, on the top bar's line and the header's line, at both ends (as in the frame).
// The right pair goes while the side panel covers that side.
function FrameCorners({ right }: { right: boolean }) {
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

/*
 * An agent card. The top is the Figma card "Frame 2147206362" as drawn: white, a #F0F0F0 edge, drop shadow
 * 0 1 1 rgba(0,0,0,.04), p 8, 4px corners; a 48px #5E64BF tile (6px corners) with the white icon; the name
 * (Geist Medium 16/16, #121212) and the tagline (14/16, #6C6A68), 10 apart.
 * The tagline may take two lines here (three cards to a row). Under a hairline (kept at the bottom, so cards
 * in a row line up): what a run ends in (its outcomes, as colored dots), then what it runs on,
 * with sub agents and time per run on the right for multi-step agents. Rows never wrap.
 * Click: opens its side panel (the page's docked panel).
 */
const tone: Record<Outcome["tone"], string> = {
  risk: "bg-[#d8453a]", clear: "bg-[#2e4eca]", good: "bg-[#2f9e5b]", warn: "bg-[#d9921a]", unclear: "bg-[#9a9893]", failed: "bg-[#9a9893]",
}

function AgentCard({ a, selected, onSelect }: { a: LibraryAgent; selected: boolean; onSelect: () => void }) {
  const Icon = a.icon
  const sa = a.templateId ? getSuperAgent(a.templateId) : undefined
  const setup = sa ? blockers(sa).length > 0 : false
  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className="group flex cursor-pointer flex-col items-stretch rounded-[0.25rem] border border-[#f0f0f0] bg-white aria-pressed:border-[#2e4eca]/40 p-2 text-left drop-shadow-[0px_1px_1px_rgba(0,0,0,0.04)] transition-[border-color,translate] duration-200 hover:-translate-y-px hover:border-[#e2e1df]"
    >
      <span className="mb-3 flex w-full items-start gap-2">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-[0.375rem] bg-[#5e64bf] text-white">
          <Icon className="size-6" strokeWidth={1.5} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col items-start gap-2.5 pt-1">
          <span className="w-full truncate text-[1rem] leading-4 font-medium text-[#121212]">{a.name}</span>
          <span className="line-clamp-2 w-full text-[0.875rem] leading-4 text-pretty text-[#6c6a68]">{a.tagline}</span>
        </span>
      </span>

      <span className="mt-auto flex flex-col gap-2.5 border-t border-[#f0f0f0] px-1 pt-2.5 pb-1 text-[0.75rem] leading-4 whitespace-nowrap text-[#6c6a68]">
        <span className="flex h-4 min-w-0 items-center gap-3 overflow-hidden">
          {a.outcomes.length > 0 ? a.outcomes.map((o) => (
            <span key={o.label} className="inline-flex items-center gap-1.5">
              <span aria-hidden className={`size-1.5 rounded-full ${tone[o.tone]}`} />
              {o.label}
            </span>
          )) : <span className="text-[#c9c7c3]">—</span>}
        </span>
        <span className="flex h-5 min-w-0 items-center gap-3 overflow-hidden">
          <span className="w-12 shrink-0 text-[#9a9893]">{a.partOf !== undefined ? "Part of" : "Runs on"}</span>
          {a.partOf !== undefined ? <span>{a.partOf} {a.partOf === 1 ? "agent" : "agents"}</span> : <span className="flex items-center gap-1">
            {a.runsOn.length > 0 ? a.runsOn.map((r) => (
              <span key={r} className="rounded-[0.1875rem] border border-[#ecebe9] px-1.5 text-[0.6875rem] leading-[1.125rem] text-[#6c6a68]">{r}</span>
            )) : <span className="text-[#c9c7c3]">—</span>}
          </span>}
          {sa && (
            <span className="ml-auto flex items-center gap-3 text-[#9a9893]">
              {setup ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-[#b7791f]"><span aria-hidden className="size-1.5 rounded-full bg-[#d9921a]" />Needs setup</span>
              ) : <>
                <span className="inline-flex items-center gap-1.5"><Bot className="size-3.5" />{sa.pattern.flat().length}</span>
                <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" />~{sa.runtime}</span>
              </>}
            </span>
          )}
        </span>
      </span>
    </button>
  )
}
