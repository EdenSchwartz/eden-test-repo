import { useEffect, useRef, useState } from "react"
import { AppWindow, Bandage, Cloud, Crosshair, KeyRound, Search, ShieldCheck, Swords, UsersRound, X, type LucideIcon } from "lucide-react"
import { agentOutcomes, subOutcomes, type Outcome } from "@/data/outcomes"
import { getSuperAgent, superAgents, type SuperAgent } from "@/data/super-agents"
import { useConversations } from "@/lib/conversations"
import { subAgentStatus, taskStatus } from "@/lib/task-status"
import { RivalMark } from "@/components/nav-icons"
import { useNav } from "@/lib/nav"
import { agents, type AgentKind } from "@/components/chat/agents"
import { PartOfRow, SubAgentDetail, subName, usedBy } from "@/components/tasks/sub-agent-card"
import { TemplateDetail } from "@/components/tasks/template-detail"
import { withTransition } from "@/lib/view-transition"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { colorFor, flatColors, registerColor } from "@/components/tasks/color-tile"
import { StatusChip } from "@/components/tasks/status-chip"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useEnabled } from "@/lib/enabled"
import type { TaskStatus } from "@/lib/task-status"
import { cn } from "@/lib/utils"
import { Hint } from "@/components/ui/hint"
import { APP, CLOUD, GRC, THREATS, VM, CategoryTag } from "@/components/category-tag"
import { CapabilityLabels, CapabilityMarks, type Capability } from "@/components/capability"
import { IdeaALogoChip, IdeaASquareMark, IdeaBMark, IdeaATag, figmaLogos, ideaAColors } from "@/components/agent-card-a"
import { getCardLook, setCardLook, useCardLook, type CardLook } from "@/lib/card-look"
import { StepMark } from "@/components/tasks/panel-ui"
import { FluidGrid } from "@/components/fluid-grid"
import { useTilt } from "@/lib/tilt"


/*
 * The page area of Figma "Frame 2147206359", exactly: a white header block (p 40, gap 12, #ECEBE9 line under it)
 * with the title (Geist Medium 20, line height 16, #121212) and the description (Geist 14/16, #6C6A68),
 * four 12px white squares with a #DDDCDA edge at the frame's own positions, and empty white space below.
 * Positions are relative to the area right of the sidebar, top bar included (the squares sit on the two lines).
 */
