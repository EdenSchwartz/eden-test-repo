import { useEffect, useRef, useState } from "react"
import { Building2, CalendarClock, Check, Network, Pencil, Pin, Plus, Search, ShieldAlert, SlidersHorizontal, Trash2, TriangleAlert, UserRound, MessagesSquare, type LucideIcon } from "lucide-react"
import { agents } from "@/components/chat/agents"
import { Button } from "@/components/ui/button"
import { getScheduledRun } from "@/data/agent-runs"
import { memories, memoryCategories, reviewReason, type Memory, type MemoryCategory } from "@/data/memories"
import { getWorkflow } from "@/data/workflows"
import { useConversations } from "@/lib/conversations"
import { useNav } from "@/lib/nav"
import { timeAgo } from "@/lib/time"
import { cn } from "@/lib/utils"

// Memory: what agents know about your environment and org, in one place.
// Every fact shows where it came from (a chat, a workflow run, or a person) and which agents use it.
// Edit, delete, pin (always in context), and review what's stale or contradicted.
const categoryIcons: Record<MemoryCategory, LucideIcon> = {
  Ownership: UserRound,
  Environment: Network,
  Preferences: SlidersHorizontal,
  "Known weaknesses": ShieldAlert,
  Policies: Building2,
}

const inputClass = "rounded-md border bg-card px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"

// Where a memory came from, as a link back to it
function SourceLink({ m }: { m: Memory }) {
  const { navigate } = useNav()
  const { convs } = useConversations()
  const s = m.source
  if (s.kind === "manual") return <span className="flex items-center gap-1"><Pencil className="size-3" /> Added by {s.by}</span>
  const [Icon, label, go] = s.kind === "conversation"
    ? [MessagesSquare, convs.find((c) => c.id === s.conversationId)?.title ?? "Conversation", () => navigate("chat", { conversationId: s.conversationId })]
    : (() => {
      const run = getScheduledRun(s.runId)
      const wf = run?.source.kind === "schedule" ? getWorkflow(run.source.workflowId) : undefined
      return [CalendarClock, `${wf?.name ?? "Workflow"} · run`, () => navigate("agents", { runId: s.runId })] as const
    })()
  return (
    <button onClick={go} className="flex min-w-0 cursor-pointer items-center gap-1 underline-offset-2 hover:text-foreground hover:underline">
      <Icon className="size-3 shrink-0" /> <span className="truncate">{label}</span>
    </button>
  )
}

