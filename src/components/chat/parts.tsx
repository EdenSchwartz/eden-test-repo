import { TaskCard } from "@/components/tasks/task-card"
import { useState } from "react"
import {
  ArrowRight, Bookmark, PanelRight, Brain, CalendarClock, Check, Cloud, Code, Globe, GitPullRequest, Link, Network, PhoneCall, Rocket, ShieldCheck,
  Server, ShieldX, Tag, UserRoundSearch, Users, Wrench, X, Zap,
} from "lucide-react"
import { MessageResponse } from "@/components/ai-elements/message"
import { Reasoning, ReasoningContent, ReasoningTrigger, useReasoning } from "@/components/ai-elements/reasoning"
import { ToolInput, ToolOutput } from "@/components/ai-elements/tool"
import { agents, type AgentKind } from "@/components/chat/agents"
import { WorkflowMini } from "@/components/tasks/workflow-mini"
import {
  AgentHeader, EntityChip, IconTile, ResultCard, StatusBadge, StepHeader, StepOutput, Steps, stepBody, stepBodyRail, stepTrigger,
  type AgentStatus,
} from "@/components/chat/primitives"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { Confidence, Entity, Evidence, Part, StepResult } from "@/data/conversations"
import { findMemoryByText } from "@/data/memories"
import { useNav } from "@/lib/nav"

const collapsibleAnim =
  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1 ease-snappy"

/* ---------- Confidence (Result aside) ---------- */

const confidenceBars = { High: 3, Medium: 2, Low: 1 }
const evidenceIcons = { tag: Tag, code: Code, deploy: Rocket, oncall: PhoneCall, memory: Brain, network: Network, intel: Globe }

const Bars = ({ level }: { level: Confidence }) => (
  <span className="flex h-3 items-end gap-0.5">
    {[1, 2, 3].map((i) => (
      <span
        key={i}
        className={`w-[3px] rounded-full ${i <= confidenceBars[level] ? "bg-blue-500" : "bg-muted-foreground/30"}`}
        style={{ height: `${40 + i * 20}%` }}
      />
    ))}
  </span>
)

