import { CalendarClock, Hand, Zap, type LucideIcon } from "lucide-react"
import { Switch } from "@/components/tasks/enable-switch"
import type { SuperAgent } from "@/data/super-agents"
import { isEnabled, useEnabled } from "@/lib/enabled"
import { days, howOften, nextRun, ordinal, setTrigger, useTriggers, when, type EventConfig, type Schedule } from "@/lib/triggers"
import { cn } from "@/lib/utils"

/*
 * Triggers: what starts one of your agents (its own Triggers tab in the agent drawer, components/tasks/template-detail.tsx; still atop Activity in the older super-agent-panel.tsx).
 *   On demand  always on: you can always ask it (the panel's button, or a chat)
 *   Schedule   how often and when, the next run; its own switch
 *   Event      which event, from where, any filter; its own switch
 * Switched off as a whole (Enabled on its card), nothing fires: the section says so and fades back.
 *
 * Two looks for a trigger's configuration, picked by `look` below (the user is comparing them, 2026-10-18):
 *   "sentence"  compact rows, no On demand row, the config as one sentence with neutral chips:
 *               "Every [Monday] at [09:00] · next [Mon, Oct 19 · 09:00]"
 *   "table"     the earlier version: On demand + taller rows, a label / value list in a frost box (How often, When, Next run…)
 */
const look = "sentence" as "sentence" | "table"

export function TriggersSection({ sa }: { sa: SuperAgent }) {
  useEnabled()
  const t = useTriggers(sa)
  const off = !isEnabled(sa.id)
  const compact = look === "sentence"
  // The sentence look leaves out On demand (you can always ask an agent, so it goes without saying)
  const count = (compact ? 0 : 1) + Number(t.schedule.on) + Number(t.event.on)
  const total = compact ? 2 : 3
  return (
    <section className="space-y-2.5">
      <h3 className="flex items-baseline justify-between text-xs text-muted-foreground">
        Triggers <span className="tabular-nums">{count} of {total} on</span>
      </h3>
      {off && (
        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          {sa.name} is switched off, so none of these fire. Turn it back on from its card.
        </p>
      )}
      <ul className={cn("divide-y divide-hairline overflow-hidden rounded-xl border bg-card transition-opacity", off && "opacity-60")}>
        {!compact && <Row compact={false} icon={Hand} title="On demand" sub="Whenever you ask it" on aside={<span className="text-xs text-muted-foreground">Always on</span>} />}
        <Row
          compact={compact}
          icon={CalendarClock}
          title="Schedule"
          sub={when(t.schedule)}
          on={t.schedule.on}
          aside={<Switch on={t.schedule.on} onChange={(v) => setTrigger(sa, "schedule", v)} label={`${t.schedule.on ? "Turn off" : "Turn on"} the schedule`} />}
        >
          {compact
            ? <ScheduleSentence s={t.schedule} next={t.schedule.on && !off ? nextRun(t.schedule) : undefined} />
            : <Config rows={[["How often", howOften(t.schedule)], ["When", when(t.schedule)], ["Next run", t.schedule.on && !off ? nextRun(t.schedule) : "Off"]]} />}
        </Row>
        <Row
          compact={compact}
          icon={Zap}
          title="Event"
          sub={t.event.event}
          on={t.event.on}
          aside={<Switch on={t.event.on} onChange={(v) => setTrigger(sa, "event", v)} label={`${t.event.on ? "Turn off" : "Turn on"} the event trigger`} />}
        >
          {compact
            ? <EventSentence e={t.event} />
            : <Config rows={[["Event", t.event.event], ["From", t.event.source], ...(t.event.filter ? [["Only if", t.event.filter] as [string, string]] : [])]} />}
        </Row>
      </ul>
    </section>
  )
}

// compact: a smaller icon and the config right under the title (aligned with it); otherwise the taller table row
function Row({ compact, icon: Icon, title, sub, on, aside, children }: {
  compact: boolean; icon: LucideIcon; title: string; sub: string; on: boolean; aside: React.ReactNode; children?: React.ReactNode
}) {
  const tile = cn("flex shrink-0 items-center justify-center rounded-lg transition-colors", on ? "bg-wash text-blue" : "bg-muted text-muted-foreground")
  if (compact) {
    return (
      <li className="px-3.5 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className={cn(tile, "size-6")}><Icon className="size-3.5" /></span>
          <span className="min-w-0 flex-1 font-medium">{title}</span>
          {aside}
        </div>
        {children && <div className={cn("mt-1.5 pl-[34px] text-[13px] leading-[1.9] transition-opacity", !on && "opacity-55")}>{children}</div>}
      </li>
    )
  }
  return (
    <li className="space-y-3 px-3.5 py-3">
      <div className="flex items-center gap-3">
        <span className={cn(tile, "size-8")}><Icon className="size-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">{sub}</span>
        </span>
        {aside}
      </div>
      {children && <div className={cn("transition-opacity", !on && "opacity-55")}>{children}</div>}
    </li>
  )
}

// A value inside a sentence: neutral, quiet, never wraps on its own
const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="mx-0.5 inline-flex items-center rounded-md border bg-muted/60 px-1.5 py-px text-xs font-medium whitespace-nowrap text-foreground">{children}</span>
)

// "Every [Monday] at [09:00] · next [Mon, Oct 19 · 09:00]"
function ScheduleSentence({ s, next }: { s: Schedule; next?: string }) {
  return (
    <p className="text-muted-foreground">
      {s.every === "day" ? <>Every <Chip>day</Chip></> : s.every === "week" ? <>Every <Chip>{days[s.day ?? 1]}</Chip></> : <>On the <Chip>{ordinal(s.day ?? 1)}</Chip> of every month</>}
      {" "}at <Chip>{s.time}</Chip>
      {next && <> · next <Chip>{next}</Chip></>}
    </p>
  )
}

// "On [New findings] from [Wiz] [Snyk] [Dependabot] only if [Severity high or critical]"
function EventSentence({ e }: { e: EventConfig }) {
  return (
    <p className="text-muted-foreground">
      On <Chip>{e.event}</Chip> from {e.source.split(", ").map((src) => <Chip key={src}>{src}</Chip>)}
      {e.filter && <> only if <Chip>{e.filter}</Chip></>}
    </p>
  )
}

// The table look: a trigger's configuration as a quiet label / value list
function Config({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1.5 rounded-lg bg-frost px-3 py-2.5 text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