// mode "mine" is My Agents (pages.tsx): the same page, cards and drawer, with your own agents (made from these
// templates; status chip, you as Created by, Enabled in the drawer) and every sub agent with its status.
type Entry = { a: LibraryAgent; from: LibraryAgent; mine?: { status: TaskStatus; enabledKey: string; you?: boolean } }
export function AgentsLibraryFrame({ mode = "library" }: { mode?: "library" | "mine" }) {
  const { navigate, params } = useNav()
  const mineMode = mode === "mine"
  const { convs } = useConversations()
  useEnabled() // statuses read the Enabled switches
  const agentEntries: Entry[] = mineMode
    ? superAgents.filter((sa) => sa.custom).map((sa) => {
        const from = library.find((l) => l.templateId === (sa.clonedFrom ?? sa.id)) ?? library[0]
        return { a: { name: sa.name, tagline: sa.tagline, icon: sa.icon, outcomes: from.outcomes, runsOn: from.runsOn, templateId: sa.id }, from, mine: { status: taskStatus(sa, convs), enabledKey: sa.id, you: true } }
      })
    : library.map((a) => ({ a, from: a }))
  const subEntries: Entry[] = subLibrary.map((a) => ({ a, from: a, mine: mineMode && a.kind ? { status: subAgentStatus(a.kind, convs), enabledKey: `sub:${a.kind}` } : undefined }))
  // The picked card's details in a drawer (shadcn Sheet): an agent's, or a sub agent's. Esc, ✕ or clicking outside closes it.
  // `picked` stays set while it slides out, so the drawer doesn't empty mid-animation; `open` drives the slide
  const [picked, setPicked] = useState<{ agent?: string; kind?: AgentKind; name: string } | null>(null)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"agents" | "subs">("agents")
  const switchTab = (t: typeof tab) => withTransition(() => { setTab(t); setOpen(false) })
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const entries = (tab === "agents" ? agentEntries : subEntries).filter(({ a }) => !q || [a.name, a.tagline, ...a.outcomes.map((o) => o.label), ...a.runsOn].some((f) => f.toLowerCase().includes(q)))
  const list = entries.map((e) => e.a)
  useEffect(() => {
    const arrived = params.superAgentId && agentEntries.find((e) => e.a.templateId === params.superAgentId)
    if (arrived) pick(arrived.a)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.superAgentId])
  const pick = (a: LibraryAgent) => { setPicked(a.templateId ? { agent: a.templateId, name: a.name } : a.partOf === undefined ? { agent: `lib:${a.name}`, name: a.name } : { kind: a.kind, name: a.name }); setInner(null); setDir("in"); setOpen(true) }
  const close = () => setOpen(false)
  // Inside the drawer: a step's sub agent (from an agent's How it works) or an agent a sub agent is part of opens in
  // the same drawer, in place, with breadcrumbs back. The picked card's panel stays mounted underneath (hidden), so
  // coming back finds it as you left it (its tab, its prompt already typed).
  const [inner, setInner] = useState<{ sub: AgentKind } | { agent: string } | null>(null)
  const innerSubLib = inner && "sub" in inner ? subLibrary.find((l) => l.kind === inner.sub) : undefined
  const innerAgent = inner && "agent" in inner ? getSuperAgent(inner.agent) : undefined
  // which way the content last moved, for its little slide: in (to a step's sub agent) or back
  const [dir, setDir] = useState<"in" | "back">("in")
  const back = () => { setDir("back"); setInner(null) }
  const into = (next: { sub: AgentKind } | { agent: string }) => { setDir("in"); setInner(next) }
  // Part of: an agent with its own panel opens in place (breadcrumbs back); the others become the drawer's agent
  // (the drawer's own agent, from a step's sub agent: just back to it)
  const openPartOf = (a: LibraryAgent) => (a.templateId === picked?.agent && a.templateId ? back() : a.templateId ? into({ agent: a.templateId }) : pick(a))
  const startSub = () => navigate("chat", { startChat: true })
  const agent = picked?.agent ? getAgent(picked.agent) : undefined
  // The drawer's icon tile keeps the picked card's colour (on My Agents: the template it was made from)
  const pickedLib = [...agentEntries, ...subEntries].find((e) => e.a.name === picked?.name)?.from
  const look = useCardLook()
  const pickedColor = pickedLib ? (look !== "current" ? ideaAColors[ideaIndex(pickedLib) % ideaAColors.length][0] : colorOf(pickedLib)) : undefined
  // The drawer's ↓ 1 / 9 ↑: steps through the cards on screen (this tab, after the search), in their order
  const at = list.findIndex((a) => a.name === picked?.name)
  const nav = { index: at, total: list.length, onPrev: () => at > 0 && pick(list[at - 1]), onNext: () => at < list.length - 1 && pick(list[at + 1]) }
  return (
    <div className="flex flex-1 flex-col items-start bg-white whitespace-nowrap">
      <div className="alive-box relative isolate flex w-full flex-col items-start justify-center gap-3 overflow-hidden border-b border-[#ecebe9] bg-white p-10">
        <span aria-hidden className="alive-noise" />
        <span aria-hidden className="alive-base" />
        <FluidGrid />
        <p className="text-title leading-4 font-medium text-fg-primary">{mineMode ? "My Agents" : "Agents Library"}</p>
        <p className="max-w-full truncate text-body leading-4 font-normal text-fg-secondary">
          {mineMode ? "Security jobs your agents run for you, end to end." : "Ready-made security agents by Rival. Pick one, make it yours in a short chat, and it joins My Agents."}
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
          {entries.map((e) => <AgentCard key={e.a.name} a={e.a} from={e.from} mine={e.mine} selected={open && picked?.name === e.a.name} onSelect={() => pick(e.a)} />)}
          {mineMode && tab === "agents" && agentEntries.length === 0 && (
            <p className="col-span-full py-10 text-center text-body leading-5 whitespace-normal text-fg-secondary">
              No agents yet. <button onClick={() => navigate("explorer")} className="cursor-pointer text-[#2e4eca] hover:underline">Pick one in the Agents Library</button> and make it yours in a short chat.
            </p>
          )}
          {list.length === 0 && q && (
            <p className="col-span-full py-10 text-center text-body leading-5 whitespace-normal text-fg-secondary">
              Nothing matches “{query.trim()}”. <button onClick={() => setQuery("")} className="cursor-pointer text-[#2e4eca] hover:underline">Clear search</button>
            </p>
          )}
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent showCloseButton={false} aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()} className="w-full gap-0 overflow-hidden border-[#ecebe9] p-0 whitespace-normal sm:max-w-[35rem]">
          <SheetTitle className="sr-only">{picked?.name}</SheetTitle>
          {/* kept mounted (hidden) while a step is open, so it keeps its tab and typed prompt; it slides back in on return */}
          <div className={cn("flex h-full min-h-0 flex-col", inner ? "hidden" : dir === "back" && "panel-swap-back")}>
            {agent
              ? <TemplateDetail key={agent.id} sa={agent} color={pickedColor} nav={nav} onOpenStep={(k) => into({ sub: k })} {...drawerProps(pickedLib)} outcomes={agent.id.startsWith("lib:") ? pickedLib?.outcomes : undefined} onUse={(sa) => navigate("chat", sa.id.startsWith("lib:") ? { startChat: true } : { superAgentId: sa.id, startChat: true })} onClose={close} />
              : picked?.kind && <SubAgentDetail key={picked.name} kind={picked.kind} color={pickedColor} nav={nav} template={!mineMode} {...subPanelProps(picked.kind, openPartOf)} mark={pickedLib && drawerMark(pickedLib, look)} onUse={startSub} onClose={close} onOpenAgent={(sa) => into({ agent: sa.id })} />}
          </div>
          {inner && "sub" in inner && (
            <div className="panel-swap-in flex h-full min-h-0 flex-col">
            <SubAgentDetail
              key={`inner-${inner.sub}`}
              kind={inner.sub}
              template
              crumbs={[{ label: picked?.name ?? "", onClick: back }, { label: subName(inner.sub) }]}
              color={innerSubLib && (look !== "current" ? ideaAColors[ideaIndex(innerSubLib) % ideaAColors.length][0] : colorOf(innerSubLib))}
              {...subPanelProps(inner.sub, openPartOf)}
              onUse={startSub}
              onClose={close}
              onOpenAgent={back}
            />
            </div>
          )}
          {innerAgent && (
            <div className="panel-swap-in flex h-full min-h-0 flex-col">
            <TemplateDetail key={`inner-${innerAgent.id}`} sa={innerAgent} crumbs={[{ label: picked?.name ?? "", onClick: back }, { label: innerAgent.name }]} {...drawerProps(library.find((l) => l.templateId === innerAgent.id))} onUse={(sa) => navigate("chat", { superAgentId: sa.id, startChat: true })} onClose={close} />
            </div>
          )}
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
      <span className="mr-1 text-small leading-4 text-fg-tertiary">Card</span>
      {opts.map(([id, label]) => (
        <button key={id} role="tab" aria-selected={look === id} onClick={() => withTransition(() => setCardLook(id))}
          className="lib-tab !h-6 !text-small disabled:cursor-default disabled:opacity-40 disabled:hover:border-transparent disabled:hover:bg-transparent">
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
        "ml-auto flex h-6 items-center gap-1.5 overflow-hidden rounded-[0.25rem] border border-[#ecebe9] bg-white pl-1.5 text-small leading-4 text-fg-primary drop-shadow-[0px_1px_0.5px_rgba(119,131,152,0.2)] transition-[width,border-color] duration-300 ease-[cubic-bezier(.3,.7,.15,1)]",
        open ? "w-64 border-[#dddcda] pr-1" : "w-[4.75rem] cursor-pointer pr-2 hover:border-[#dddcda] hover:bg-[#fcfcfa]",
      )}
      onClick={() => !open && show()}
    >
      <Search className="size-3.5 shrink-0 text-fg-secondary" />
      {open ? <>
        <input
          ref={input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); hide() } }}
          onBlur={() => { if (!value.trim()) setOpen(false) }}
          placeholder="Search agents"
          aria-label="Search agents"
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-fg-tertiary"
        />
        <button onMouseDown={(e) => e.preventDefault()} onClick={hide} aria-label="Close search" className="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[0.1875rem] text-[#9a9893] hover:bg-[#f4f4f2] hover:text-fg-secondary">
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

