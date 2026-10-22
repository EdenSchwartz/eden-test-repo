import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import {
  IconActivity, IconAffiliate, IconAlertCircle, IconAlertSquareRounded, IconAlertSquareRoundedOff, IconAlertTriangle,
  IconArrowsMaximize, IconBolt, IconBrain, IconBug, IconBulb, IconChevronRight, IconCircleDot, IconCircleMinus, IconClock,
  IconDots, IconFileDescription, IconFlag, IconFolderCode, IconGitBranch, IconKey, IconListDetails, IconMessageCircle,
  IconPrompt, IconQuestionMark, IconRobot, IconSearch, IconShieldCheck, IconShieldX, IconSitemap, IconSwords, IconWorldSearch, IconX,
  type Icon,
} from "@tabler/icons-react"
import {
  findProductAgent, myAgents, rivalAgents, rivalSubAgents,
  type Capability, type OutcomeIcon, type ProductAgent, type RunsOn,
} from "@/data/product-agents"
import { RivalMark } from "@/components/nav-icons"
import { useNav } from "@/lib/nav"
import { cn } from "@/lib/utils"

/*
 * Rival Agents and My Agents as the real product draws them (app.us1-dev.rival-internal.io/investigations/agent-gallery
 * and /agents, read 2026-10-22): a header on a fading grid, quick actions, cards with pixel marks, and a details drawer
 * from the right. Shallow: the data is fixed (data/product-agents.ts), switches only change local state, nothing runs.
 */

const runsOnIcon: Record<RunsOn, Icon> = { CVE: IconBug, SAST: IconBug, Branch: IconGitBranch, Secret: IconKey, Deployable: IconFolderCode }
const capabilityIcon: Record<Capability, Icon> = { "Internet search": IconWorldSearch, "Knowledge graph": IconAffiliate, Memory: IconBrain }
const outcomeIcon: Record<OutcomeIcon, Icon> = {
  "circle-dot": IconCircleDot, swords: IconSwords, "shield-check": IconShieldCheck, "shield-x": IconShieldX,
  "alert-square": IconAlertSquareRounded, "alert-square-off": IconAlertSquareRoundedOff, "alert-triangle": IconAlertTriangle,
  x: IconX, "alert-circle": IconAlertCircle, question: IconQuestionMark, "circle-minus": IconCircleMinus, bulb: IconBulb, clock: IconClock,
}
const toneVars = (tone: string) => ({ "--agent-fill": `var(--${tone}-fill)`, "--agent-text": `var(--${tone}-text)` }) as React.CSSProperties

// The agent's pixel mark: a faint grid with its filled cells; agents are 5×5, sub-agents 3×3
function PixelMark({ agent, className, muted }: { agent: ProductAgent; className?: string; muted?: boolean }) {
  const n = agent.kind === "Agent" ? 5 : 3
  const grid = Array.from({ length: n + 1 }, (_, i) => `M${i} -1V${n + 1}M-1 ${i}H${n + 1}`).join("")
  return (
    <span style={toneVars(agent.tone)} className={cn("flex shrink-0 overflow-hidden rounded-sm border border-current/25", muted ? "bg-muted text-muted-foreground" : "bg-(--agent-fill) text-(--agent-text)", className)}>
      <svg aria-hidden viewBox={`-1 -1 ${n + 2} ${n + 2}`} className="size-full">
        <path d={grid} stroke="currentColor" strokeOpacity="0.14" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        <path d={agent.pixels} fill="currentColor" fillOpacity="0.6" />
      </svg>
    </span>
  )
}

function RunsOnTag({ kind }: { kind: RunsOn }) {
  const I = runsOnIcon[kind]
  return (
    <span className="flex h-5 w-fit shrink-0 items-center gap-1 rounded-sm border border-transparent bg-foreground/5 px-1 text-xs text-foreground/60">
      <I className="size-3.5 shrink-0" />
      <span className="truncate">{kind}</span>
    </span>
  )
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={(e) => { e.stopPropagation(); onChange(!on) }} className="flex cursor-pointer items-center">
      <span className={cn("relative h-4 w-7 shrink-0 rounded-full transition-colors", on ? "bg-emerald-500" : "bg-muted-foreground/35")}>
        <span className={cn("absolute top-0.5 size-3 rounded-full bg-background transition-all", on ? "left-3.5" : "left-0.5")} />
      </span>
    </button>
  )
}

