import { useState } from "react"
import { CalendarClock, MessagesSquare, PanelRight, X } from "lucide-react"
import { agents } from "@/components/chat/agents"
import { AgentRunDrawer, AssistantParts } from "@/components/chat/parts"
import { AgentHeader, AgentStatusBadge, StatusBadge, type AgentStatus } from "@/components/chat/primitives"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getAgentRuns, type AgentRunRecord, type RunSource } from "@/data/agent-runs"
import { conversationStore } from "@/data/conversations"
import { getSuperAgent } from "@/data/super-agents"
import { getWorkflow } from "@/data/workflows"
import { useNav } from "@/lib/nav"
import { timeAgo } from "@/lib/time"
import { cn } from "@/lib/utils"

const statusOrder = ["running", "attention", "error", "done"] as const
const statusCountLabels: Record<AgentStatus, string> = { running: "working", attention: "need you", error: "failed", done: "done" }
const filters = [
  { id: "all", label: "All" },
  { id: "conversation", label: "Conversations" },
  { id: "schedule", label: "Scheduled" },
] as const

function SourceLabel({ source }: { source: RunSource }) {
  const Icon = source.kind === "conversation" ? MessagesSquare : CalendarClock
  return (
    <span className="flex min-w-0 items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0">
        <span className="block truncate">{source.kind === "conversation" ? source.title : getWorkflow(source.workflowId)?.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {source.kind === "conversation" ? "Conversation" : `Scheduled · ${source.trigger}`}
        </span>
      </span>
    </span>
  )
}

// Run details: who/what/why, the shallow result, and the ways out (entire run, source conversation, workflow)
function RunDetailsDrawer({ run, onClose }: { run: AgentRunRecord | null; onClose: () => void }) {
  const { navigate } = useNav()
  const [fullRunOpen, setFullRunOpen] = useState(false)
  if (!run) return <Sheet open={false} />
  const { name, icon } = agents[run.agent]
  const { source } = run
  const conversationId = source.kind === "conversation" ? source.conversationId : getWorkflow(source.workflowId)?.conversationId // a workflow's = where it was created

  return (
    <>
      <Sheet open onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          className="w-full gap-0 outline-none sm:max-w-xl"
          onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).focus() }}
        >
          <SheetHeader className="border-b pr-12">
            <SheetTitle className="sr-only">{name} run</SheetTitle>
            <SheetDescription className="sr-only">{run.summary ?? run.activity}</SheetDescription>
            <AgentHeader
              icon={icon}
              name={name}
              status={run.status}
              detail={run.status === "running" ? run.activity : run.summary}
              verdict={run.verdict}
              duration={run.duration}
              expandable={false}
            />
          </SheetHeader>

          <div className="flex-1 space-y-6 overflow-y-auto p-4">
            <section className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground">Triggered by</h3>
              <div className="rounded-lg border p-3 text-sm">
                <SourceLabel source={source} />
                <p className="mt-2 pl-6 text-xs text-muted-foreground">Started {timeAgo(run.startedAt)} ago</p>
              </div>
            </section>
            {run.task && (
              <section className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground">Task</h3>
                <p className="rounded-lg border bg-muted/40 px-3 py-2.5 text-sm leading-relaxed">{run.task}</p>
              </section>
            )}
            {run.parts.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground">Result</h3>
                <div className="space-y-3"><AssistantParts parts={run.parts} /></div>
              </section>
            )}
          </div>

          <SheetFooter className="flex-row flex-wrap justify-end gap-2 border-t">
            {source.kind === "schedule" && (
              <Button variant="outline" onClick={() => navigate("scheduled", { workflowId: source.workflowId })}>
                <CalendarClock /> View workflow
              </Button>
            )}
            {conversationId && (
              <Button
                variant="outline"
                title={source.kind === "schedule" ? "The conversation this workflow was created in" : undefined}
                onClick={() => navigate("chat", { conversationId })}
              >
                <MessagesSquare /> Open conversation
              </Button>
            )}
            <Button onClick={() => setFullRunOpen(true)}>
              <PanelRight /> Show entire run
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <AgentRunDrawer part={run} open={fullRunOpen} onOpenChange={setFullRunOpen} />
    </>
  )
}

export default function AgentsPage() {
  const { params } = useNav()
  const [runs] = useState(getAgentRuns)
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all")
  // One of your agents' runs only: from its Activity tab's "Show all runs" (superAgentId). Its runs = the sub agent
  // runs inside its conversations (setup chat, Run now, scheduled runs)
  const [agentId, setAgentId] = useState(params.superAgentId)
  const agent = getSuperAgent(agentId)
  const agentConvs = new Set(conversationStore.current.filter((c) => agent && c.superAgentId === agent.id).map((c) => c.id))
  const [selected, setSelected] = useState<AgentRunRecord | null>(() => runs.find((r) => r.id === params.runId) ?? null) // opened from a workflow's run history
  const visible = runs.filter((r) =>
    (filter === "all" || r.source.kind === filter) &&
    (!agent || (r.source.kind === "conversation" && agentConvs.has(r.source.conversationId))))
  const counts = statusOrder
    .map((st) => [st, visible.filter((r) => r.status === st).length] as const)
    .filter(([, n]) => n > 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border p-0.5">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "cursor-pointer rounded-md px-3 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground",
                filter === f.id && "bg-accent text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        {agent && (
          <span className="mr-auto inline-flex h-7 items-center gap-1.5 rounded-lg bg-wash pr-1 pl-2.5 text-sm text-blue">
            <agent.icon className="size-3.5" />
            <span className="font-medium">{agent.name}</span>
            <button
              onClick={() => setAgentId(undefined)}
              aria-label={`Show runs of every agent, not just ${agent.name}`}
              title="Show every agent"
              className="flex size-5 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-blue/10"
            >
              <X className="size-3.5" />
            </button>
          </span>
        )}
        <div className="flex items-center gap-2">
          {counts.map(([st, n]) => <StatusBadge key={st} tone={st}>{`${n} ${statusCountLabels[st]}`}</StatusBadge>)}
        </div>
      </div>

      <div className="rounded-lg border">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-52">Agent</TableHead>
              <TableHead className="w-44">Status</TableHead>
              <TableHead>Result</TableHead>
              <TableHead className="w-72">Triggered by</TableHead>
              <TableHead className="w-24 text-right">Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  {agent ? <>No runs of {agent.name} yet{filter !== "all" && " here"}.</> : "Nothing here yet."}
                </TableCell>
              </TableRow>
            )}
            {visible.map((r) => {
              const { name, icon: Icon } = agents[r.agent]
              return (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                  <TableCell>
                    <span className="flex items-center gap-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-(--rail) bg-muted">
                        <Icon className="size-3" />
                      </span>
                      <span className="truncate font-medium">{name}</span>
                    </span>
                  </TableCell>
                  <TableCell><AgentStatusBadge status={r.status} verdict={r.verdict} /></TableCell>
                  <TableCell className={cn("truncate text-muted-foreground", r.status === "error" && "text-red-400")}>
                    {r.status === "running" ? r.activity : r.summary}
                  </TableCell>
                  <TableCell><SourceLabel source={r.source} /></TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {timeAgo(r.startedAt)}
                    {r.duration !== undefined && <span className="block text-xs">ran {r.duration}s</span>}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <RunDetailsDrawer key={selected?.id} run={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
