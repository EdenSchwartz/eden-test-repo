import { useState } from "react"
import { ActivityIcon, OverviewIcon, PanelOutcomes, PanelProp, PanelRival, PanelSection, PanelUseButton } from "@/components/tasks/panel-ui"
import { Layers } from "lucide-react"
import { agents, type AgentKind } from "@/components/chat/agents"
import { StatusChip } from "@/components/tasks/status-chip"
import { CardShell } from "@/components/tasks/template-card"
import { subOutcomes } from "@/data/outcomes"
import { DrawerTabs, DrawerTopBar, EnabledToggle, type Crumb, type DrawerNav } from "@/components/tasks/template-detail"
import { superAgents, type SuperAgent } from "@/data/super-agents"
import { useConversations } from "@/lib/conversations"
import { subAgentStatus, type TaskStatus } from "@/lib/task-status"
import { ColorTile, colorFor } from "@/components/tasks/color-tile"

/*
 * Sub agents on the Agents page (pages/gallery.tsx, "Sub agents" in the switch): the single-mission helpers
 * (components/chat/agents.ts) that agents are built from, e.g. Exploitability, Ownership.
 * Card: same shell as an agent card, with its status chip and Enabled switch; the footer says which agents use it.
 * Panel: what it does, its status, and the agents it's part of (click one to open it).
 * template (first visit, nothing of yours runs yet): shown like Rival's templates, "Rival" in the footer,
 * no status and no switch.
 */

export const subName = (kind: AgentKind) => agents[kind].name.replace(/ agent$/, "")
export const usedBy = (kind: AgentKind) => superAgents.filter((sa) => sa.pattern.flat().includes(kind))