function ConfidencePill({ confidence, evidence }: { confidence: Confidence; evidence: Evidence[] }) {
  const supporting = evidence.filter((e) => e.supports).length
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-full border px-3 text-xs transition-colors hover:bg-accent data-[state=open]:bg-accent">
          <Bars level={confidence} />
          <span><span className="font-medium">{confidence}</span> <span className="text-muted-foreground">confidence</span></span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="space-y-1 border-b p-4">
          <p className="flex items-center gap-2 text-sm font-medium"><Bars level={confidence} /> {confidence} confidence</p>
          <p className="text-sm text-muted-foreground">{supporting} of {evidence.length} signals support this conclusion.</p>
        </div>
        <ul className="max-h-80 divide-y overflow-y-auto">
          {evidence.map((e) => (
            <li key={e.signal} className="flex items-start gap-3 p-4">
              <IconTile icon={evidenceIcons[e.kind]} />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm">{e.signal}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">{e.source}</p>
              </div>
              <span
                title={e.supports ? `Supports (${e.strength.toLowerCase()} signal)` : "Contradicts"}
                className={`flex size-5 shrink-0 items-center justify-center rounded-full ${e.supports ? "bg-muted text-foreground" : "bg-amber-500/10 text-amber-500"}`}
              >
                {e.supports ? <Check className="size-3" /> : <X className="size-3" />}
              </span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

/* ---------- Steps ---------- */

function ReasoningHeader() {
  const { isStreaming, duration } = useReasoning()
  return (
    <StepHeader
      icon={Brain}
      running={isStreaming}
      label={isStreaming ? "Reasoning" : "Reasoned"}
      meta={!isStreaming && duration !== undefined ? `${duration}s` : undefined}
    />
  )
}

// "Saved to memory": opens that memory on the Memory page, where it can be edited or removed
function MemoryStep({ text }: { text: string }) {
  const { navigate } = useNav()
  return (
    <button onClick={() => navigate("memory", { memoryId: findMemoryByText(text)?.id })} className="w-full cursor-pointer rounded-md text-left transition-opacity hover:opacity-80" title="Open in Memory">
      <StepHeader icon={Bookmark} label="Saved to memory" meta={text} expandable={false} />
    </button>
  )
}

function StepView({ part }: { part: Extract<Part, { type: "reasoning" | "tool" | "memory" }> }) {
  switch (part.type) {
    case "reasoning":
      return (
        <Reasoning isStreaming={part.streaming} duration={part.duration} className="mb-0">
          <ReasoningTrigger className={stepTrigger}><ReasoningHeader /></ReasoningTrigger>
          <ReasoningContent className={`${stepBody} mt-0 leading-relaxed`}>{part.text}</ReasoningContent>
        </Reasoning>
      )
    case "tool":
      return (
        <Collapsible>
          <CollapsibleTrigger className={stepTrigger}>
            <StepHeader
              icon={Wrench}
              label={part.title}
              running={part.state === "input-available"}
              error={part.state === "output-error"}
              meta={part.state === "output-error" ? part.error : <span className="font-mono text-xs">{part.name}</span>}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className={`${stepBody} ${collapsibleAnim} space-y-3 pt-1 ${part.result ? stepBodyRail : ""}`}>
            <ToolInput input={part.input} />
            <ToolOutput output={part.output} errorText={part.error} />
          </CollapsibleContent>
          {/* The card this step produced: branches off the step's icon */}
          {part.result && part.state === "output-available" && (
            <StepOutput><div className="rise-in"><StepResultCard result={part.result} /></div></StepOutput>
          )}
        </Collapsible>
      )
    case "memory":
      return <MemoryStep text={part.text} />
  }
}

/* ---------- Agents ---------- */

export type AgentPart = Extract<Part, { type: "agent" }>

function AgentRun({ part }: { part: AgentPart }) {
  const { name, icon } = agents[part.agent]
  const [drawerOpen, setDrawerOpen] = useState(false)
  return (
    <Collapsible>
      <CollapsibleTrigger className={`${stepTrigger} px-3`}>
        <AgentHeader
          icon={icon}
          name={name}
          status={part.status}
          detail={part.status === "running" ? part.activity : part.summary}
          verdict={part.verdict}
          duration={part.duration}
          expandable={part.parts.length > 0}
        />
      </CollapsibleTrigger>
      {/* Shallow detail inline; full depth in the drawer */}
      <CollapsibleContent className={`${collapsibleAnim} space-y-2 pr-3 pb-2 pl-12`}>
        <AssistantParts parts={part.parts} />
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => setDrawerOpen(true)}>
          <PanelRight /> Show entire run
        </Button>
      </CollapsibleContent>
      <AgentRunDrawer part={part} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </Collapsible>
  )
}

// The agent's whole run: same header as the row, its task, then every step (same components as the chat)
export function AgentRunDrawer({ part, open, onOpenChange }: { part: AgentPart; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { name, icon } = agents[part.agent]
  const transcript = part.transcript ?? part.parts
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full gap-0 outline-none sm:max-w-xl"
        // Focus the drawer itself, not its first step, so nothing looks pre-selected
        onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).focus() }}
      >
        <SheetHeader className="border-b pr-12">
          <SheetTitle className="sr-only">{name} run</SheetTitle>
          <SheetDescription className="sr-only">{part.summary ?? part.activity}</SheetDescription>
          <AgentHeader
            icon={icon}
            name={name}
            status={part.status}
            detail={part.status === "running" ? part.activity : part.summary}
            verdict={part.verdict}
            duration={part.duration}
            expandable={false}
          />
        </SheetHeader>
        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          {part.task && (
            <section className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground">Task</h3>
              <p className="rounded-lg border bg-muted/40 px-3 py-2.5 text-sm leading-relaxed">{part.task}</p>
            </section>
          )}
          <section className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground">Run · {transcript.length} steps</h3>
            <div className="space-y-3"><AssistantParts parts={transcript} /></div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}

const groupStatusLabels: Record<AgentStatus, string> = { running: "working", attention: "needs you", error: "failed", done: "done" }

// Consecutive agent runs = work the orchestrator delegated in parallel. Header counts each state.
function AgentGroup({ runs }: { runs: AgentPart[] }) {
  const counts = (["running", "attention", "error", "done"] as const)
    .map((st) => [st, runs.filter((r) => r.status === st).length] as const)
    .filter(([, n]) => n > 0)
  return (
    <div className="rounded-xl border">
      <div className="flex h-10 items-center justify-between gap-2 border-b px-3 text-xs text-muted-foreground">
        <span>Delegated to {runs.length} {runs.length === 1 ? "agent" : "agents"}</span>
        <span className="flex items-center gap-2">
          {counts.map(([st, n]) => <StatusBadge key={st} tone={st}>{`${n} ${groupStatusLabels[st]}`}</StatusBadge>)}
        </span>
      </div>
      <div className="divide-y">
        {runs.map((r) => <div key={r.agent} className="py-1"><AgentRun part={r} /></div>)}
      </div>
    </div>
  )
}

/* ---------- Results ---------- */

const entityIcons = { asset: Cloud, team: Users, repo: GitPullRequest, url: Link, trigger: Zap }
const findingIcons = { exploit: Zap, intel: Globe, blocked: ShieldX, assets: Server, schedule: CalendarClock }
const viaOf = (kind?: AgentKind) => (kind ? agents[kind] : undefined)

const Entities = ({ items }: { items: Entity[] }) => (
  <div className="flex flex-wrap items-center gap-1.5">
    {items.map((e) => <EntityChip key={e.label} icon={entityIcons[e.kind]}>{e.label}</EntityChip>)}
  </div>
)

// Information results: only ever rendered as a step's output (see StepView "tool")
function StepResultCard({ result }: { result: StepResult }) {
  switch (result.type) {
    case "owner-trace":
      return (
        <ResultCard
          icon={UserRoundSearch}
          title="Owner identified"
          aside={<ConfidencePill confidence={result.confidence} evidence={result.evidence} />}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <EntityChip icon={Cloud}>{result.resource}</EntityChip>
            <ArrowRight className="size-3.5 text-muted-foreground" />
            <EntityChip icon={Users}>{result.team}</EntityChip>
          </div>
        </ResultCard>
      )
    case "finding":
      return (
        <ResultCard
          icon={findingIcons[result.icon]}
          title={result.title}
          aside={result.confidence && result.evidence && <ConfidencePill confidence={result.confidence} evidence={result.evidence} />}
        >
          {result.entities && <Entities items={result.entities} />}
        </ResultCard>
      )
  }
}

// Action results: the only cards that stand alone in a turn, because they need the user
function ActionCard({ part }: { part: Extract<Part, { type: "approval" }> }) {
  return (
    <ResultCard
      icon={ShieldCheck}
      tone="attention"
      title={part.title}
      via={viaOf(part.via)}
      aside={
        <>
          <StatusBadge tone="attention">Needs approval</StatusBadge>
          {/* ponytail: inert; open a review drawer here later */}
          <Button size="sm">Review</Button>
        </>
      }
    >
      <EntityChip icon={GitPullRequest}>{part.repo}</EntityChip>
    </ResultCard>
  )
}

/* ---------- Assistant turn ---------- */

type StepPart = Parameters<typeof StepView>[0]["part"]
const groupOf = (p: Part) =>
  p.type === "reasoning" || p.type === "tool" || p.type === "memory" ? "steps" : p.type === "agent" ? "agents" : null

// Renders an assistant message (or a helper agent's nested work):
// consecutive steps share one rail, consecutive agents share one parallel group, results and text stand alone
export function AssistantParts({ parts }: { parts: Part[] }) {
  const blocks: { group: "steps" | "agents" | null; parts: Part[] }[] = []
  for (const p of parts) {
    const g = groupOf(p)
    const last = blocks.at(-1)
    if (g && last?.group === g) last.parts.push(p)
    else blocks.push({ group: g, parts: [p] })
  }

  return blocks.map((b, i) => {
    const first = b.parts[0]
    return (
      <div key={i} className="rise-in">
        {b.group === "steps" ? (
          <Steps>{b.parts.map((p, j) => <StepView key={j} part={p as StepPart} />)}</Steps>
        ) : b.group === "agents" ? (
          <AgentGroup runs={b.parts as AgentPart[]} />
        ) : first.type === "text" ? (
          <MessageResponse className="leading-relaxed">{first.text}</MessageResponse>
        ) : first.type === "workflow" ? (
          <WorkflowMini superAgentId={first.superAgentId} scope={first.scope} structure={first.structure} />
        ) : first.type === "task" ? (
          <TaskCard part={first} />
        ) : (
          <ActionCard part={first as Extract<Part, { type: "approval" }>} />
        )}
      </div>
    )
  })
}

// Highlights @mentions (e.g. @CVE-2026-94545) in user messages; clicking one calls onMention
export function UserText({ text, onMention }: { text: string; onMention?: (id: string) => void }) {
  return (
    <>
      {text.split(/(@[\w-]+)/).map((chunk, i) =>
        // ponytail: only CVE mentions are clickable for now; add other entity types (teams, assets) here
        chunk.startsWith("@CVE-") ? (
          <button
            key={i}
            onClick={() => onMention?.(chunk.slice(1))}
            className="cursor-pointer font-mono text-[0.85em] underline decoration-current/30 underline-offset-4 transition-colors hover:decoration-current"
          >
            {chunk}
          </button>
        ) : (
          chunk
        ),
      )}
    </>
  )
}
