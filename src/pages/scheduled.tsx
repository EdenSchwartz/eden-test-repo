import { useState } from "react"
import { CalendarClock, MessagesSquare, Plus, Sparkles, Zap } from "lucide-react"
import { agents } from "@/components/chat/agents"
import { AgentStatusBadge } from "@/components/chat/primitives"
import { SuperAgentOrb } from "@/components/super-agents"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { runsForWorkflow } from "@/data/agent-runs"
import { getSuperAgent } from "@/data/super-agents"
import { workflows, type Workflow } from "@/data/workflows"
import { useNav } from "@/lib/nav"
import { timeAgo } from "@/lib/time"
import { cn } from "@/lib/utils"

const TriggerIcon = ({ w, className }: { w: Workflow; className?: string }) => {
  const Icon = w.trigger.kind === "event" ? Zap : CalendarClock
  return <Icon className={cn("size-4 shrink-0 text-muted-foreground", className)} />
}

// ponytail: visual toggle, state is per page visit
function Toggle({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onChange(!on) }}
      className={cn("relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors", on ? "bg-primary" : "bg-muted")}
    >
      <span className={cn("absolute top-0.5 size-4 rounded-full bg-background shadow transition-[left]", on ? "left-[18px]" : "left-0.5")} />
    </button>
  )
}

// Who does the work: the super agent's orb when it follows one's playbook, else the helper agents' icons
function RunsWith({ w }: { w: Workflow }) {
  const sa = getSuperAgent(w.superAgentId)
  if (sa) return <span className="flex items-center gap-2"><SuperAgentOrb sa={sa} size="sm" className="size-6 rounded-md [&_svg]:size-3" /><span className="truncate">{sa.name}</span></span>
  return (
    <span className="flex items-center gap-2">
      {w.agents.map((k) => { const Icon = agents[k].icon; return <span key={k} className="flex size-6 items-center justify-center rounded-md border bg-muted"><Icon className="size-3" /></span> })}
      <span className="truncate">{w.agents.map((k) => agents[k].name).join(", ")}</span>
    </span>
  )
}

function WorkflowDrawer({ w, enabled, onToggle, onClose }: { w: Workflow; enabled: boolean; onToggle: (on: boolean) => void; onClose: () => void }) {
  const { navigate } = useNav()
  const runs = runsForWorkflow(w.id)
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 outline-none sm:max-w-xl">
        <SheetHeader className="border-b pr-12">
          <SheetTitle className="flex items-center gap-2"><TriggerIcon w={w} /> {w.name}</SheetTitle>
          <SheetDescription>{w.description}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-4 text-sm">
          <dl className="divide-y rounded-lg border">
            {[
              ["Trigger", w.trigger.label],
              ["Next run", enabled ? w.nextRun : "Paused"],
              ["Runs with", <RunsWith key="runs-with" w={w} />],
              ["Created by", w.createdBy],
            ].map(([k, v]) => (
              <div key={k as string} className="flex items-center gap-4 px-3 py-2.5">
                <dt className="w-24 shrink-0 text-muted-foreground">{k}</dt>
                <dd className="min-w-0 flex-1">{v}</dd>
              </div>
            ))}
            <div className="flex items-center gap-4 px-3 py-2.5">
              <dt className="w-24 shrink-0 text-muted-foreground">Active</dt>
              <dd><Toggle on={enabled} onChange={onToggle} label={`${w.name} active`} /></dd>
            </div>
          </dl>

          {/* Each run opens in the AI Agents log, where it lives */}
          <section className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground">Recent runs</h3>
            {runs.length === 0 ? (
              <p className="rounded-lg border border-dashed px-3 py-4 text-center text-muted-foreground">No runs yet</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {runs.map((r) => (
                  <li key={r.id}>
                    <button onClick={() => navigate("agents", { runId: r.id })} className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/40">
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate", r.status === "error" && "text-red-400")}>{r.status === "running" ? r.activity : r.summary}</span>
                        <span className="block truncate text-xs text-muted-foreground">{r.source.kind === "schedule" && r.source.trigger} · {timeAgo(r.startedAt)} ago</span>
                      </span>
                      <AgentStatusBadge status={r.status} verdict={r.verdict} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {w.conversationId && (
          <SheetFooter className="flex-row justify-end border-t">
            <Button variant="outline" title="The conversation this workflow was created in" onClick={() => navigate("chat", { conversationId: w.conversationId })}>
              <MessagesSquare /> Open conversation
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default function ScheduledPage() {
  const { params } = useNav()
  const [openId, setOpenId] = useState(params.workflowId) // opened from a run's "View workflow"
  const [enabled, setEnabled] = useState(() => Object.fromEntries(workflows.map((w) => [w.id, w.enabled])))
  const toggle = (id: string) => (on: boolean) => setEnabled((e) => ({ ...e, [id]: on }))
  const open = workflows.find((w) => w.id === openId)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {workflows.filter((w) => enabled[w.id]).length} active · {workflows.filter((w) => !enabled[w.id]).length} paused
        </p>
        {/* ponytail: buttons are inert for now; wire to the chat / wizard when those exist */}
        <div className="flex gap-2">
          <Button variant="outline"><Sparkles />Create with AI</Button>
          <Button><Plus />New workflow</Button>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead>Workflow</TableHead>
              <TableHead className="w-52">Runs with</TableHead>
              <TableHead className="w-60">Last run</TableHead>
              <TableHead className="w-36">Next run</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {workflows.map((w) => {
              const last = runsForWorkflow(w.id)[0]
              const on = enabled[w.id]
              return (
                <TableRow key={w.id} className={cn("cursor-pointer", !on && "text-muted-foreground")} onClick={() => setOpenId(w.id)}>
                  <TableCell>
                    <span className="flex min-w-0 items-start gap-2">
                      <TriggerIcon w={w} className="mt-0.5" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{w.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{w.trigger.label}</span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell><RunsWith w={w} /></TableCell>
                  <TableCell>
                    {last ? (
                      <span className="flex items-center gap-2">
                        <AgentStatusBadge status={last.status} verdict={last.verdict} />
                        <span className="text-xs text-muted-foreground tabular-nums">{timeAgo(last.startedAt)} ago</span>
                      </span>
                    ) : <span className="text-muted-foreground">Never</span>}
                  </TableCell>
                  <TableCell className="truncate text-muted-foreground">{on ? w.nextRun : "Paused"}</TableCell>
                  <TableCell><Toggle on={on} onChange={toggle(w.id)} label={`${w.name} active`} /></TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {open && <WorkflowDrawer w={open} enabled={enabled[open.id]} onToggle={toggle(open.id)} onClose={() => setOpenId(undefined)} />}
    </div>
  )
}