function QuickAction({ icon: I, label, onClick }: { icon: Icon; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex h-7 cursor-pointer items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 text-sm text-blue-700 transition-colors outline-none hover:border-blue-300 hover:bg-blue-100">
      <I className="-ml-0.5 size-3.5" />
      {label}
      <IconChevronRight className="-mr-0.5 size-3.5" />
    </button>
  )
}

// Title, description and quick actions on a grid that fades in toward the line under it; tabs sit on that line
function PageHeader({ title, description, actions, children }: { title: string; description: string; actions: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className={cn("relative -mx-20 -mt-4 flex flex-col items-start gap-3 px-20 pt-20 after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-border lg:-mx-32 lg:px-32", children ? "pb-0" : "pb-6")}>
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-bottom opacity-60 [mask-image:linear-gradient(to_top,black,transparent)]" style={{ backgroundSize: "24px 24px" }} />
      <h1 className="relative text-4xl font-normal tracking-tighter">{title}</h1>
      <p className="relative max-w-2xl text-[17px] leading-relaxed text-primary/70">{description}</p>
      <div className="relative mt-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs tracking-wider text-muted-foreground uppercase">Quick actions</span>
        {actions}
      </div>
      {children}
    </header>
  )
}

function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { id: T; label: string; icon: Icon }[]; value: T; onChange: (id: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cn("relative z-10 flex items-center", className)}>
      {tabs.map(({ id, label, icon: I }) => (
        <button key={id} type="button" role="tab" aria-selected={value === id} onClick={() => onChange(id)}
          className={cn("flex cursor-pointer items-center gap-1.5 border-b-2 py-2.5 text-base transition-colors", value === id ? "border-foreground text-foreground" : "border-transparent text-foreground/65 hover:border-foreground/25 hover:text-foreground")}>
          <I className="size-4" />
          {label}
        </button>
      ))}
    </div>
  )
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative w-full max-w-md min-w-56">
      <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search agents" aria-label="Search agents"
        className="h-9 w-full rounded-md border border-input bg-transparent py-1 pr-3 pl-9 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-foreground/30" />
    </div>
  )
}

// A card: mark, name (and runs-on tags, or your switch and menu), three lines of description; hover lifts it and shows a chevron rail
function AgentCard({ agent, onOpen, enabled, onToggle }: { agent: ProductAgent; onOpen: () => void; enabled?: boolean; onToggle?: (on: boolean) => void }) {
  const mine = onToggle !== undefined
  const off = mine && !enabled
  return (
    <article className="group relative flex flex-col gap-3 rounded-2xl border bg-card p-4 pr-8 shadow-xs transition-[border-color,box-shadow,translate] duration-200 ease-out hover:-translate-y-1 hover:border-foreground/30 hover:shadow-lg hover:shadow-foreground/10">
      <div className="flex items-center gap-3">
        <PixelMark agent={agent} className={cn("size-11", off && "opacity-50")} />
        <div className="flex min-w-0 flex-1 flex-col">
          <button type="button" onClick={onOpen} className={cn("cursor-pointer truncate text-left text-base leading-snug font-medium outline-none after:absolute after:inset-0 after:rounded-2xl group-hover:text-foreground", off && "text-muted-foreground")}>
            {agent.name}
          </button>
          {!mine && agent.runsOn.length > 0 && (
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1">{agent.runsOn.map((r) => <RunsOnTag key={r} kind={r} />)}</div>
          )}
        </div>
        {mine && (
          <div className="relative z-10 flex shrink-0 items-center gap-1">
            <Switch on={!!enabled} onChange={onToggle} label={`Enabled: ${agent.name}`} />
            <button type="button" aria-label="More actions" className="flex size-7 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-muted">
              <IconDots className="size-4" />
            </button>
          </div>
        )}
      </div>
      <p className="mt-1 line-clamp-3 text-[15px] leading-relaxed text-foreground/70 transition-colors group-hover:text-foreground/85">{agent.description}</p>
      <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 flex w-8 items-center justify-center rounded-r-2xl border-l border-foreground/8 bg-foreground/3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <span className="-translate-x-2.5 transition-[translate] delay-200 duration-0 group-hover:translate-x-0 group-hover:delay-0 group-hover:duration-200">
          <IconChevronRight className="size-4" />
        </span>
      </span>
    </article>
  )
}

