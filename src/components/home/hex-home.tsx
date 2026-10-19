import { ArrowRight, MessageSquare } from "lucide-react"
import type { Conversation, Part } from "@/data/conversations"
import { superAgents } from "@/data/super-agents"
import { useConversations } from "@/lib/conversations"
import { useNav } from "@/lib/nav"
import { timeAgo } from "@/lib/time"
import { cn } from "@/lib/utils"

/*
 * Home in the Hex look (components/home/concept-home.tsx shows it under the composer when <html data-look="hex">):
 * a tight, ruled grid in three columns, like Hex's home, closed as a box (4px corners), set a little below the composer. Each column has a mono label and short rows:
 *   Needs you   conversations waiting on an approval
 *   Recent      the latest conversations
 *   Start from  a few of Rival's templates (opens Agent explorer)
 */
// Waiting on you: Rival's last message has an approval in it (anywhere, including inside a sub agent's run)
const flat = (parts: Part[]): Part[] => parts.flatMap((p) => (p.type === "agent" ? [p, ...flat(p.parts)] : [p]))
const waitingOnYou = (c: Conversation) => flat(c.messages.findLast((m) => m.role === "assistant")?.parts ?? []).some((p) => p.type === "approval")

export function HexHomeGrid() {
  const { convs } = useConversations()
  const { navigate } = useNav()
  const needs = convs.filter(waitingOnYou).slice(0, 4)
  const recent = [...convs].sort((a, b) => +b.updatedAt - +a.updatedAt).slice(0, 4)
  const templates = superAgents.filter((sa) => !sa.custom).slice(0, 4)
  const open = (id: string) => navigate("chat", { conversationId: id })

  return (
    <div className="rise-in mt-6 grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-[4px] border bg-background md:grid-cols-3 md:divide-x" style={{ "--delay": "160ms" } as React.CSSProperties}>
      <Column label="Needs you" count={needs.length}>
        {needs.length === 0
          ? <p className="px-4 py-3 text-sm text-muted-foreground">Nothing waiting on you.</p>
          : needs.map((c) => <Row key={c.id} onClick={() => open(c.id)} title={c.title} sub="Waiting on your approval" dot="bg-warning" />)}
      </Column>
      <Column label="Recent" count={recent.length}>
        {recent.map((c) => <Row key={c.id} onClick={() => open(c.id)} title={c.title} sub={timeAgo(c.updatedAt) === "now" ? "Just now" : `${timeAgo(c.updatedAt)} ago`} icon />)}
      </Column>
      <Column label="Start from" count={templates.length} action={{ label: "All", onClick: () => navigate("explorer") }}>
        {templates.map((sa) => (
          <Row key={sa.id} onClick={() => navigate("explorer", { superAgentId: sa.id })} title={sa.name} sub={sa.tagline} agentIcon={sa.icon} />
        ))}
      </Column>
    </div>
  )
}

function Column({ label, count, action, children }: { label: string; count: number; action?: { label: string; onClick: () => void }; children: React.ReactNode }) {
  return (
    <section className="min-w-0">
      <header className="flex h-9 items-center justify-between border-b px-4">
        <h3 className="text-[10.5px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
          {label} <span className="ml-1 tabular-nums opacity-70">{count}</span>
        </h3>
        {action && (
          <button onClick={action.onClick} className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
            {action.label} <ArrowRight className="size-3" />
          </button>
        )}
      </header>
      <ul className="divide-y">{children}</ul>
    </section>
  )
}

function Row({ title, sub, onClick, dot, icon, agentIcon: AgentIcon }: {
  title: string; sub: string; onClick: () => void; dot?: string; icon?: boolean; agentIcon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <li>
      <button onClick={onClick} className="group flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-frost">
        {dot && <span className={cn("size-1.5 shrink-0 rounded-full", dot)} />}
        {icon && <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />}
        {AgentIcon && <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-wash text-blue"><AgentIcon className="size-3.5" /></span>}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">{sub}</span>
        </span>
        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    </li>
  )
}