// The side panel's mark under the card ideas: the same round mark as the card (48px), else the colour tile
// (the rounded square, 44px with 4px pixels: a touch taller than the visible text beside it; idea B keeps its
// round dashed wheel)
const drawerMark = (a: LibraryAgent, look: CardLook) =>
  look === "b" ? <IdeaBMark index={ideaIndex(a)} size={44} /> : <IdeaASquareMark index={ideaIndex(a)} size={44} />

// What an agent's drawer shows as Category, Capabilities and Context: the same as its card
const drawerProps = (a?: LibraryAgent) => {
  if (!a) return {}
  const m = metaOf(a)
  return {
    mark: drawerMark(a, getCardLook()),
    categories: m.categories,
    capabilities: <CapabilityLabels caps={m.cap} />,
    // the logos in small white overlapping circles (Figma 72:18175: #E5E3E3 edge, a soft shadow)
    context: <span className="flex h-5 items-center">{m.ctx.map((t, i) => <IdeaALogoChip key={t} name={toolNames[t]} last={i === m.ctx.length - 1} edge="#e5e3e3"><IdeaALogo tool={t} /></IdeaALogoChip>)}</span>,
  }
}

// Small marks for the tools an agent reads from, in each tool's colours (simplified, not the official logos)
const toolNames: Record<Tool, string> = { wiz: "Wiz", snyk: "Snyk", github: "GitHub", defender: "Microsoft Defender", paloalto: "Palo Alto Prisma", semgrep: "Semgrep", okta: "Okta" }
function ToolMark({ tool, bare }: { tool: Tool; bare?: boolean }) {
  const art: Record<Exclude<Tool, "okta">, React.ReactNode> = {
    defender: <path d="M8 1.2 2.6 3.1v4.3c0 3.4 2.3 6.1 5.4 7.4 3.1-1.3 5.4-4 5.4-7.4V3.1L8 1.2Zm-.6 2.1v4.4H3.8V4.1l3.6-.8Zm1.2 0 3.6.8v3.6H8.6V3.3ZM3.9 8.9h3.5v4.2C5.5 12.1 4.2 10.6 3.9 8.9Zm4.7 0h3.5c-.3 1.7-1.6 3.2-3.5 4.2V8.9Z" fill="#0078d4" />,
    paloalto: <g fill="#fa582d"><path d="m6.2 2.4 3 3-5.3 5.3-3-3z" /><path d="m11.1 5.3 3 3-5.3 5.3-3-3z" /></g>,
    wiz: <><rect x="1" y="1" width="14" height="14" rx="3.5" fill="#1b4dff" /><text x="8" y="11.6" textAnchor="middle" fontSize="9.5" fontWeight="800" fontFamily="Geist, sans-serif" fill="#fff">W</text></>,
    snyk: <><rect x="1" y="1" width="14" height="14" rx="3.5" fill="#4c4a73" /><text x="8" y="11.6" textAnchor="middle" fontSize="9.5" fontWeight="800" fontFamily="Geist, sans-serif" fill="#fff">S</text></>,
    semgrep: <><circle cx="8" cy="8" r="7" fill="#2bc28a" /><circle cx="8" cy="8" r="2.6" fill="#fff" /></>,
    github: <><circle cx="8" cy="8" r="6.6" fill="#24292f" /><path d="M6.2 11.6v-1.4c-1.6.3-2-.7-2-.7-.3-.7-.7-.9-.7-.9-.6-.4 0-.4 0-.4.6 0 1 .7 1 .7.5.9 1.4.7 1.7.5 0-.4.2-.7.4-.8-1.3-.1-2.6-.6-2.6-2.8 0-.6.2-1.1.6-1.5-.1-.2-.3-.8 0-1.5 0 0 .5-.2 1.6.6a5.4 5.4 0 0 1 2.9 0c1.1-.8 1.6-.6 1.6-.6.3.7.1 1.3 0 1.5.4.4.6.9.6 1.5 0 2.2-1.3 2.7-2.6 2.8.2.2.4.5.4 1v1.9" fill="#fff" /></>,
  }
  const mark = tool === "okta"
    ? <span aria-label={toolNames.okta} className="relative size-4 shrink-0">{figmaLogos.okta}</span>
    : <span className="grid size-4 shrink-0 place-items-center"><svg viewBox="0 0 16 16" className="size-4" role="img" aria-label={toolNames[tool]}>{art[tool]}</svg></span>
  // its name in a tooltip under it (not when it sits inside a chip that has its own)
  return bare ? mark : <Hint label={toolNames[tool]}>{mark}</Hint>
}

