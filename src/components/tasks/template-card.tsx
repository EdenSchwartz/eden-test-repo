import { ArrowRight, Bot, Clock } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { LucideIcon } from "lucide-react"
import { StatusChip } from "@/components/tasks/status-chip"
import { blockers, type SuperAgent } from "@/data/super-agents"
import type { TaskStatus } from "@/lib/task-status"
import { useEnabled } from "@/lib/enabled"
import { cn } from "@/lib/utils"

/*
 * Agent card for the Agents page (pages/gallery.tsx), in the Rival Harness style (the reference demo's agent cards):
 * a blue-washed icon + name, a description of at most two lines (kept short in the copy, never cut off), and a quiet
 * footer: who made it · sub agents · time per run.
 * Your own agents (status): the status chip top right (components/tasks/status-chip.tsx); the footer is
 * "6 agents · ~8 min" and who made it, as an avatar. The Enabled switch lives in the panel's header
 * (template-detail.tsx); switched off, the card fades back and the chip says Stopped.
 * The card is a container with one stretched button over it (opens the panel), so the switch can sit inside.
 */

export function TemplateCard({ sa, selected, onSelect, delay = 0, status }: {
  sa: SuperAgent
  selected?: boolean
  onSelect: (sa: SuperAgent) => void
  delay?: number
  status?: TaskStatus
}) {
  const setup = blockers(sa).length > 0
  return (
    <CardShell
      id={sa.id} name={sa.name} icon={sa.icon} text={sa.tagline} selected={selected} delay={delay} status={status}
      onSelect={() => onSelect(sa)} toggle={status ? sa.id : undefined} by={sa.custom ? "you" : "rival"}
      footer={status ? (
        // Your agents: the chip and the avatar take room, so agents and time share one quiet line
        <span className="truncate">{sa.pattern.flat().length} agents · ~{sa.runtime}</span>
      ) : <>
        <span className="inline-flex items-center gap-1.5">
          <img src="/rival-logo.png" alt="" className="size-3.5" />
          {sa.custom ? "You" : "Rival"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Bot className="size-3.5" />
          {sa.pattern.flat().length} agents
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5" />
          ~{sa.runtime}
        </span>
        {setup && (
          <span className="inline-flex items-center gap-1.5 font-semibold whitespace-nowrap text-warning">
            <span aria-hidden className="size-1.5 rounded-full bg-warning" />
            Needs setup
          </span>
        )}
      </>}
    />
  )
}

// The card itself, shared with sub agent cards (components/tasks/sub-agent-card.tsx)
export function CardShell({ id, name, icon: Icon, text, footer, selected, delay = 0, status, toggle, by, onSelect }: {
  id: string
  name: string
  icon: LucideIcon
  text: string
  footer: React.ReactNode
  selected?: boolean
  delay?: number
  status?: TaskStatus
  toggle?: string // the Enabled key (lib/enabled.ts): switched off, the card fades back; none on Rival's templates
  by?: "you" | "rival" // who made it, as an avatar at the end of the footer (only with toggle: your agents and sub agents)
  onSelect: () => void
}) {
  const { isEnabled } = useEnabled()
  const off = !!toggle && !isEnabled(toggle)
  return (
    <div
      data-selected={selected || undefined}
      data-attention={status?.tone === "attention" || undefined}
      className="pressable rise-in relative flex flex-col gap-4 rounded-xl p-4 text-left has-[>button:first-child:focus-visible]:ring-2 has-[>button:first-child:focus-visible]:ring-ring/50"
      // viewTransitionName: each card glides to its new spot when the page splits or closes (pages/gallery.tsx)
      style={{ "--delay": `${delay}ms`, viewTransitionName: `tpl-${id}` } as React.CSSProperties}
    >
      <button onClick={onSelect} aria-pressed={selected} aria-label={name} className="absolute inset-0 cursor-pointer rounded-xl outline-none" />
      {/* Switched off: everything fades back except the chip, which says Stopped */}
      <span className="pointer-events-none flex flex-col gap-2.5">
        <span className="flex items-center gap-3">
          <span aria-hidden className={cn("card-icon flex size-8 shrink-0 items-center justify-center rounded-lg bg-wash text-blue transition-opacity [&_svg]:size-4", off && "opacity-50")}>
            <Icon />
          </span>
          <span className={cn("min-w-0 flex-1 truncate text-sm leading-normal font-semibold transition-opacity", off && "opacity-50")}>{name}</span>
          {status && <StatusChip status={status} className="-mr-1" />}
        </span>
        <span className={cn("text-sm leading-normal text-pretty text-muted-foreground transition-opacity", off && "opacity-50")}>{text}</span>
      </span>
      <span className="pointer-events-none mt-auto flex items-center gap-x-3 border-t border-hairline pt-3 text-xs whitespace-nowrap text-muted-foreground">
        <span className={cn("flex min-w-0 items-center gap-y-1.5 transition-opacity", status ? "gap-x-3" : "flex-wrap gap-x-4", off && "opacity-50")}>{footer}</span>
        {by && toggle && <Creator by={by} />}
      </span>
      {/* Hex look: slides in on hover, bottom right (where the avatar sits on your own agents; it fades out). Hidden in Rival */}
      <ArrowRight aria-hidden className="card-arrow pointer-events-none absolute right-4 bottom-[19px] hidden size-3.5 text-blue" strokeWidth={2.25} />
    </div>
  )
}

// Who made it: you (your initials, like the header's avatar) or Rival (its logo)
function Creator({ by }: { by: "you" | "rival" }) {
  return (
    <span className="card-avatar pointer-events-auto relative ml-auto" title={by === "you" ? "Created by you" : "Created by Rival"}>
      <Avatar className="size-5">
        {by === "you"
          ? <AvatarFallback className="text-[9px] font-semibold">IB</AvatarFallback>
          : <AvatarFallback className="bg-card ring-1 ring-border"><img src="/rival-logo.png" alt="Rival" className="size-3" /></AvatarFallback>}
      </Avatar>
    </span>
  )
}
