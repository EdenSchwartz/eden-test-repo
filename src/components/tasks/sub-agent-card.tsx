import { ChevronRight, FileText, Flag, Layers, X } from "lucide-react"
import { agents, type AgentKind } from "@/components/chat/agents"
import { StatusChip } from "@/components/tasks/status-chip"
import { CardShell } from "@/components/tasks/template-card"
import { Outcomes } from "@/components/tasks/outcomes"
import { subOutcomes } from "@/data/outcomes"
import { EnabledToggle, Prop, Section } from "@/components/tasks/template-detail"
import { superAgents, type SuperAgent } from "@/data/super-agents"
import { useConversations } from "@/lib/conversations"
import { subAgentStatus, type TaskStatus } from "@/lib/task-status"

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

export function SubAgentDetail({ kind, template, onClose, onOpenAgent }: { kind: AgentKind; template?: boolean; onClose: () => void; onOpenAgent: (sa: SuperAgent) => void }) {
  const { convs } = useConversations()
  const a = agents[kind]
  const Icon = a.icon
  const status = subAgentStatus(kind, convs)
  const used = usedBy(kind)
  return (
    <div className="flex h-full min-h-0 flex-col bg-popover">
      <div className="shrink-0 space-y-4 px-5 pt-5 pb-4">
        <div className="flex items-start gap-3">
          <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-wash text-blue [&_svg]:size-5">
            <Icon />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="font-title text-2xl leading-[1.1] font-medium tracking-[-0.015em] [--title-wght:450]">{subName(kind)}</h2>
            <p className="text-sm text-muted-foreground">Sub agent by Rival</p>
          </div>
          {!template && <EnabledToggle id={`sub:${kind}`} name={subName(kind)} />}
          <button
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
          {template ? <Prop label="Created by">Rival</Prop> : <Prop label="Status"><StatusChip status={status} className="mt-0.5" /></Prop>}
          <Prop label="Used in">{used.length} {used.length === 1 ? "agent" : "agents"}</Prop>
        </dl>
      </div>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto border-t border-hairline px-5 py-5 text-sm">
        <Section icon={FileText} title="What it does">
          <p className="leading-normal text-pretty">{a.role}.</p>
        </Section>
        {subOutcomes[kind] && (
          <Section icon={Flag} title="Outcomes">
            <Outcomes items={subOutcomes[kind]} />
          </Section>
        )}
        <Section icon={Layers} title="Part of">
          {used.length === 0 ? (
            <p className="text-muted-foreground">No agent uses it yet.</p>
          ) : (
            <ul className="divide-y divide-hairline overflow-hidden rounded-xl border bg-card">
              {used.map((sa) => {
                const SaIcon = sa.icon
                return (
                  <li key={sa.id}>
                    <button onClick={() => onOpenAgent(sa)} className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-wash/45">
                      <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-wash text-blue [&_svg]:size-3.5"><SaIcon /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{sa.name}</span>
                        <span className="block text-xs text-muted-foreground">{sa.custom ? "Your agent" : "Rival template"}</span>
                      </span>
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Section>
      </div>
    </div>
  )
}