function Grid({ children, empty }: { children: React.ReactNode[]; empty: string }) {
  if (children.length === 0) return <p className="py-10 text-center text-sm text-muted-foreground">{empty}</p>
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">{children}</div>
}

function Section({ icon: I, title, children }: { icon: Icon; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h4 className="flex items-center gap-2 text-sm text-muted-foreground"><I className="size-4" />{title}</h4>
      <div className="text-[15px] leading-relaxed">{children}</div>
    </section>
  )
}

function Prompt({ text }: { text: string }) {
  const [full, setFull] = useState(false)
  return (
    <section className="flex flex-col">
      <h4 className="ml-3 flex w-fit items-center gap-2 rounded-t-lg border border-b-0 bg-muted/40 px-2.5 py-1 text-sm text-muted-foreground"><IconPrompt className="size-4" />Prompt</h4>
      <div className="overflow-hidden rounded-xl border bg-muted/40">
        <pre className={cn("px-4 font-mono text-[13px] leading-relaxed text-foreground", !full && "max-h-48 overflow-hidden [mask-image:linear-gradient(to_bottom,black_calc(100%-2.5rem),transparent)]")}>
          {text.split("\n").map((line, i, all) => (
            <div key={i} className={cn("flex gap-3", i === 0 && "*:pt-3", i === all.length - 1 && "*:pb-3")}>
              <span aria-hidden className="box-content shrink-0 border-r pr-3 text-right text-muted-foreground/50 select-none" style={{ width: "2ch" }}>{i + 1}</span>
              <span className="min-w-0 flex-1 break-words whitespace-pre-wrap">{line || " "}</span>
            </div>
          ))}
        </pre>
        <button type="button" onClick={() => setFull(!full)} className="flex w-full cursor-pointer items-center justify-center gap-1.5 border-t py-2 text-sm text-muted-foreground hover:text-foreground">
          <IconArrowsMaximize className="size-3.5" />
          {full ? "Show less" : "View full prompt"}
        </button>
      </div>
    </section>
  )
}