// Idea A's context logos: the design's own three where they exist, else the same marks as above, 14px
function IdeaALogo({ tool }: { tool: Tool }) {
  if (tool === "defender" || tool === "okta" || tool === "paloalto") return figmaLogos[tool]
  return <span className="absolute inset-0"><ToolMarkArt tool={tool} /></span>
}
function ToolMarkArt({ tool }: { tool: Exclude<Tool, "okta" | "defender" | "paloalto"> }) {
  const m = <ToolMark tool={tool} bare />
  return <span className="[&>span]:size-3.5 [&_svg]:size-3.5">{m}</span>
}
// An agent's index in the library (agents, then sub agents): its colour and mark in idea A
const ideaIndex = (a: LibraryAgent) => { const i = [...library, ...subLibrary].indexOf(a); return i >= 0 ? i : hash(a.name) % ideaAColors.length }

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
      className="tilt-card group relative flex cursor-pointer flex-col items-stretch overflow-hidden rounded-[4px] border border-solid border-[#f0f0f0] bg-white text-left whitespace-nowrap hover:border-[#e4e4e4] aria-pressed:border-[#2e4eca]/40"
    >
      <span aria-hidden className="tilt-light" />
      <span className={cn("flex w-full flex-col items-start gap-4 p-5 transition-opacity", off && "opacity-50")}>
        <span className="flex w-full min-w-0 items-center gap-3.5">
          <IdeaASquareMark index={ideaIndex(from)} size={60} />
          <span className="flex min-w-0 flex-1 flex-col justify-center gap-2">
            <span className="flex w-full min-w-0 items-center">
              <span className="min-w-0 flex-1 truncate text-body leading-4 font-medium text-fg-primary">{a.name}</span>
              <span className="flex shrink-0 items-center">
                {m.ctx.map((t, i) => <IdeaALogoChip key={t} name={toolNames[t]} last={i === m.ctx.length - 1}><IdeaALogo tool={t} /></IdeaALogoChip>)}
              </span>
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="flex min-w-0 items-start gap-1.5 overflow-hidden">{m.categories.map((c) => <IdeaATag key={c}>{c}</IdeaATag>)}</span>
              {/* on My Agents: its status, at the end of the tags row so the name keeps its room */}
              {mine && <span className="ml-auto shrink-0"><StatusChip status={mine.status} /></span>}
            </span>
          </span>
        </span>
        <span className="line-clamp-2 min-h-10 w-full text-body leading-5 whitespace-normal text-pretty text-fg-secondary">{a.tagline}</span>
      </span>
    </button>
  )
  // Idea B (Figma 64:16242): centred; the mark (52px) sits half above the card's top edge, name, tags, one-line
  // description. Hover: no 3D tilt; the tyre (dashed ring) rolls a quarter turn, the pixel shape stays still, a race car's wake of gas behind (index.css)
  if (look === "b") return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className="ideab-card group relative mt-[1.6875rem] flex cursor-pointer flex-col items-stretch rounded-[4px] border border-solid border-[#e5e5e5] bg-white text-center whitespace-nowrap [box-shadow:0px_1px_1px_rgba(0,0,0,0.06)] hover:border-[#dcdcdc] aria-pressed:border-[#2e4eca]/40"
    >
      <span className={cn("absolute top-[-1.6875rem] left-1/2 -translate-x-1/2 transition-opacity", off && "opacity-50")}>
        <span aria-hidden className="ideab-gas"><i /></span>
        <IdeaBMark index={ideaIndex(from)} size={52} />
      </span>
      {mine && <span className="absolute top-2 right-2"><StatusChip status={mine.status} /></span>}
      <span className={cn("flex w-full flex-col items-center gap-3 px-[0.9375rem] pt-[2.625rem] pb-4 transition-opacity", off && "opacity-50")}>
        <span className="flex w-full min-w-0 flex-col items-center gap-1.5">
          <span className="max-w-full truncate text-body leading-4 font-medium text-fg-primary">{a.name}</span>
          <span className="flex items-start gap-1.5">{m.categories.map((c) => <IdeaATag key={c}>{c}</IdeaATag>)}</span>
        </span>
        <span className="w-full truncate text-body leading-4 text-fg-secondary">{a.tagline}</span>
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
              <span className="truncate text-body leading-5 font-medium text-fg-primary">{a.name}</span>
              <span className="flex min-w-0 items-center gap-1 overflow-hidden">
                {m.categories.map((c) => <CategoryTag key={c} category={c} />)}
              </span>
            </span>
          </span>
          {mine && <StatusChip status={mine.status} />}
        </span>
        <span className={cn("line-clamp-2 min-h-10 text-body leading-5 whitespace-normal text-pretty text-fg-secondary transition-opacity", off && "opacity-50")}>{a.tagline}</span>
      </span>
      <span className={cn("mt-auto flex items-start justify-between gap-4 border-t border-[#ecebe9] px-4 pt-4 pb-4 whitespace-nowrap transition-opacity", off && "opacity-50")}>
        <span className="flex flex-col gap-2">
          <span className="text-small leading-4 text-fg-tertiary [text-transform:uppercase]">Created by</span>
          <span className="flex h-5 items-center gap-2 text-body leading-5 text-fg-primary">
            {mine?.you
              ? <><Avatar className="size-4" title="Created by you"><AvatarFallback className="text-[7px] font-semibold">IB</AvatarFallback></Avatar>You</>
              : <><RivalMark className="-mx-1.5 size-6 shrink-0 text-[#0350d0]" />Rival</>}
          </span>
        </span>
        <span className="flex min-w-0 flex-col gap-2">
          <span className="truncate text-small leading-4 text-fg-tertiary [text-transform:uppercase]">Capabilities</span>
          <span className="-my-0.5 flex h-6 items-center"><CapabilityMarks caps={m.cap} /></span>
        </span>
        <span className="flex flex-col items-end gap-2">
          <span className="text-small leading-4 text-fg-tertiary [text-transform:uppercase]">Context</span>
          <span className="flex h-5 items-center gap-1.5">{m.ctx.map((t) => <ToolMark key={t} tool={t} />)}</span>
        </span>
      </span>
    </button>
  )
}