export function SubAgentCard({ kind, status, template, selected, delay, onSelect }: {
  kind: AgentKind
  status?: TaskStatus
  template?: boolean
  selected?: boolean
  delay?: number
  onSelect: (kind: AgentKind) => void
}) {
  const a = agents[kind]
  const n = usedBy(kind).length
  return (
    <CardShell
      id={`sub-${kind}`} name={subName(kind)} icon={a.icon} text={a.short} selected={selected} delay={delay} status={status}
      toggle={template ? undefined : `sub:${kind}`} by="rival" onSelect={() => onSelect(kind)}
      footer={<>
        {template && (
          <span className="inline-flex items-center gap-1.5">
            <img src="/rival-logo.png" alt="" className="size-3.5" />
            Rival
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <Layers className="size-3.5" />
          {n === 0 ? "Not in any agent yet" : `In ${n} ${n === 1 ? "agent" : "agents"}`}
        </span>
      </>}
    />
  )
}

// A sub agent's panel, after the Figma "Sub-agent Side Panel" (page "20.10 - Side Panel", node 85:21446): breadcrumbs
// (or the arrows), the tinted step mark (44px) and the name (Geist Medium 24/26.4), then Created by · Type (a blue
// "Read-only" chip) · Capabilities, 27 apart; tabs Overview and Activity; Overview has the description, the outcomes
// and Part of — the agents that use it, as rows with the agents' own marks; Use Agent at the bottom.
const subAbout: Partial<Record<AgentKind, string>> = {
  exploitability: "Investigates whether a CVE found by a code dependency scan is actually exploitable by tracing how the vulnerable package is loaded, reached, and fed user input.",
}
// the design's outcome colours here (Exploitable deep red, Not exploitable green, Unclear amber, Failed red)
const subBars = { risk: "#73112f", clear: "#7ab005", good: "#7ab005", unclear: "#fda501", warn: "#fda501", failed: "#db0509" } as const

export function SubAgentDetail({ kind, color, mark, nav, crumbs, template, capabilities, partOf, onUse, onClose, onOpenAgent }: {
  kind: AgentKind; color?: string; categories?: string[]; nav?: DrawerNav; crumbs?: Crumb[]; mark?: React.ReactNode; template?: boolean
  capabilities?: React.ReactNode // as on its card; else "Read only"
  partOf?: React.ReactNode // the agents that use it (rows), built by the library; else the demo's own list
  onUse?: () => void
  onClose: () => void; onOpenAgent: (sa: SuperAgent) => void
}) {
  const { convs } = useConversations()
  const a = agents[kind]
  const Icon = a.icon
  const status = subAgentStatus(kind, convs)
  const used = usedBy(kind)
  const [tab, setTab] = useState<"overview" | "activity">("overview")
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <DrawerTopBar nav={crumbs ? undefined : nav} crumbs={crumbs} onClose={onClose}>
        {!template && <EnabledToggle id={`sub:${kind}`} name={subName(kind)} />}
      </DrawerTopBar>
      {/* ---------- Name + properties (20 top, 24 bottom) ---------- */}
      <div className="flex shrink-0 flex-col items-start gap-5 px-5 pt-5 pb-6">
        <div className="flex w-full min-w-0 items-center gap-3">
          {mark ?? <ColorTile color={color ?? colorFor(`sub:${kind}`)} icon={Icon} />}
          <h2 className="min-w-0 font-sans text-[1.5rem] leading-[26.4px] font-medium tracking-[-0.36px] whitespace-nowrap text-fg-primary">{subName(kind)}</h2>
        </div>
        <dl className="flex flex-nowrap items-center gap-x-[27px] overflow-hidden">
          {template ? <PanelProp label="Created by"><PanelRival /></PanelProp> : <PanelProp label="Status"><StatusChip status={status} /></PanelProp>}
          <PanelProp label="Type"><span className="flex h-5 items-center rounded-[4px] bg-[#ecf3ff] px-1.5 text-small leading-4 text-[#0350d0]">Read-only</span></PanelProp>
          <PanelProp label="Capabilities">{capabilities ?? <span className="text-body leading-5 text-fg-primary">Read only</span>}</PanelProp>
        </dl>
      </div>
      <DrawerTabs tabs={[{ id: "overview" as const, label: "Overview", icon: OverviewIcon }, { id: "activity" as const, label: "Activity", icon: ActivityIcon }]} active={tab} onChange={setTab} />
      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto px-5 py-5 text-body">
        {tab === "overview" ? (
          <div className="flex flex-col gap-6">
            <PanelSection title="Description">
              <p className="text-body leading-[21px] text-pretty text-fg-primary">{subAbout[kind] ?? `${a.role}.`}</p>
            </PanelSection>
            {subOutcomes[kind] && (
              <PanelSection title="Outcomes">
                <PanelOutcomes items={subOutcomes[kind]} bars={subBars} />
              </PanelSection>
            )}
            <PanelSection title="Part of">
              {partOf ?? (used.length === 0 ? (
                <p className="text-fg-secondary">No agent uses it yet.</p>
              ) : (
                <ul className="flex w-full flex-col gap-2">
                  {used.map((sa) => {
                    const SaIcon = sa.icon
                    return (
                      <li key={sa.id}>
                        <PartOfRow onClick={() => onOpenAgent(sa)} mark={<ColorTile color={colorFor(sa.name)} icon={SaIcon} size="sm" />} name={sa.name} />
                      </li>
                    )
                  })}
                </ul>
              ))}
            </PanelSection>
          </div>
        ) : (
          <p className="text-body leading-5 text-fg-secondary">No activity yet. Runs of {subName(kind)} will show here.</p>
        )}
      </div>
      {onUse && (
        <div className="flex shrink-0 border-t border-solid border-[#ebeced] px-5 py-3">
          <PanelUseButton onClick={onUse} />
        </div>
      )}
    </div>
  )
}

// A row in Part of (Figma 86:21772): white 80%, a #E5E3E3 edge inside, 6px corners, a soft shadow; 6px padding, the
// agent's mark (28px), its name, a chevron at the end; 8 apart. The whole row opens that agent.
// Hover, like the How it works steps but quieter: the row nudges 1px right, its edge firms, the chevron steps 2px on.
export function PartOfRow({ mark, name, onClick }: { mark: React.ReactNode; name: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group/row flex w-full cursor-pointer items-center gap-3 rounded-[6px] bg-white/80 p-1.5 text-left shadow-[inset_0_0_0_1px_#e5e3e3,0px_1px_1px_0px_rgba(56,61,69,0.08)] transition-[transform,box-shadow,background-color] duration-200 ease-out hover:translate-x-px hover:bg-white hover:shadow-[inset_0_0_0_1px_#d6d3d1,0px_2px_4px_0px_rgba(56,61,69,0.1)] motion-reduce:hover:translate-x-0">
      {mark}
      <span className="min-w-0 flex-1 truncate text-body leading-5 font-medium text-fg-primary">{name}</span>
      <span aria-hidden className="grid place-items-center p-1 text-fg-secondary transition-transform duration-200 ease-out group-hover/row:translate-x-0.5 motion-reduce:group-hover/row:translate-x-0"><svg viewBox="0 0 12 12" fill="none" className="size-3"><path d="M4.5 2L8.14645 5.64644C8.34171 5.8417 8.34171 6.15828 8.14645 6.35354L4.5 10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
    </button>
  )
}
