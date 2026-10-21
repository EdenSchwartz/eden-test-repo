import { PanelOutcomes, PanelProp, PanelRival, PanelSection, PanelTags } from "@/components/tasks/panel-ui"
import { ChevronRight, Layers } from "lucide-react"
import { agents, type AgentKind } from "@/components/chat/agents"
import { StatusChip } from "@/components/tasks/status-chip"
import { CardShell } from "@/components/tasks/template-card"
import { subOutcomes } from "@/data/outcomes"
import { DrawerTopBar, EnabledToggle, type DrawerNav } from "@/components/tasks/template-detail"
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

export function SubAgentDetail({ kind, color, mark, categories, nav, template, onClose, onOpenAgent }: { kind: AgentKind; color?: string; categories?: string[]; nav?: DrawerNav; mark?: React.ReactNode; template?: boolean; onClose: () => void; onOpenAgent: (sa: SuperAgent) => void }) {
  const { convs } = useConversations()
  const a = agents[kind]
  const Icon = a.icon
  const status = subAgentStatus(kind, convs)
  const used = usedBy(kind)
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <DrawerTopBar nav={nav} onClose={onClose}>
        {!template && <EnabledToggle id={`sub:${kind}`} name={subName(kind)} />}
      </DrawerTopBar>
      {/* Same header as an agent's panel (template-detail.tsx, after the Figma side panel) */}
      <div className="flex shrink-0 flex-col items-start gap-5 px-5 pt-5 pb-5">
        <div className="flex w-full min-w-0 items-center gap-3">
          {mark ?? <ColorTile color={color ?? colorFor(`sub:${kind}`)} icon={Icon} />}
          <div className="flex min-w-0 flex-col gap-1.5">
            <h2 className="min-w-0 font-sans text-title leading-5 font-medium tracking-[-0.3px] whitespace-nowrap text-fg-primary">{subName(kind)}</h2>
            <p className="text-body leading-5 text-pretty text-fg-secondary">{a.role}.</p>
          </div>
        </div>
        <dl className="flex flex-nowrap items-center gap-x-10 overflow-hidden">
          {template ? <PanelProp label="Created by"><PanelRival /></PanelProp> : <PanelProp label="Status"><StatusChip status={status} /></PanelProp>}
          {categories && <PanelProp label="Category"><PanelTags items={categories} /></PanelProp>}
          <PanelProp label="Used in"><span className="text-body leading-5 text-fg-primary">{used.length} {used.length === 1 ? "agent" : "agents"}</span></PanelProp>
        </dl>
      </div>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto border-t border-solid border-[#ececec] px-5 py-5 text-body">
        {subOutcomes[kind] && (
          <PanelSection title="Outcomes">
            <PanelOutcomes items={subOutcomes[kind]} />
          </PanelSection>
        )}
        <PanelSection title="Part of" gap="md">
          {used.length === 0 ? (
            <p className="text-fg-secondary">No agent uses it yet.</p>
          ) : (
            <ul className="divide-y divide-hairline overflow-hidden rounded-xl border bg-card">
              {used.map((sa) => {
                const SaIcon = sa.icon
                return (
                  <li key={sa.id}>
                    <button onClick={() => onOpenAgent(sa)} className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-wash/45">
                      <ColorTile color={colorFor(sa.name)} icon={SaIcon} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-body font-medium text-fg-primary">{sa.name}</span>
                        <span className="block text-small text-fg-secondary">{sa.custom ? "Your agent" : "Rival template"}</span>
                      </span>
                      <ChevronRight className="size-3.5 text-fg-secondary" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </PanelSection>
      </div>
    </div>
  )
}
