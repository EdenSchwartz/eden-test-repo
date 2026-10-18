import { useEffect, useRef, useState } from "react"
import { Check, ChevronDown, CornerDownLeft } from "lucide-react"
import { cn } from "@/lib/utils"

/*
 * A questionnaire-style question, shown in place of the chat box (pages/chat.tsx). One UI for every
 * "pick an answer" moment in a conversation, so they all feel the same:
 *   - Header (only with more than one question, or a progress): "2 of 4 questions" with progress dashes. A chevron collapses the card.
 *   - The question, an optional line under it, then the options: a label + a one-line description each,
 *     the suggested one first (Recommended). "Type your own answer…" is always the last row.
 *   - Single choice: clicking an option answers it (the next question, or sends). "Select all that apply": tick, then Next.
 *   - An option can open a sub text area inside it (e.g. Scheduled → "every Monday at 9 AM"); ↵ there answers with both.
 *   - An option can be disabled, with a badge (e.g. Event · Coming soon).
 *   - Footer: Dismiss (back to the chat box) · Back · Next / Send ⌘↵.
 *   - The "type your own" row is focused when the card opens: just start typing. Typing anywhere else lands there too.
 *   - Keys: 1–9 pick (when not typing), ⌘↵ next, Esc dismiss.
 * Whatever you answer is posted as your message, exactly as if you had typed it.
 */

export type AskOption = {
  label: string; hint?: string; recommended?: boolean
  disabled?: boolean; badge?: string // shown, but can't be picked (e.g. "Coming soon")
  input?: { placeholder: string; action?: string } // picking it opens a text area inside the option
}
export type AskQuestion = { id: string; title: string; detail?: string; options: AskOption[]; multi?: boolean; placeholder?: string }
export type AskAnswer = { picked: string[]; custom: string; detail?: string } // detail: what you wrote in an option's text area
// Where this question sits in a longer flow (e.g. creating a task: Assets → Agents → Trigger)
export type AskProgress = { index: number; total: number; label?: string }

