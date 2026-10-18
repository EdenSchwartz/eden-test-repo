import { ArrowUpRight } from "lucide-react"

// Questions an agent can actually answer, as a short clickable list. Clicking one asks it in the same conversation.
// Used when you start a chat with an agent (pages/chat.tsx) and right after creating one (pages/clone.tsx).
export function SuggestedQuestions({ title, items, busy, onAsk }: { title: string; items: string[]; busy?: boolean; onAsk: (q: string) => void }) {
  return (
    <div className="space-y-2 pt-1">
      <p className="text-xs text-muted-foreground">{title}</p>
      <div className="divide-y overflow-hidden rounded-xl border">
        {items.slice(0, 3).map((q, i) => (
          <button
            key={q}
            onClick={() => onAsk(q)}
            disabled={busy}
            className="rise-in group flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left text-sm transition-colors enabled:hover:bg-accent disabled:cursor-default disabled:opacity-50"
            style={{ "--delay": `${120 + i * 60}ms` } as React.CSSProperties}
          >
            {/* @CVE-… is a mention in the chat; the list shows it as plain text */}
            <span className="min-w-0 flex-1">{q.replace(/@(?=CVE-)/, "")}</span>
            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
          </button>
        ))}
      </div>
    </div>
  )
}
