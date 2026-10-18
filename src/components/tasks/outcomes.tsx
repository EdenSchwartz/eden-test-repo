import { Ban, Check, CircleAlert, CircleHelp, TriangleAlert, X, type LucideIcon } from "lucide-react"
import type { Outcome } from "@/data/outcomes"
import { cn } from "@/lib/utils"

// The results a run can end in, as small outlined chips with an icon (like the real product's Agents page).
// In the panel's Overview tab (template-detail.tsx) and a sub agent's panel (sub-agent-card.tsx).
const tones: Record<Outcome["tone"], { icon: LucideIcon; className: string }> = {
  risk: { icon: CircleAlert, className: "border-danger/30 bg-danger-wash text-danger" },
  clear: { icon: Ban, className: "border-line bg-wash text-blue" },
  good: { icon: Check, className: "border-success/30 bg-success-wash text-success" },
  warn: { icon: TriangleAlert, className: "border-warning/30 bg-warning-wash text-warning" },
  unclear: { icon: CircleHelp, className: "border-border bg-card text-muted-foreground" },
  failed: { icon: X, className: "border-danger/30 bg-card text-danger" },
}

export function Outcomes({ items }: { items: Outcome[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((o) => {
        const { icon: Icon, className } = tones[o.tone]
        return (
          <li key={o.label} className={cn("inline-flex h-6 items-center gap-1 rounded-md border px-2 text-xs font-medium whitespace-nowrap", className)}>
            <Icon className="size-3" strokeWidth={2.25} />
            {o.label}
          </li>
        )
      })}
    </ul>
  )
}
