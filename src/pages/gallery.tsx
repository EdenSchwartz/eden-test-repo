import { useEffect, useState } from "react"
import { ArrowLeft, ArrowRight, Bot, ChevronDown, ChevronRight, LayoutGrid, Rows3, Search, Shapes } from "lucide-react"
import { agents, type AgentKind } from "@/components/chat/agents"
import { StepsLine } from "@/components/tasks/empty-state"
import { SubAgentCard, SubAgentDetail, subName } from "@/components/tasks/sub-agent-card"
import { TaskTable } from "@/components/tasks/task-table"
import { TemplateCard } from "@/components/tasks/template-card"
import { TemplateDetail } from "@/components/tasks/template-detail"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getSuperAgent, superAgents, type SuperAgent } from "@/data/super-agents"
import { useConversations } from "@/lib/conversations"
import { useNav } from "@/lib/nav"
import { useEnabled } from "@/lib/enabled"
import { subAgentStatus, taskStatus, type TaskStatus } from "@/lib/task-status"
import { withTransition } from "@/lib/view-transition"
import { cn } from "@/lib/utils"

/*
 * Two pages share this file (pages.tsx), one component with a mode, each keeping its own state:
 *   Agent Library (ExplorerPage, mode "explore"): Rival's templates, and sub agents as templates, to start from.
 *              Plain cards, no statuses or switches. Before you have an agent: the three steps to a first one.
 *              Use template → the setup chat (pages/chat.tsx) → it joins My Agents.
 *   My Agents (default export, mode "mine"): your agents: search, a Status filter, and Cards | List. List groups them
 *              Linear-style under the template they were made from (components/tasks/task-table.tsx).
 *              Clicking an agent card expands it into a full page (the card's box grows into the page's, a shared
 *              view-transition name; data-vt="expand" in index.css); ✕ or Esc shrinks it back into its card.
 *              None yet: an empty state pointing at Agent Library.
 *   Agents | Sub agents: a switch under the intro. Agents = the multi-step ones above (templates or yours);
 *              Sub agents = the single-mission helpers they're built from (components/tasks/sub-agent-card.tsx),
 *              each with its status and an Enabled switch, one grid, its own search and Status filter.
 *   Templates sit in one grid (no job sections), in the order below. Your agents and sub agents carry a status chip
 *              (components/tasks/status-chip.tsx) and an Enabled switch (lib/enabled.ts); switched off = Stopped.
 *   Picked:    clicking a card opens a narrow panel on the right (animated); the grid keeps the rest of the page,
 *              cards at the same size (just fewer per row). The panel: components/tasks/template-detail.tsx. ✕ closes it.
 */

// The templates, in one grid, in this order (by the job they do: cut the noise, close exposure, secure AI agents, stay audit-ready)
const order = ["triage", "patch-pilot", "exposure-hunter", "injection-shield", "leak-sentinel", "red-team-drill", "audit-ready"]
// Filter your agents (and sub agents) by how they're doing (the same status the cards and the list show)
type StatusId = "all" | TaskStatus["tone"]
const statuses = (idle: string): { id: StatusId; label: string }[] => [
  { id: "all", label: "All" },
  { id: "idle", label: idle },
  { id: "running", label: "Running" },
  { id: "attention", label: "Needs you" },
  { id: "done", label: "Ran" },
  { id: "stopped", label: "Stopped" },
]
const subKinds = Object.keys(agents) as AgentKind[]


// Cards keep one size whether the page is split or not: fixed-width columns, 3 per row full width, 2 when split.
// The page column (Split, max-w-[55.5rem]) is exactly 3 cards + padding wide, so full rows share its edges.
// The search is two cards wide (34.75rem), ending where the second card does
const grid = "grid gap-3 grid-cols-[repeat(auto-fill,17rem)]"

