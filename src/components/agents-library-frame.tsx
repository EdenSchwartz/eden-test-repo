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
      <div {...alive} className="alive-box relative isolate flex w-full flex-col items-start justify-center gap-3 overflow-hidden border-b border-[#ecebe9] bg-white p-10">
        <span aria-hidden className="alive-base" />
        <span aria-hidden className="alive-glow" />
        <ShimmerGrid />
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
        {/* In line with the title and the tabs (2.5rem in, the strip plus 0.5rem), filling the width between the strips:
            as many columns as fit (3 on a laptop, 4 on a big screen; fewer beside the panel) */}
        <div className="mx-8 grid min-w-0 flex-1 grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] content-start gap-4 px-2 pt-6 pb-10">
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
