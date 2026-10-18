import { useEffect, useRef, useState, type ReactNode } from "react"
import { ArrowUp, Moon, Sun, Sunrise, X } from "lucide-react"
import { SuperAgentOrb } from "@/components/super-agents"
import type { SuperAgent } from "@/data/super-agents"
import { useNav } from "@/lib/nav"
import { cn } from "@/lib/utils"

// Start a conversation from Home: plain chat, or a super agent run when sa is given
export function useLaunch() {
  const { navigate } = useNav()
  return (prompt: string, sa?: SuperAgent) => navigate("chat", { prompt, superAgentId: sa?.id })
}

// ponytail: user name is hardcoded for the demo
export function Greeting({ className, delay = 0 }: { className?: string; delay?: number }) {
  const h = new Date().getHours()
  const [word, Icon] = h < 12 ? ["morning", Sunrise] : h < 18 ? ["afternoon", Sun] : ["evening", Moon]
  return (
    <div className={cn("rise-in flex flex-col items-center gap-3 text-center", className)} style={{ "--delay": `${delay}ms` } as React.CSSProperties}>
      <Icon className="size-7 text-muted-foreground" strokeWidth={1.5} />
      <h2 className="text-3xl font-semibold tracking-tight">Good {word}, Eden</h2>
    </div>
  )
}

const NONE: string[] = []

// Types each item out, holds, deletes, moves on. Paused while inactive. Remount (key) to restart with new items.
function useTypewriter(items: string[], active: boolean) {
  const [state, setState] = useState({ i: 0, n: 0, deleting: false })
  useEffect(() => {
    if (!active || items.length === 0) return
    const full = items[state.i % items.length]
    const delay = state.deleting ? 14 : state.n === full.length ? 2400 : 32
    const t = setTimeout(() => setState((s) => {
      if (!s.deleting && s.n < full.length) return { ...s, n: s.n + 1 }
      if (!s.deleting) return { ...s, deleting: true }
      if (s.n > 0) return { ...s, n: s.n - 1 }
      return { i: s.i + 1, n: 0, deleting: false }
    }), delay)
    return () => clearTimeout(t)
  }, [state, active, items])
  const current = items.length ? items[state.i % items.length] : ""
  return { text: current.slice(0, state.n), current }
}

export function Composer({
  value, onChange, onSubmit, placeholder, rotating, header, footer, submitLabel, autoFocus, className, blocked,
}: {
  blocked?: boolean // can't send yet (e.g. a required app isn't connected); footer says why
  value: string
  onChange: (v: string) => void
  onSubmit: (text: string) => void
  placeholder?: string
  rotating?: string[] // typewriter suggestions shown while empty; Tab accepts the current one
  header?: ReactNode // inside the box, above the text (e.g. the selected super agent)
  footer?: ReactNode // inside the box, bottom-left
  submitLabel?: ReactNode // replaces the round arrow, e.g. "Delegate"
  autoFocus?: boolean
  className?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const empty = value.length === 0
  const tw = useTypewriter(rotating ?? NONE, !!rotating && empty)
  const submit = () => { if (value.trim() && !blocked) onSubmit(value.trim()) }

  return (
    <div
      onClick={() => ref.current?.focus()}
      className={cn(
        "relative w-full cursor-text rounded-2xl border bg-card shadow-xl shadow-black/15 transition-[border-color,box-shadow] focus-within:border-foreground/25",
        className,
      )}
    >
      {header && <div className="px-3 pt-3">{header}</div>}
      <div className="relative">
        <textarea
          ref={ref}
          autoFocus={autoFocus}
          rows={2}
          value={value}
          placeholder={rotating ? "" : placeholder}
          aria-label={placeholder ?? tw.current}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit() }
            if (e.key === "Tab" && empty && rotating) { e.preventDefault(); onChange(tw.current) }
          }}
          className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[15px] outline-none placeholder:text-muted-foreground"
        />
        {rotating && empty && (
          <span aria-hidden className="pointer-events-none absolute inset-x-4 top-3.5 flex items-center gap-2 text-[15px] text-muted-foreground">
            <span className="caret truncate">{tw.text}</span>
            {tw.text === tw.current && tw.current && (
              <kbd className="rise-in shrink-0 rounded border px-1.5 py-px font-sans text-[10px]">Tab</kbd>
            )}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 px-3 pb-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">{footer}</div>
        <button
          onClick={(e) => { e.stopPropagation(); submit() }}
          disabled={!value.trim() || blocked}
          aria-label={submitLabel ? undefined : "Send"}
          className={cn(
            "flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-primary text-sm font-medium text-primary-foreground transition-opacity disabled:cursor-default disabled:opacity-30",
            submitLabel ? "px-3.5" : "w-8",
          )}
        >
          {submitLabel ?? <ArrowUp className="size-4" />}
        </button>
      </div>
    </div>
  )
}

// The picked super agent, shown inside the composer; X goes back to plain chat
export function AgentChip({ sa, onClear }: { sa: SuperAgent; onClear: () => void }) {
  return (
    <span className="rise-in inline-flex items-center gap-1.5 rounded-md border bg-muted/50 py-0.5 pr-1 pl-0.5 text-xs" style={{ "--delay": "0ms" } as React.CSSProperties}>
      <SuperAgentOrb sa={sa} size="sm" className="size-5 rounded-[5px] [&_svg]:size-3" />
      <span className="font-medium">{sa.name}</span>
      <button
        aria-label={`Remove ${sa.name}`}
        onClick={(e) => { e.stopPropagation(); onClear() }}
        className="flex size-4 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <X className="size-3" />
      </button>
    </span>
  )
}