// ponytail: substring search over the obvious fields; real search when the catalog grows
const matches = (sa: SuperAgent, q: string) =>
  [sa.name, sa.tagline, sa.about, sa.category, ...sa.skills.map((s) => s.name), ...sa.tools.map((t) => t.name)].some((f) => f.toLowerCase().includes(q))

export default function MyAgentsPage() {
  return <Gallery mode="mine" />
}
export function ExplorerPage() {
  return <Gallery mode="explore" />
}

function Gallery({ mode }: { mode: "explore" | "mine" }) {
  const { navigate, params } = useNav()
  const { convs } = useConversations()
  const [query, setQuery] = useState("")
  const [taskQuery, setTaskQuery] = useState("")
  const [status, setStatus] = useState<StatusId>("all")
  useEnabled() // re-render when a switch flips (statuses read it)
  // Agents | Sub agents, and the sub agents' own search, filter and pick
  const [kind, setKind] = useState<"agents" | "subs">("agents")
  const [subQuery, setSubQuery] = useState("")
  const [subStatus, setSubStatus] = useState<StatusId>("all")
  const [subId, setSubId] = useState<AgentKind | null>(null)
  // An agent opened from the sub agent's "Part of" list: shown in the same panel, under a breadcrumb back to the sub agent
  const [nestedId, setNestedId] = useState<string | null>(null)
  // My Agents: the agent expanded into a full page (its card grows into it), or none. Esc shrinks it back
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const expanded = expandedId ? getSuperAgent(expandedId) ?? null : null
  // After an expand, the grid comes back without its entrance animation: the shrink-back needs the card visible
  const [settled, setSettled] = useState(false)
  const expand = (sa: SuperAgent) => withTransition(() => { setExpandedId(sa.id); setSettled(true) }, {}, "expand")
  const collapse = () => withTransition(() => setExpandedId(null), {}, "expand")
  useEffect(() => {
    if (!expandedId) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") collapse() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [expandedId])
  const nested = nestedId ? getSuperAgent(nestedId) ?? null : null
  const [view, setViewState] = useState<"cards" | "list">(() => {
    try { return localStorage.getItem("tasks-view") === "list" ? "list" : "cards" } catch { return "cards" }
  })
  const setView = (v: typeof view) => withTransition(() => { setViewState(v); try { localStorage.setItem("tasks-view", v) } catch { /* ok */ } })
  // ponytail: the panel layout; Docked for now (Floating and Wide still work in Split, the switch to compare them is gone)
  const layout = "docked" as "docked" | "floating" | "wide"
  // The picked one (split view): what you arrived with (e.g. "Open in My Agents" after creating it), else none
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const sa = getSuperAgent(params.superAgentId)
    return sa && !!sa.custom === (mode === "mine") ? sa.id : null // yours open on My Agents, templates on the explorer
  })
  // You haven't made an agent yet: Explorer shows the three steps, My Agents an empty state pointing at Explorer
  const hasAgents = superAgents.some((sa) => sa.custom)
  // Agent Library: Rival's templates, plain cards, no statuses or switches
  const explore = mode === "explore"
  const tq = taskQuery.trim().toLowerCase()
  const mine = superAgents.filter((sa) => sa.custom && (status === "all" || taskStatus(sa, convs).tone === status) && (!tq || matches(sa, tq)))
  const selected = selectedId ? getSuperAgent(selectedId) ?? null : null // null = just the cards, full width
  // Rival's templates, narrowed by a search
  const templatesFor = (text: string) => {
    const q = text.trim().toLowerCase()
    return order.map((id) => getSuperAgent(id)).filter((sa): sa is SuperAgent => !!sa && (!q || matches(sa, q)))
  }
  const sq = subQuery.trim().toLowerCase()
  const subs = subKinds.filter((k) =>
    (subStatus === "all" || subAgentStatus(k, convs).tone === subStatus) &&
    (!sq || [agents[k].name, agents[k].role].some((f) => f.toLowerCase().includes(sq))))

  const use = (sa: SuperAgent) => navigate("chat", { superAgentId: sa.id, startChat: true }) // Use template (pages/chat.tsx)
  // Picking / closing animates (view transition): cards glide to their new spots, the details slide in from the right
  const select = (sa: SuperAgent) => withTransition(() => setSelectedId(sa.id))
  const close = () => withTransition(() => { setSelectedId(null); setSubId(null); setNestedId(null) })
  const selectSub = (k: AgentKind) => withTransition(() => { setSubId(k); setNestedId(null) })
  const switchKind = (k: typeof kind) => withTransition(() => { setKind(k); setSelectedId(null); setSubId(null); setNestedId(null) })
  // From a sub agent's "Part of" list: the agent opens in the same panel (you stay on Sub agents); the breadcrumb goes back
  const openAgent = (sa: SuperAgent) => withTransition(() => setNestedId(sa.id))
  const backToSub = () => withTransition(() => setNestedId(null))

  const search = (value: string, onChange: (v: string) => void, placeholder = "Search templates") => (
    <label className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-card px-2.5 focus-within:ring-2 focus-within:ring-ring/50">
      <Search className="size-3.5 shrink-0 text-muted-foreground" />
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </label>
  )
  const templates = (text: string, clear: () => void, picked: SuperAgent | null, onSelect: (sa: SuperAgent) => void) => {
    const items = templatesFor(text)
    if (items.length === 0) return empty(clear, text.trim())
    return (
      <div className={grid}>
        {items.map((sa, i) => <TemplateCard key={sa.id} sa={sa} delay={i * 30} selected={picked?.id === sa.id} onSelect={onSelect} />)}
      </div>
    )
  }
  // Agents | Sub agents: a segmented switch, a little larger than Cards | List
  const kindSwitch = (
    <div role="tablist" aria-label="Show" className="inline-flex items-center rounded-lg bg-muted p-[3px]" style={{ viewTransitionName: "templates-kind" }}>
      {([["agents", Bot, "Agents", explore ? order.length : superAgents.filter((sa) => sa.custom).length], ["subs", Shapes, "Sub agents", subKinds.length]] as const).map(([id, Icon, label, n]) => (
        <button
          key={id}
          role="tab"
          aria-selected={kind === id}
          onClick={() => switchKind(id)}
          className={cn(
            "flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors",
            kind === id ? "bg-card text-blue shadow-sm" : "text-foreground/60 hover:text-foreground",
          )}
        >
          <Icon className="size-3.5" />
          {label}
          <span className="text-xs tabular-nums opacity-60">{n}</span>
        </button>
      ))}
    </div>
  )
  const empty = (clear: () => void, text: string) => (
    <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
      Nothing matches{text && <> “{text}”</>}.{" "}
      <button onClick={clear} className="cursor-pointer font-medium text-foreground underline-offset-2 hover:underline">Clear filters</button>
    </p>
  )

  // My Agents, one expanded: a full page in place of the grid. It carries the card's view-transition name
  // (tpl-<id>), so the browser grows the card's box into this one, and shrinks it back on close
  if (!explore && expanded) {
    return (
      <div className="relative -m-6 h-[calc(100svh-3rem)] [contain:inline-size]">
        <section aria-label={expanded.name} className="h-full overflow-hidden bg-background" style={{ viewTransitionName: `tpl-${expanded.id}` }}>
          <div className="mx-auto h-full max-w-5xl border-x border-hairline">
            <TemplateDetail key={expanded.id} sa={expanded} onUse={use} onClose={collapse} wide />
          </div>
        </section>
      </div>
    )
  }

  return (
    // -m-6 cancels main's padding: the page fills the area, both sides scroll on their own
    <div className="relative -m-6 h-[calc(100svh-3rem)] [contain:inline-size]" data-settled={settled || undefined}>
      <Split
        layout={layout}
        panelName="template-detail"
        label={kind === "subs" ? (nested?.name ?? (subId ? subName(subId) : undefined)) : selected?.name}
        panel={kind === "subs"
          ? subId && (nested ? (
            <div className="flex h-full min-h-0 flex-col bg-popover">
              <Crumbs sub={subId} agent={nested.name} onBack={backToSub} />
              <div className="min-h-0 flex-1">
                <TemplateDetail key={nested.id} sa={nested} onUse={use} onClose={close} wide={layout === "wide"} />
              </div>
            </div>
          ) : <SubAgentDetail key={subId} kind={subId} template={explore} onClose={close} onOpenAgent={openAgent} />)
          : selected && <TemplateDetail key={selected.id} sa={selected} onUse={use} onClose={close} wide={layout === "wide"} />}
      >
        <header className="space-y-1" style={{ viewTransitionName: "templates-head" }}>
          <h1 className="font-title text-[28px] leading-[1.08] tracking-[-0.01em] [--title-wght:450]">{explore ? "Agent Library" : "My Agents"}</h1>
          <p className="max-w-2xl pt-1.5 text-sm text-muted-foreground">
            {explore
              ? "Ready-made security agents by Rival. Pick one, make it yours in a short chat, and it joins My Agents."
              : "Security jobs your agents run for you, end to end."}
          </p>
          {explore && !hasAgents && <div className="pt-3"><StepsLine /></div>}
        </header>
        {!explore && !hasAgents ? (
          // My Agents, none yet: point at the explorer
          <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed px-6 py-8">
            <span className="flex size-9 items-center justify-center rounded-lg bg-wash text-blue"><Bot className="size-4.5" /></span>
            <span className="space-y-1">
              <span className="block text-sm font-semibold">No agents yet</span>
              <span className="block max-w-md text-sm text-muted-foreground">Start from one of Rival's templates in Agent Library and make it yours in a few minutes.</span>
            </span>
            <button
              onClick={() => navigate("explorer")}
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
            >
              Open Agent Library <ArrowRight className="size-3.5" />
            </button>
          </div>
        ) : <>
        {kindSwitch}
        {kind === "subs" ? (
          <>
            <div className="flex items-center gap-2" style={{ viewTransitionName: "templates-controls" }}>
              <div className="flex min-w-0 flex-1 basis-0 sm:max-w-[34.75rem]">{search(subQuery, setSubQuery, "Search sub agents")}</div>
              {/* Explorer: sub agents as templates, nothing of yours runs there, so no statuses to filter by */}
              {!explore && <Filter label="Status" value={subStatus} options={statuses("Ready")} onChange={(v) => setSubStatus(v as StatusId)} />}
            </div>
            {subs.length === 0
              ? empty(() => { setSubQuery(""); setSubStatus("all") }, subQuery.trim())
              : (
                <div className={grid}>
                  {subs.map((k, i) => (
                    <SubAgentCard key={k} kind={k} delay={i * 30} template={explore} status={explore ? undefined : subAgentStatus(k, convs)} selected={subId === k} onSelect={selectSub} />
                  ))}
                </div>
              )}
          </>
        ) : explore ? (
          <>
            <div className="flex max-w-[34.75rem]" style={{ viewTransitionName: "templates-controls" }}>{search(query, setQuery)}</div>
            {templates(query, () => setQuery(""), selected, select)}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2" style={{ viewTransitionName: "templates-controls" }}>
              <div className="flex min-w-0 flex-1 basis-0 sm:max-w-[34.75rem]">{search(taskQuery, setTaskQuery, "Search your agents")}</div>
              <Filter label="Status" value={status} options={statuses("Never run")} onChange={(v) => setStatus(v as StatusId)} />
              {/* Cards | List */}
              <div className="ml-auto inline-flex shrink-0 items-center rounded-lg bg-muted p-[3px]">
                {([["cards", LayoutGrid, "Cards"], ["list", Rows3, "List"]] as const).map(([id, Icon, label]) => (
                  <button
                    key={id}
                    onClick={() => setView(id)}
                    aria-pressed={view === id}
                    aria-label={label}
                    title={label}
                    className={cn(
                      "flex h-6.5 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors",
                      view === id ? "bg-card text-blue shadow-sm" : "text-foreground/60 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {mine.length === 0
              ? empty(() => { setTaskQuery(""); setStatus("all") }, taskQuery.trim())
              : view === "cards" ? (
                <div className={grid}>
                  {mine.map((sa, i) => <TemplateCard key={sa.id} sa={sa} delay={i * 30} selected={selected?.id === sa.id} onSelect={expand} status={taskStatus(sa, convs)} />)}
                </div>
              ) : (
                <TaskTable tasks={mine} convs={convs} selectedId={selected?.id} onSelect={select} />
              )}
          </>
        )}
        </>}
      </Split>
    </div>
  )
}

// The cards on the left (the whole page until you pick one) and the picked one's details in a narrow panel on the right.
// Docked: beside the grid, which makes room. Floating: a card over the grid, which stays as it is.
// Wide: the same split with a wider details side (36rem).
function Split({ panel, label, layout, panelName, children }: {
  panel: React.ReactNode // the picked one's details (an agent's or a sub agent's), or nothing
  label?: string
  layout: "docked" | "floating" | "wide"
  panelName: string // the panel's view-transition-name
  children: React.ReactNode
}) {
  const selected = !!panel
  const floating = layout === "floating" // sits over the grid
  const split = !!selected && layout === "wide" // details on a fixed 36rem right side, cards get the rest (two per row)
  return (
    <div className="relative flex h-full">
      <div className={cn("min-w-0 flex-1 flex-col", selected && !floating ? "hidden md:flex" : "flex")}>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className={cn("mx-auto w-full max-w-[55.5rem] space-y-5 pt-6 pb-12", split ? "px-5" : "px-6")}>{children}</div>
        </div>
      </div>
      {selected && (
        <section
          aria-label={label}
          className={cn(
            "bg-background",
            floating
              ? "absolute inset-3 z-20 overflow-hidden rounded-2xl border shadow-xl md:left-auto md:w-[30rem]"
              : cn("w-full shrink-0 border-l md:w-[35rem]"),
          )}
          style={{ viewTransitionName: panelName }}
        >
          {panel}
        </section>
      )}
    </div>
  )
}

// Sub agent › agent, above an agent opened from a sub agent's "Part of" list. The sub agent's crumb takes you back to it.
function Crumbs({ sub, agent, onBack }: { sub: AgentKind; agent: string; onBack: () => void }) {
  const SubIcon = agents[sub].icon
  return (
    <nav aria-label="Breadcrumb" className="flex shrink-0 items-center gap-1 border-b border-hairline px-4 py-2 text-[13px]">
      <button
        onClick={onBack}
        className="-ml-1 flex h-6 cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        <SubIcon className="size-3.5 text-blue" />
        {subName(sub)}
      </button>
      <ChevronRight aria-hidden className="size-3.5 text-muted-foreground/60" />
      <span aria-current="page" className="truncate px-1.5 font-medium">{agent}</span>
    </nav>
  )
}

// A filter as a small dropdown button; shows the choice (and a check in the menu) when it isn't "All"
function Filter({ label, value, options, onChange }: { label: string; value: string; options: { id: string; label: string }[]; onChange: (v: string) => void }) {
  const current = options.find((o) => o.id === value)
  const active = value !== "all"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn(
          "flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg border bg-card px-2.5 text-sm whitespace-nowrap transition-colors hover:bg-accent",
          active && "border-line font-medium text-blue",
        )}>
          {active ? current?.label : label}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((o) => <DropdownMenuRadioItem key={o.id} value={o.id}>{o.label}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
