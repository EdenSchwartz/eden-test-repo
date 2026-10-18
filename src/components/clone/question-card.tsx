import { useEffect, useRef, useState } from "react"
import { ArrowRight, Check, ChevronDown, CornerDownLeft, Pencil, X } from "lucide-react"
import { defaultSchedule, scheduleLabel, type Draft, type Option, type Question, type Schedule, type Slot } from "@/data/clone-flow"
import { SchedulePicker } from "@/components/clone/schedule-picker"
import { cn } from "@/lib/utils"

/*
 * The clone questionnaire, docked on top of the chat box (pages/clone.tsx). Same logic as Claude's own clarifying questions:
 *   - Questions come in rounds of up to 3 related ones; each has a short header, shown as a tab ("Mission · Scope · Runs").
 *   - Every option is a label + one-line description. The suggested one comes first, marked (Recommended).
 *   - Single choice: picking an option answers it and moves to the next tab. "Select all that apply": tick, then Continue.
 *   - "Other" is always the last row: your own words, read for this question and any other they answer.
 *   - After the last question, Submit shows your answers for a final look. Rival then reacts once to the whole round,
 *     and the next round adapts to it (follow-ups only appear when an answer calls for them).
 *   - Dismiss (✕ / Esc) stops asking; unanswered questions keep Rival's defaults.
 *   - Keys: ←→ switch tabs, ↑↓ move, ↵ picks, 1–9 picks directly, ⌘↵ continues / submits.
 */

export type Choice = { sel: string[]; custom: string; skipped?: boolean; schedule?: Schedule }
export type Answer = { picked: Option[]; custom: string; skipped?: boolean; schedule?: Schedule }