// Every library agent has its own agent panel. Triage Hunter has a full template; the others are built here from
// their card (name, description, outcomes) on Triage Hunter's frame (skills, tools), with their own prompt and steps.
const libPatterns: Partial<Record<AgentKind, AgentKind[][]>> = {
  exploitability: [["correlation"], ["exploitability", "threat-intel"], ["prioritization"], ["reporting"]],
  "red-team": [["exploitability"], ["red-team"], ["reporting"]],
  ownership: [["asset-discovery"], ["ownership"], ["reporting"]],
  remediation: [["prioritization"], ["remediation"], ["reporting"]],
  "data-leak": [["data-leak", "threat-intel"], ["prioritization"], ["reporting"]],
  "asset-discovery": [["asset-discovery"], ["correlation"], ["reporting"]],
}
const libPrompts: Record<string, string> = {
  "Code CVE Exploitability": "Check this week's dependency CVEs and tell me which are really exploitable in our code. Skip the rest.",
  "Cloud Exploitability": "Go through new cloud scanner findings and confirm which can actually be reached and exploited.",
  "Code SAST Exploitability": "Trace this week's SAST findings and keep only the ones a user input can really reach.",
  "Red Team Simulation": "Reproduce the top exploitable finding in an isolated replica and show me the proof of concept.",
  "Finding Ownership": "Find the right owner for every open critical and high finding, and draft a note to each.",
  "WAF Analysis": "For each exploitable finding, check whether our WAF rules already block its path in.",
  "Remediation": "Fix the top three findings in a sandbox copy of the repo and open PRs for my review.",
  "Secret Validation": "Check every leaked secret from this week: is it live, and what can it reach?",
  "App Inventory": "List every deployable app and shared library we have, with its repo and owner.",
  "Deployment Mapping": "Map our non-containerized apps to the cloud workloads they run on.",
}
const libSa = (a: LibraryAgent): SuperAgent => {
  const base = getSuperAgent("triage")!
  return {
    ...base, id: `lib:${a.name}`, name: a.name, tagline: a.tagline, icon: a.icon, custom: false, clonedFrom: undefined,
    prompt: libPrompts[a.name] ?? base.prompt, pattern: (a.kind && libPatterns[a.kind]) || base.pattern,
  }
}
const getAgent = (id?: string) => (id?.startsWith("lib:") ? (() => { const a = library.find((l) => `lib:${l.name}` === id); return a && libSa(a) })() : getSuperAgent(id))