export function QuestionCard({ questions, progress, hue, onSubmit, onDismiss }: {
  questions: AskQuestion[]
  progress?: AskProgress
  hue?: number
  onSubmit: (answers: Record<string, AskAnswer>) => void
  onDismiss: () => void
}) {
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AskAnswer>>({})
  const [collapsed, setCollapsed] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const sub = useRef<HTMLTextAreaElement>(null)
  const [open, setOpen] = useState<string | null>(null) // the option whose text area is open
  const q = questions[i]
  const last = i === questions.length - 1
  const a = answers[q.id] ?? { picked: [], custom: "" }
  const answered = a.picked.length > 0 || a.custom.trim().length > 0

  const next = (all = answers) => (last ? onSubmit(all) : setI(i + 1))
  const set = (v: AskAnswer, advance = false) => {
    const all = { ...answers, [q.id]: v }
    setAnswers(all)
    if (advance) next(all)
  }
  const pick = (o: AskOption) => {
    if (o.disabled) return
    // An option with a text area: select it and open the area (answered from there)
    if (o.input && !q.multi) {
      set({ picked: [o.label], custom: "", detail: a.picked.includes(o.label) ? a.detail : "" })
      setOpen(o.label)
      requestAnimationFrame(() => sub.current?.focus())
      return
    }
    setOpen(null)
    if (q.multi) set({ picked: a.picked.includes(o.label) ? a.picked.filter((x) => x !== o.label) : [...a.picked, o.label], custom: a.custom })
    else set({ picked: [o.label], custom: "" }, true) // single choice: picking answers it
  }
  const submitDetail = () => { if (a.detail?.trim()) set({ ...a, custom: "" }, true) }
  const submitOwn = () => { if (a.custom.trim()) set({ picked: q.multi ? a.picked : [], custom: a.custom }, true) }

  // Ready to type the moment it opens (and on each next question)
  useEffect(() => { if (!collapsed) input.current?.focus() }, [i, collapsed])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (collapsed) return
      const inField = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
      if (e.key === "Escape") { e.preventDefault(); return onDismiss() }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && answered) { e.preventDefault(); return next() }
      if (inField || e.metaKey || e.ctrlKey || e.altKey) return
      const n = Number(e.key)
      if (n >= 1 && n <= q.options.length) { e.preventDefault(); if (!q.options[n - 1].disabled) pick(q.options[n - 1]) }
      // Any other character: start typing your own answer (the key lands in the field)
      else if (e.key.length === 1) input.current?.focus()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const steps = progress ?? { index: i, total: questions.length }
  const where = progress
    ? `Step ${progress.index + 1} of ${progress.total}${progress.label ? ` · ${progress.label}` : ""}`
    : `${i + 1} of ${questions.length} question${questions.length > 1 ? "s" : ""}`
  const showNext = q.multi || questions.length > 1
  const header = !!progress || questions.length > 1
  const chevron = (
    <button
      onClick={() => setCollapsed((c) => !c)}
      aria-label={collapsed ? "Show the question" : "Collapse the question"}
      aria-expanded={!collapsed}
      className="-mr-1.5 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <ChevronDown className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
    </button>
  )

  return (
    <div
      className="rise-in overflow-hidden rounded-2xl border bg-card shadow-xl shadow-black/10"
      style={{ "--delay": "0ms", "--hue": hue ?? 250 } as React.CSSProperties}
    >
      {/* Where you are (only when there's more than one) */}
      {header && <div className="flex items-center gap-3 px-5 pt-3.5">
        <span className="text-xs text-muted-foreground">{where}</span>
        <span className="ml-auto flex items-center gap-1" aria-hidden>
          {Array.from({ length: steps.total }, (_, n) => (
            <span
              key={n}
              className={cn(
                "h-[3px] w-4 rounded-full transition-colors",
                n < steps.index ? "bg-[oklch(0.62_0.15_var(--hue))]" : n === steps.index ? "bg-foreground/50" : "bg-foreground/15",
              )}
            />
          ))}
        </span>
        {chevron}
      </div>}

      <div className={cn("flex items-start gap-3 px-5", header ? "pt-1.5" : "pt-4", collapsed ? "pb-3.5" : "pb-0")}>
        <div className="min-w-0 flex-1">
          <h3 className={cn("text-[15px] leading-snug font-medium tracking-tight", collapsed && "truncate")}>{q.title}</h3>
          {!collapsed && q.detail && <p className="mt-0.5 text-[13px] text-muted-foreground">{q.detail}</p>}
        </div>
        {!header && chevron}
      </div>

      {!collapsed && (
        <>
          <div role={q.multi ? "group" : "listbox"} aria-label={q.title} className="mt-3 max-h-[min(46vh,28rem)] space-y-1.5 overflow-y-auto px-3 pb-3">
            {q.options.map((o, n) => {
              const on = a.picked.includes(o.label)
              const expanded = !!o.input && on && open === o.label
              return (
                <div
                  key={o.label}
                  className={cn(
                    "rounded-xl border transition-colors",
                    on
                      ? "border-[oklch(0.62_0.15_var(--hue)/0.6)] bg-[oklch(0.62_0.15_var(--hue)/0.07)]"
                      : o.disabled ? "border-border/50 bg-muted/20" : "border-border/70 bg-muted/30 hover:border-foreground/20 hover:bg-muted/60",
                  )}
                >
                  <button
                    role={q.multi ? "checkbox" : "option"}
                    aria-checked={q.multi ? on : undefined}
                    aria-selected={q.multi ? undefined : on}
                    aria-disabled={o.disabled || undefined}
                    aria-expanded={o.input ? expanded : undefined}
                    disabled={o.disabled}
                    onClick={() => pick(o)}
                    className={cn(inner, o.disabled && "cursor-not-allowed")}
                  >
                    {q.multi ? <Box on={on} /> : <Num n={n + 1} on={on} />}
                    <span className={cn("min-w-0 flex-1", o.disabled && "opacity-50")}>
                      <span className="block text-sm font-medium">
                        {o.label}
                        {o.recommended && <span className="font-normal text-muted-foreground"> (Recommended)</span>}
                      </span>
                      {o.hint && <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{o.hint}</span>}
                    </span>
                    {o.badge && <span className="mt-0.5 shrink-0 rounded-md border bg-background px-1.5 text-[11px] leading-5 font-medium text-muted-foreground">{o.badge}</span>}
                  </button>

                  {/* The option's own text area (e.g. when it should run) */}
                  {expanded && o.input && (
                    <div className="animate-in px-3 pb-3 pl-12 duration-200 fade-in-0 slide-in-from-top-1">
                      <div className="rounded-lg border bg-card focus-within:border-foreground/25 focus-within:ring-2 focus-within:ring-ring/30">
                        <textarea
                          ref={sub}
                          rows={2}
                          value={a.detail ?? ""}
                          onChange={(e) => setAnswers({ ...answers, [q.id]: { ...a, detail: e.target.value } })}
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitDetail() } }}
                          placeholder={o.input.placeholder}
                          aria-label={`${o.label}: details`}
                          className="block w-full resize-none bg-transparent px-3 pt-2.5 text-sm outline-none placeholder:text-muted-foreground"
                        />
                        <div className="flex items-center justify-end px-2 pb-2">
                          <button
                            onClick={submitDetail}
                            disabled={!a.detail?.trim()}
                            className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground disabled:cursor-default disabled:opacity-40"
                          >
                            {o.input.action ?? "Done"} <CornerDownLeft className="size-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Your own words: always the last row */}
            <div
              onClick={() => input.current?.focus()}
              className={cn(row, "cursor-text items-center border-border/70 bg-muted/30 focus-within:border-foreground/25 focus-within:bg-card")}
            >
              {q.multi ? <Box on={!!a.custom.trim()} /> : <Num n={q.options.length + 1} on={false} />}
              <input
                ref={input}
                value={a.custom}
                onChange={(e) => setAnswers({ ...answers, [q.id]: { picked: q.multi ? a.picked : [], custom: e.target.value } })}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); submitOwn() } }}
                placeholder={q.placeholder ?? "Type your own answer…"}
                aria-label="Type your own answer"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {a.custom.trim() && (
                <button
                  onClick={(e) => { e.stopPropagation(); submitOwn() }}
                  aria-label="Use this answer"
                  className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md bg-primary text-primary-foreground"
                >
                  <CornerDownLeft className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 border-t px-3 py-2.5">
            <button onClick={onDismiss} className="h-8 cursor-pointer rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              Dismiss
            </button>
            <span className="ml-auto" />
            {i > 0 && (
              <button onClick={() => setI(i - 1)} className="h-8 cursor-pointer rounded-lg border px-3.5 text-sm font-medium transition-colors hover:bg-accent">
                Back
              </button>
            )}
            {showNext ? (
              <button
                onClick={() => next()}
                disabled={!answered}
                className="flex h-8 cursor-pointer items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground disabled:cursor-default disabled:opacity-40"
              >
                {last ? "Send" : "Next"}
                <span className="flex items-center gap-0.5 text-xs opacity-60">⌘<CornerDownLeft className="size-3" /></span>
              </button>
            ) : (
              <span className="pr-1 text-xs text-muted-foreground">Pick one, or type your own</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const row = "flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50"
const inner = "flex w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50" // inside an option's border

// Number badge (single choice): doubles as the keyboard shortcut
const Num = ({ n, on }: { n: number; on: boolean }) => (
  <span className={cn(
    "flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-medium tabular-nums transition-colors",
    on ? "bg-[oklch(0.62_0.15_var(--hue))] text-white" : "border bg-background text-muted-foreground",
  )}>
    {n}
  </span>
)

const Box = ({ on }: { on: boolean }) => (
  <span className="flex size-6 shrink-0 items-center justify-center">
    <span className={cn(
      "flex size-[18px] items-center justify-center rounded-[5px] border transition-colors",
      on ? "border-transparent bg-[oklch(0.62_0.15_var(--hue))] text-white" : "border-foreground/25 bg-background",
    )}>
      {on && <Check className="size-3" strokeWidth={3} />}
    </span>
  </span>
)