type DrawerTab = "overview" | "triggers" | "activity"
// The details drawer, from the right (55vw, 45vw on wide screens), over a dimmed page
function AgentDrawer({ agent, onClose, onOpen, enabled, onToggle }: { agent: ProductAgent; onClose: () => void; onOpen: (id: string) => void; enabled?: boolean; onToggle?: (on: boolean) => void }) {
  const mine = onToggle !== undefined
  const [tab, setTab] = useState<DrawerTab>("overview")
  const [more, setMore] = useState(false)
  // opening a sub-agent from the list swaps the drawer's agent: start it on Overview again
  const [shown, setShown] = useState(agent.id)
  if (shown !== agent.id) { setShown(agent.id); setTab("overview"); setMore(false) }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])
  const long = mine && agent.description.length > 220
  const tabs: { id: DrawerTab; label: string; icon: Icon }[] = [
    { id: "overview", label: "Overview", icon: IconListDetails },
    ...(mine ? [{ id: "triggers" as const, label: "Triggers", icon: IconBolt }] : []),
    { id: "activity", label: "Activity", icon: IconActivity },
  ]
  const createdBy = mine ? agent.createdBy : "Rival"

  return createPortal(
    <div className="product fixed inset-0 z-50 bg-transparent!">
      <div className="absolute inset-0 bg-black/10 animate-in fade-in" onClick={onClose} />
      <div role="dialog" aria-label="Agent Details" className="absolute inset-y-0 right-0 flex w-[55vw] flex-col border-l bg-background shadow-xl animate-in slide-in-from-right duration-300 2xl:w-[45vw]">
        <div className="flex items-center gap-2 px-4 pt-4 pb-3">
          <PixelMark agent={agent} className="size-11" />
          <div className="flex min-w-0 flex-1 flex-col">
            <h3 className="line-clamp-2 text-lg text-primary">{agent.name}</h3>
            <div className="text-sm text-muted-foreground">{agent.kind}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {mine && <span className="mr-1"><Switch on={!!enabled} onChange={onToggle} label={`Enabled: ${agent.name}`} /></span>}
            <button type="button" aria-label="Close" onClick={onClose} className="flex size-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted"><IconX className="size-4" /></button>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-10 gap-y-4 px-4">
          {createdBy && (
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-sm text-muted-foreground">Created by</span>
              <span className="flex min-h-6 items-center gap-1.5 text-[15px]">
                {!mine && <RivalMark className="h-[15px] w-3 text-[#0350d0]" />}
                {createdBy}
              </span>
            </div>
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-sm text-muted-foreground">Capabilities</span>
            <span className="flex min-h-6 flex-wrap items-center gap-1.5">
              {agent.capabilities.map((c) => {
                const I = capabilityIcon[c]
                return <span key={c} className="flex h-7 items-center gap-1.5 rounded-md border border-foreground/12 bg-foreground/6 px-2 text-sm text-foreground/80"><I className="size-4" />{c}</span>
              })}
            </span>
          </div>
        </div>

        <Tabs tabs={tabs} value={tab} onChange={setTab} className="mt-4 gap-4 border-b px-4" />

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === "overview" && (
            <div className="flex flex-col gap-6">
              <Section icon={IconFileDescription} title="Description">
                <p>{long && !more ? `${agent.description.slice(0, 220).trimEnd()}...` : agent.description}</p>
                {long && <button type="button" onClick={() => setMore(!more)} className="mt-1 cursor-pointer text-(--type-wiz-text)">{more ? "Read Less" : "Read More"}</button>}
              </Section>
              {agent.outcomes.length > 0 && (
                <Section icon={IconFlag} title="Outcomes">
                  <div className="flex flex-wrap items-center gap-2">
                    {agent.outcomes.map((o) => {
                      const I = outcomeIcon[o.icon]
                      return (
                        <span key={o.label} className="flex h-6 shrink-0 items-center gap-1 rounded-full border ps-1.5 pe-2 whitespace-nowrap" style={{ backgroundColor: `var(--${o.tone}-fill)`, borderColor: `var(--${o.tone}-stroke)`, color: `var(--${o.tone}-text)` }}>
                          <I className="size-3.5" /><span className="text-xs">{o.label}</span>
                        </span>
                      )
                    })}
                  </div>
                </Section>
              )}
              {agent.subAgents && (
                <Section icon={IconSitemap} title="Sub-agents">
                  <ol className="relative mt-1 flex flex-col gap-3">
                    <span aria-hidden className="absolute top-4.5 bottom-4.5 left-4.5 w-px -translate-x-1/2 bg-border" />
                    {agent.subAgents.map((id) => {
                      const sub = findProductAgent(id)
                      if (!sub) return null
                      return (
                        <li key={id} className="relative">
                          <button type="button" title={sub.description} onClick={() => onOpen(id)} className="group/step flex w-full cursor-pointer items-center gap-3 text-left">
                            <span className="rounded-sm bg-background">
                              <PixelMark agent={sub} muted className="size-9 transition-colors duration-200 group-hover/step:bg-(--agent-fill) group-hover/step:text-(--agent-text)" />
                            </span>
                            <span className="min-w-0 truncate text-base underline decoration-foreground/15 underline-offset-4 transition-colors group-hover/step:decoration-foreground/40">{sub.name}</span>
                            <IconChevronRight className="size-4 text-muted-foreground" />
                          </button>
                        </li>
                      )
                    })}
                  </ol>
                </Section>
              )}
              {agent.prompt && <Prompt text={agent.prompt} />}
            </div>
          )}
          {tab === "triggers" && <p className="py-10 text-center text-sm text-muted-foreground">This agent has no triggers</p>}
          {tab === "activity" && <p className="py-10 text-center text-sm text-muted-foreground">No runs yet</p>}
        </div>

        {!mine && (
          <div className="border-t bg-background p-2">
            <button type="button" title="Rival agents can't be used yet" className="group/use relative flex h-10 w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg border border-blue-500/25 bg-blue-500/10 text-[15px] font-medium text-blue-700 transition-[translate,box-shadow,background-color,border-color] duration-200 hover:-translate-y-px hover:border-blue-500/40 hover:bg-blue-500/15 hover:shadow-sm hover:shadow-blue-500/15">
              <span aria-hidden className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-linear-to-r from-transparent via-white/40 to-transparent transition-[left] duration-700 ease-out group-hover/use:left-full" />
              Use Agent
              <span className="ml-1 inline-flex items-center gap-1">
                {["⌘", "⏎"].map((k) => <kbd key={k} className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-blue-500/15 px-1 font-sans text-xs font-medium text-blue-700">{k}</kbd>)}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

// The page frame both pages share: product colors and font, centered column with the product's padding
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="product h-[calc(100svh-3rem)] w-full overflow-x-hidden overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[120rem] flex-col gap-4 px-20 py-4 lg:px-32">{children}</div>
    </div>
  )
}

const matches = (a: ProductAgent, q: string) => !q || `${a.name} ${a.description}`.toLowerCase().includes(q.toLowerCase())
const filterKinds: RunsOn[] = ["CVE", "SAST", "Branch", "Secret"]

export function RivalAgentsPage() {
  const { navigate } = useNav()
  const [tab, setTab] = useState<"agents" | "subAgents">("agents")
  const [query, setQuery] = useState("")
  const [kinds, setKinds] = useState<RunsOn[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const list = (tab === "agents" ? rivalAgents : rivalSubAgents).filter((a) => matches(a, query) && (kinds.length === 0 || a.runsOn.some((r) => kinds.includes(r))))
  const opened = open ? findProductAgent(open) : undefined

  return (
    <Frame>
      <PageHeader
        title="Rival Agents"
        description="Built-in agents investigate your findings and assets, and each run ends in one of the agent's outcomes."
        actions={<>
          <QuickAction icon={IconMessageCircle} label="Create in chat" onClick={() => navigate("chat")} />
          <QuickAction icon={IconRobot} label="My Agents" onClick={() => navigate("gallery")} />
          <QuickAction icon={IconActivity} label="Activity" onClick={() => navigate("agents")} />
        </>}
      >
        <Tabs className="mt-5 gap-6" value={tab} onChange={setTab} tabs={[{ id: "agents", label: "Agents", icon: IconRobot }, { id: "subAgents", label: "Sub-agents", icon: IconSitemap }]} />
      </PageHeader>
      <div className="flex flex-col gap-6 pb-4">
        <div className="flex items-center gap-3 py-2">
          <SearchBox value={query} onChange={setQuery} />
          <div role="group" aria-label="Runs on" className="flex shrink-0 items-center gap-2">
            {filterKinds.map((k) => {
              const on = kinds.includes(k)
              const I = runsOnIcon[k]
              return (
                <button key={k} type="button" aria-pressed={on} onClick={() => setKinds(on ? kinds.filter((x) => x !== k) : [...kinds, k])}
                  className={cn("flex h-9 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-sm shadow-xs transition-colors", on ? "border-foreground/30 bg-foreground/5 text-foreground" : "border-input text-muted-foreground hover:text-foreground")}>
                  <I className="size-4" />{k}
                </button>
              )
            })}
          </div>
        </div>
        <Grid empty="No agents match">
          {list.map((a) => <AgentCard key={a.id} agent={a} onOpen={() => setOpen(a.id)} />)}
        </Grid>
      </div>
      {opened && <AgentDrawer agent={opened} onClose={() => setOpen(null)} onOpen={setOpen} />}
    </Frame>
  )
}

export function MyAgentsPage() {
  const { navigate } = useNav()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState<string | null>(null)
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => Object.fromEntries(myAgents.map((a) => [a.id, !!a.enabled])))
  const toggle = (id: string) => (on: boolean) => setEnabled((e) => ({ ...e, [id]: on }))
  const list = useMemo(() => myAgents.filter((a) => matches(a, query)), [query])
  const opened = open ? findProductAgent(open) : undefined
  const openedMine = opened && myAgents.some((a) => a.id === opened.id)

  return (
    <Frame>
      <PageHeader
        title="My Agents"
        description="Agents built for your organization. Ask the assistant in chat to create your own."
        actions={<>
          <QuickAction icon={IconMessageCircle} label="Create in chat" onClick={() => navigate("chat")} />
          <QuickAction icon={IconRobot} label="Rival Agents" onClick={() => navigate("explorer")} />
          <QuickAction icon={IconActivity} label="Activity" onClick={() => navigate("agents")} />
        </>}
      />
      <div className="flex flex-col gap-6 pt-2 pb-4">
        <SearchBox value={query} onChange={setQuery} />
        <Grid empty="No agents match">
          {list.map((a) => <AgentCard key={a.id} agent={a} onOpen={() => setOpen(a.id)} enabled={enabled[a.id]} onToggle={toggle(a.id)} />)}
        </Grid>
      </div>
      {opened && (openedMine
        ? <AgentDrawer agent={opened} onClose={() => setOpen(null)} onOpen={setOpen} enabled={enabled[opened.id]} onToggle={toggle(opened.id)} />
        : <AgentDrawer agent={opened} onClose={() => setOpen(null)} onOpen={setOpen} />)}
    </Frame>
  )
}