// A sub agent's "Part of": four library agents that would use it, as rows with their own (square) marks. Picking one
// opens it — in place, with breadcrumbs, when it has its own panel; else as the drawer's agent.
const partOfNames: Record<AgentKind, string[]> = {
  exploitability: ["Triage Hunter", "Red Team Simulation", "Remediation", "Cloud Exploitability"],
  correlation: ["Triage Hunter", "App Inventory", "Finding Ownership", "Deployment Mapping"],
  "threat-intel": ["Triage Hunter", "WAF Analysis", "Red Team Simulation", "Secret Validation"],
  prioritization: ["Triage Hunter", "Remediation", "Finding Ownership", "Code SAST Exploitability"],
  ownership: ["Triage Hunter", "Finding Ownership", "Remediation", "App Inventory"],
  reporting: ["Triage Hunter", "Remediation", "App Inventory", "WAF Analysis"],
  remediation: ["Triage Hunter", "Code CVE Exploitability", "Code SAST Exploitability", "Secret Validation"],
  "red-team": ["Red Team Simulation", "Code CVE Exploitability", "Cloud Exploitability", "WAF Analysis"],
  "asset-discovery": ["App Inventory", "Deployment Mapping", "Cloud Exploitability", "Finding Ownership"],
  "data-leak": ["Secret Validation", "WAF Analysis", "Triage Hunter", "Red Team Simulation"],
} as Record<AgentKind, string[]>
const subPanelProps = (kind: AgentKind, open: (a: LibraryAgent) => void) => {
  const lib = subLibrary.find((l) => l.kind === kind)
  const rows = (partOfNames[kind] ?? []).map((n) => library.find((l) => l.name === n)).filter(Boolean) as LibraryAgent[]
  return {
    mark: <StepMark kind={kind} />,
    capabilities: lib ? <CapabilityLabels caps={metaOf(lib).cap} /> : undefined,
    partOf: (
      <ul className="flex w-full flex-col gap-2">
        {rows.map((a) => <li key={a.name}><PartOfRow name={a.name} mark={<IdeaASquareMark index={ideaIndex(a)} size={28} />} onClick={() => open(a)} /></li>)}
      </ul>
    ),
  }
}

// The drawers on My Agents (pages/gallery.tsx) show the same as the library's: by the agent it's a copy of
export const agentDrawerProps = (sa: SuperAgent) => drawerProps(library.find((l) => l.templateId === (sa.clonedFrom ?? sa.id)))
export const subCategories = (kind: AgentKind) => { const a = subLibrary.find((l) => l.kind === kind); return a ? metaOf(a).categories : undefined }
export const subMark = (kind: AgentKind) => { const a = subLibrary.find((l) => l.kind === kind); return a && drawerMark(a, getCardLook()) }

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