function MemoryRow({ m, highlighted, onChange, onDelete }: { m: Memory; highlighted: boolean; onChange: (patch: Partial<Memory>) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(m.text)
  const ref = useRef<HTMLLIElement>(null)
  useEffect(() => { if (highlighted) ref.current?.scrollIntoView({ block: "center" }) }, [highlighted])
  const Icon = categoryIcons[m.category]
  const review = reviewReason(m)
  const save = () => { if (draft.trim()) onChange({ text: draft.trim(), conflict: undefined, confirmedAt: new Date() }); setEditing(false) }

  return (
    <li ref={ref} className={cn("group space-y-2 px-4 py-3 transition-colors", highlighted && "bg-accent/50")}>
      <div className="flex items-start gap-3">
        <span title={m.category} className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border bg-muted">
          <Icon className="size-3.5 text-muted-foreground" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          {editing ? (
            <form onSubmit={(e) => { e.preventDefault(); save() }} className="flex gap-2">
              <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setEditing(false)} className={cn(inputClass, "min-w-0 flex-1")} />
              <Button size="sm" type="submit">Save</Button>
              <Button size="sm" variant="ghost" type="button" onClick={() => { setDraft(m.text); setEditing(false) }}>Cancel</Button>
            </form>
          ) : (
            <p className="text-sm">{m.text}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <SourceLink m={m} />
            <span>Learned {timeAgo(m.learnedAt)} ago{m.lastUsedAt && ` · used ${timeAgo(m.lastUsedAt)} ago`}</span>
            <span className="flex items-center gap-1" title={`Used by ${m.usedBy.map((k) => agents[k].name).join(", ")}`}>
              {m.usedBy.map((k) => { const A = agents[k].icon; return <A key={k} className="size-3" /> })}
              {m.usedBy.length} {m.usedBy.length === 1 ? "agent" : "agents"}
            </span>
          </div>
        </div>
        {!editing && (
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              onClick={() => onChange({ pinned: !m.pinned })}
              aria-pressed={!!m.pinned}
              title={m.pinned ? "Pinned: always in agents' context" : "Pin: always include in agents' context"}
              className={cn("flex size-7 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-accent", m.pinned ? "text-foreground" : "text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100")}
            >
              <Pin className={cn("size-3.5", m.pinned && "fill-current")} />
            </button>
            <button onClick={() => setEditing(true)} aria-label="Edit" className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground opacity-0 transition-colors group-hover:opacity-100 hover:bg-accent hover:text-foreground focus-visible:opacity-100">
              <Pencil className="size-3.5" />
            </button>
            <button onClick={onDelete} aria-label="Delete" className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground opacity-0 transition-colors group-hover:opacity-100 hover:bg-accent hover:text-red-400 focus-visible:opacity-100">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>
      {/* Stale or contradicted: a person confirms it's still true, or fixes it */}
      {review && !editing && (
        <div className="ml-9 flex flex-wrap items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs ring-1 ring-amber-500/20">
          <TriangleAlert className="size-3.5 shrink-0 text-amber-500" />
          <span className="flex-1 text-amber-500">Needs review: {review}</span>
          <button onClick={() => onChange({ conflict: undefined, confirmedAt: new Date() })} className="flex cursor-pointer items-center gap-1 rounded-md bg-primary px-2 py-1 font-medium text-primary-foreground">
            <Check className="size-3" /> Still true
          </button>
          <button onClick={() => setEditing(true)} className="cursor-pointer rounded-md border px-2 py-1 font-medium transition-colors hover:bg-accent">Update</button>
        </div>
      )}
    </li>
  )
}

export default function MemoryPage() {
  const { params } = useNav()
  const [items, setItems] = useState(memories)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<MemoryCategory | "all" | "review">("all")
  const [adding, setAdding] = useState(false)
  const [newText, setNewText] = useState("")
  const [newCategory, setNewCategory] = useState<MemoryCategory>("Environment")
  const [deleted, setDeleted] = useState<{ m: Memory; index: number } | null>(null)

  // Keep the shared list in sync so other pages (and the chat's memory links) see edits
  const commit = (next: Memory[]) => { memories.splice(0, memories.length, ...next); setItems(next) }
  const update = (id: string, patch: Partial<Memory>) => commit(items.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  const remove = (m: Memory) => { setDeleted({ m, index: items.indexOf(m) }); commit(items.filter((x) => x !== m)) }
  const undo = () => { if (!deleted) return; const next = [...items]; next.splice(deleted.index, 0, deleted.m); commit(next); setDeleted(null) }
  const add = () => {
    if (!newText.trim()) return
    commit([{ id: `mem-${Date.now()}`, text: newText.trim(), category: newCategory, source: { kind: "manual", by: "You" }, usedBy: [], learnedAt: new Date(), confirmedAt: new Date() }, ...items])
    setNewText(""); setAdding(false)
  }

  const q = query.trim().toLowerCase()
  const reviewCount = items.filter((m) => reviewReason(m)).length
  const visible = items
    .filter((m) => filter === "all" || (filter === "review" ? !!reviewReason(m) : m.category === filter))
    .filter((m) => !q || m.text.toLowerCase().includes(q))
    // Pinned first, then what agents used most recently
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || (b.lastUsedAt ?? b.learnedAt).getTime() - (a.lastUsedAt ?? a.learnedAt).getTime())
  const chips: { id: typeof filter; label: string; n: number }[] = [
    { id: "all", label: "All", n: items.length },
    ...memoryCategories.map((c) => ({ id: c, label: c, n: items.filter((m) => m.category === c).length })),
  ]

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          What agents have learned about your environment and organization. They use it in every run; pinned items are always included.
        </p>
        <Button onClick={() => setAdding(true)}><Plus /> Add memory</Button>
      </div>

      {adding && (
        <form onSubmit={(e) => { e.preventDefault(); add() }} className="flex flex-wrap gap-2 rounded-xl border bg-card p-3">
          <input autoFocus value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="e.g. Never touch prod during the Black Friday freeze" className={cn(inputClass, "min-w-0 flex-1")} />
          <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as MemoryCategory)} className={inputClass}>
            {memoryCategories.map((c) => <option key={c}>{c}</option>)}
          </select>
          <Button type="submit" disabled={!newText.trim()}>Save</Button>
          <Button type="button" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex h-9 w-full items-center gap-2 rounded-lg border bg-card px-3 focus-within:ring-2 focus-within:ring-ring/50 sm:w-64">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search memory" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              aria-pressed={filter === c.id}
              className={cn("cursor-pointer rounded-full border px-3 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground", filter === c.id && "border-foreground/40 bg-accent text-foreground")}
            >
              {c.label} <span className="text-xs tabular-nums opacity-60">{c.n}</span>
            </button>
          ))}
          {reviewCount > 0 && (
            <button
              onClick={() => setFilter("review")}
              aria-pressed={filter === "review"}
              className={cn("flex cursor-pointer items-center gap-1 rounded-full border border-amber-500/30 px-3 py-1 text-sm text-amber-500 transition-colors hover:bg-amber-500/10", filter === "review" && "bg-amber-500/15")}
            >
              <TriangleAlert className="size-3.5" /> Needs review <span className="text-xs tabular-nums opacity-70">{reviewCount}</span>
            </button>
          )}
        </div>
      </div>

      {deleted && (
        <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm">
          <span className="min-w-0 flex-1 truncate text-muted-foreground">Deleted “{deleted.m.text}”</span>
          <button onClick={undo} className="cursor-pointer font-medium hover:underline">Undo</button>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          {filter === "review" ? "Nothing to review. Everything agents remember is current." : "No memories match."}
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {visible.map((m) => (
            <MemoryRow key={m.id} m={m} highlighted={m.id === params.memoryId} onChange={(p) => update(m.id, p)} onDelete={() => remove(m)} />
          ))}
        </ul>
      )}
    </div>
  )
}
