import { Check, Hand } from "lucide-react"
import type { TaskStatus } from "@/lib/task-status"
import { cn } from "@/lib/utils"

/*
 * How an agent is doing, as a small chip in the card's top-right corner (components/tasks/template-card.tsx).
 * Each state has its own little motion so you can read the grid at a glance, with the eye drawn to "Needs you":
 *   Running    blue, three bars bouncing like a level meter, a light sweep crossing the chip
 *   Needs you  amber, a waving hand with a ring pulsing out of it (the card glows amber too)
 *   Stopped    grey, hatched like tape, a pause glyph
 *   Never run  a dashed outline, an empty circle: nothing has happened yet ("Ready" for sub agents)
 *   Ran …      green, a check that draws itself once
 * Fixed height and never wraps, so it never pushes the card around. Styles: .status-chip in index.css.
 */
export function StatusChip({ status, className }: { status: TaskStatus; className?: string }) {
  const { tone, label } = status
  return (
    <span data-tone={tone} className={cn("status-chip", className)}>
      {tone === "running" ? (
        <span aria-hidden className="status-bars"><i /><i /><i /></span>
      ) : tone === "attention" ? (
        <span aria-hidden className="relative flex size-3 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-warning/40" />
          <Hand className="status-wave relative size-3" strokeWidth={2.25} />
        </span>
      ) : tone === "stopped" ? (
        <span aria-hidden className="flex h-2 gap-[2px]"><i className="w-[2.5px] rounded-full bg-current" /><i className="w-[2.5px] rounded-full bg-current" /></span>
      ) : tone === "done" ? (
        <Check aria-hidden className="status-check size-3" strokeWidth={3} />
      ) : (
        <span aria-hidden className="size-2 rounded-full border-[1.5px] border-current" />
      )}
      {label}
    </span>
  )
}