export function RoundCard({ questions, draft, initial, onSubmit, onDismiss }: {
  questions: Question[]
  draft: Draft
  initial?: Partial<Record<Slot, Choice>> // earlier answers, when a question is reopened
  onSubmit: (answers: Partial<Record<Slot, Answer>>) => void
  onDismiss: () => void
}) {
  const [answers, setAnswers] = useState<Partial<Record<Slot, Choice>>>(() =>
    Object.fromEntries(questions.flatMap((q) => (initial?.[q.slot] ? [[q.slot, { sel: initial[q.slot]!.sel, custom: initial[q.slot]!.custom }]] : []))),
  )
  const [done, setDone] = useState<Slot[]>([])
  // The last schedule you set up, kept even if you switch to another option and come back
  const [schedule, setSchedule] = useState<Schedule>(() => questions.map((q) => initial?.[q.slot]?.schedule).find(Boolean) ?? defaultSchedule)
  const [tab, setTab] = useState(0) // questions.length = Submit
  const reviewing = tab === questions.length
  const single = questions.length === 1 // one question: answering it submits, no Submit tab

  const submit = (a = answers, d = done) => {
    const out: Partial<Record<Slot, Answer>> = {}
    for (const q of questions) {
      if (!d.includes(q.slot)) continue
      const c = a[q.slot] ?? { sel: [], custom: "" }
      out[q.slot] = { picked: q.options(draft).filter((o) => c.sel.includes(o.label)), custom: c.custom.trim(), skipped: c.skipped, schedule: c.schedule }
    }
    onSubmit(out)
  }

  // Record an answer, then go to the next unanswered tab (or Submit)
  const answer = (slot: Slot, c: Choice) => {
    const a = { ...answers, [slot]: c }
    const d = [...new Set([...done, slot])]
    setAnswers(a)
    setDone(d)
    if (single) return submit(a, d)
    const i = questions.findIndex((q) => q.slot === slot)
    const after = questions.findIndex((q, j) => j > i && !d.includes(q.slot))
    const any = questions.findIndex((q) => !d.includes(q.slot))
    setTab(after >= 0 ? after : any >= 0 ? any : questions.length)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inField = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
      if (e.key === "Escape" && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); return onDismiss() }
      if (reviewing && e.key === "Enter" && (e.metaKey || e.ctrlKey || !inField)) { e.preventDefault(); return submit() }
      if (inField || e.metaKey || e.ctrlKey || e.altKey || single) return
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault()
        setTab((t) => Math.max(0, Math.min(questions.length, t + (e.key === "ArrowRight" ? 1 : -1))))
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const tabs = [...questions.map((q) => ({ label: q.header, done: done.includes(q.slot) })), ...(single ? [] : [{ label: "Submit", done: false }])]

  return (
    <div className="rise-in overflow-hidden rounded-2xl border bg-card shadow-xl shadow-black/20" style={{ "--delay": "0ms" } as React.CSSProperties}>
      {/* Tabs: one per question, then Submit */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <div role="tablist" aria-label="Questions" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              role="tab"
              aria-selected={tab === i}
              onClick={() => setTab(i)}
              className={cn(
                "flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
                tab === i ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.done
                ? <Check className="size-3 text-[oklch(0.75_0.13_var(--hue))]" strokeWidth={3} />
                : i < questions.length && <span className={cn("size-1.5 rounded-full", tab === i ? "bg-foreground" : "bg-foreground/30")} />}
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss questions (Esc)"
          title="Dismiss (Esc)"
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {reviewing ? (
        <Review questions={questions} answers={answers} done={done} onEdit={setTab} onSubmit={() => submit()} />
      ) : (
        <QuestionBody
          key={questions[tab].slot}
          question={questions[tab]}
          draft={draft}
          initial={answers[questions[tab].slot]}
          schedule={schedule}
          onSchedule={setSchedule}
          onAnswer={(c) => answer(questions[tab].slot, c)}
        />
      )}
    </div>
  )
}

function QuestionBody({ question, draft, initial, schedule, onSchedule, onAnswer }: {
  question: Question; draft: Draft; initial?: Choice; schedule: Schedule; onSchedule: (s: Schedule) => void; onAnswer: (c: Choice) => void
}) {
  const options = question.options(draft)
  const multi = !!question.multi
  const [sel, setSel] = useState<string[]>(initial?.sel ?? [])
  const [custom, setCustom] = useState(initial?.custom ?? "")
  const [active, setActive] = useState(-1) // keyboard highlight; options.length = Other
  const input = useRef<HTMLInputElement>(null)
  const rows = useRef<(HTMLElement | null)[]>([])

  // "On a schedule" doesn't answer on click: it opens the schedule picker inside the option

  const [picking, setPicking] = useState(!!initial?.schedule)
  const confirmSchedule = () => {
    const o = options.find((x) => x.schedule)
    if (o) onAnswer({ sel: [o.label], custom: "", schedule })
  }

  const choose = (o: Option) => {
    if (multi) setSel((s) => (s.includes(o.label) ? s.filter((x) => x !== o.label) : [...s, o.label]))
    else if (o.schedule) { setSel([o.label]); setPicking(true) }
    else onAnswer({ sel: [o.label], custom: "" }) // picking anything else answers it (and the picker closes with the card)
  }
  const submitOther = () => { if (custom.trim()) onAnswer({ sel: multi ? sel : [], custom }) }
  const confirm = () => onAnswer({ sel, custom })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inOther = e.target === input.current
      const inOtherField = !inOther && (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      if (multi && e.key === "Enter" && (e.metaKey || e.ctrlKey) && !inOtherField) { e.preventDefault(); return confirm() }
      if (picking && e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); return confirmSchedule() }
      if (inOtherField || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault()
        const n = Math.max(0, Math.min(options.length, active + (e.key === "ArrowDown" ? 1 : -1)))
        setActive(n)
        if (n === options.length) input.current?.focus()
        else { input.current?.blur(); rows.current[n]?.focus() }
        return
      }
      if (inOther) return
      const n = Number(e.key)
      if (n >= 1 && n <= options.length) { e.preventDefault(); setActive(n - 1); choose(options[n - 1]) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  return (
    <>
      <div className="px-5 pt-4">
        <h3 className="text-base leading-snug font-medium tracking-tight">{question.title(draft)}</h3>
        {question.detail && <p className="mt-1 text-sm text-muted-foreground">{question.detail(draft)}</p>}
      </div>

      <div role={multi ? "group" : "listbox"} aria-label={question.title(draft)} className="mt-3 max-h-[min(42vh,26rem)] overflow-y-auto px-2 pb-2">
        {options.map((o, i) => {
          const on = sel.includes(o.label)
          const open = !multi && o.schedule && on && picking // the schedule picker, inside this option
          return (
            <div key={o.label} className={cn("rounded-xl transition-colors", open && "bg-[oklch(0.6_0.14_var(--hue)/0.1)] ring-1 ring-[oklch(0.72_0.13_var(--hue)/0.4)]")}>
              <button
                ref={(el) => { rows.current[i] = el }}
                role={multi ? "checkbox" : "option"}
                aria-checked={multi ? on : undefined}
                aria-selected={multi ? undefined : on}
                aria-expanded={o.schedule ? !!open : undefined}
                onClick={() => choose(o)}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                className={cn(row, !open && active === i && "bg-accent", !open && on && "bg-[oklch(0.6_0.14_var(--hue)/0.14)]")}
              >
                {multi ? <Checkbox on={on} /> : <Num n={i + 1} on={on} active={active === i} />}
                <span className="min-w-0 flex-1 py-0.5">
                  <span className="block text-sm font-medium">
                    {o.label}
                    {o.recommended && <span className="font-normal text-muted-foreground"> (Recommended)</span>}
                  </span>
                  {o.hint && <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{open ? scheduleLabel(schedule) : o.hint}</span>}
                </span>
                {!multi && (
                  o.schedule
                    ? <ChevronDown className={cn("mt-1 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
                    : on && active !== i
                      ? <Check className="mt-1 size-4 shrink-0 text-[oklch(0.75_0.13_var(--hue))]" />
                      : <ArrowRight className={cn("mt-1 size-4 shrink-0 text-muted-foreground transition-opacity", active === i ? "opacity-100" : "opacity-0")} />
                )}
              </button>
              {open && <SchedulePicker value={schedule} onChange={onSchedule} onConfirm={confirmSchedule} />}
            </div>
          )
        })}

        {/* Other: always there, your own words */}
        <div
          onClick={() => input.current?.focus()}
          onMouseEnter={() => setActive(options.length)}
          className={cn(row, "cursor-text items-center", active === options.length && "bg-accent")}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><Pencil className="size-3.5" /></span>
          <input
            ref={input}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onFocus={() => setActive(options.length)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); submitOther() } }}
            placeholder={question.otherPlaceholder ?? "Other"}
            aria-label="Other: type your own answer"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {custom.trim() ? (
            <button onClick={(e) => { e.stopPropagation(); submitOther() }} aria-label="Use this answer" className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md bg-primary text-primary-foreground">
              <CornerDownLeft className="size-3.5" />
            </button>
          ) : !multi && (
            <button onClick={(e) => { e.stopPropagation(); onAnswer({ sel: [], custom: "", skipped: true }) }} className="h-7 shrink-0 cursor-pointer rounded-md border px-3 text-sm font-medium transition-colors hover:bg-background">
              Skip
            </button>
          )}
        </div>
      </div>

      {/* Only "select all that apply" needs a confirm */}
      {multi && (
        <div className="flex items-center justify-end gap-2 border-t px-4 py-2.5">
          <span className="mr-auto text-xs text-muted-foreground">{sel.length ? `${sel.length} selected` : "None selected covers everything"}</span>
          <button onClick={confirm} className="flex h-8 cursor-pointer items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground">
            {sel.length || custom.trim() ? "Continue" : "Skip"}
            <span className="flex items-center gap-0.5 text-xs opacity-60">⌘<CornerDownLeft className="size-3" /></span>
          </button>
        </div>
      )}
    </>
  )
}

// Submit: every answer at a glance, click one to change it
function Review({ questions, answers, done, onEdit, onSubmit }: {
  questions: Question[]; answers: Partial<Record<Slot, Choice>>; done: Slot[]; onEdit: (i: number) => void; onSubmit: () => void
}) {
  const open = questions.filter((q) => !done.includes(q.slot)).length
  return (
    <>
      <div className="px-5 pt-4">
        <h3 className="text-base font-medium tracking-tight">Review your answers</h3>
        <p className="mt-1 text-sm text-muted-foreground">{open ? `${open} unanswered: ${open === 1 ? "it keeps" : "they keep"} Rival's default.` : "Rival will update the draft with all of them at once."}</p>
      </div>
      <dl className="mt-3 space-y-1 px-2 pb-2">
        {questions.map((q, i) => {
          const c = answers[q.slot]
          const value = !done.includes(q.slot) ? "Not answered" : c?.skipped ? "Skipped" : c?.schedule ? scheduleLabel(c.schedule) : [...(c?.sel ?? []), ...(c?.custom.trim() ? [`“${c.custom.trim()}”`] : [])].join(", ") || (q.multi ? "No narrowing" : "Skipped")
          return (
            <button key={q.slot} onClick={() => onEdit(i)} className={cn(row, "items-center hover:bg-accent")}>
              <dt className="w-24 shrink-0 text-xs text-muted-foreground">{q.header}</dt>
              <dd className={cn("min-w-0 flex-1 text-sm", !done.includes(q.slot) && "text-muted-foreground")}>{value}</dd>
              <span className="text-xs text-muted-foreground">Change</span>
            </button>
          )
        })}
      </dl>
      <div className="flex items-center justify-end border-t px-4 py-2.5">
        <button onClick={onSubmit} className="flex h-8 cursor-pointer items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground">
          Submit answers
          <span className="flex items-center gap-0.5 text-xs opacity-60">⌘<CornerDownLeft className="size-3" /></span>
        </button>
      </div>
    </>
  )
}

const row = "flex w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition-colors"

// Number badge (single choice): doubles as the keyboard shortcut
const Num = ({ n, on, active }: { n: number; on: boolean; active: boolean }) => (
  <span className={cn(
    "flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-medium tabular-nums transition-colors",
    on ? "bg-[oklch(0.62_0.15_var(--hue))] text-white" : active ? "bg-foreground/15 text-foreground" : "bg-muted text-muted-foreground",
  )}>
    {n}
  </span>
)

const Checkbox = ({ on }: { on: boolean }) => (
  <span className="flex size-7 shrink-0 items-center justify-center">
    <span className={cn(
      "flex size-[18px] items-center justify-center rounded-[5px] border transition-colors",
      on ? "border-transparent bg-[oklch(0.62_0.15_var(--hue))] text-white" : "border-foreground/25 bg-background",
    )}>
      {on && <Check className="size-3" strokeWidth={3} />}
    </span>
  </span>
)
