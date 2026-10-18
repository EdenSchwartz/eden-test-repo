import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { CalendarClock, Flag, Hand, Maximize, Minus, Play, Plus, Zap } from "lucide-react"
import { agents, type AgentKind } from "@/components/chat/agents"
import { cn } from "@/lib/utils"
import type { SuperAgent } from "@/data/super-agents"
import type { Structure } from "@/data/task-setup"

/*
 * A task's workflow as a vertical flow chart, on a dotted canvas (Task templates page, pages/gallery.tsx):
 *   Start (how it's triggered) → its agents in order (agents in the same step side by side, "In parallel") → Result.
 * Each agent node says what that agent does. Connectors fan out into parallel steps and back in.
 * The canvas zooms and pans: pinch or ⌘/Ctrl + scroll to zoom (toward the cursor), drag or scroll to pan,
 * and the − / % / + / fit controls in the corner. It opens fitted to the panel (never above 100%).
 * With a structure (customizing a task, pages/chat.tsx) it previews it live: agents you turned off fade to a dashed
 * "Off" node (kept in place so the layout doesn't jump), steps that wait for you say "Needs approval",
 * and the agent you're editing (focus) is highlighted.
 * noRoles: the minimal version: just the agents, each its icon and name (no role, no step number, no Start or Result, no zoom buttons); scrollPage: plain scroll scrolls the page around it instead of panning
 * (both for the wide template panel, components/tasks/template-detail.tsx).
 */

const W = 232 // node width (px)
const W_SMALL = 160 // node width in the minimal version (icon + name on one line)
const G = 40 // gap between parallel nodes
const H_FULL = 64 // connector height
const H_SMALL = 30 // the minimal version's shortest connector…
const H_SMALL_MAX = 72 // …and its longest, when there's room to spread out
const NODE_SMALL_H = 34 // a minimal agent node's height
const rowWidth = (n: number, w = W) => n * w + (n - 1) * G
const centers = (n: number, w = W) => Array.from({ length: n }, (_, i) => -rowWidth(n, w) / 2 + w / 2 + i * (w + G))

export function WorkflowCanvas({ sa, structure, focus, noRoles, scrollPage }: { sa: SuperAgent; structure?: Structure; focus?: AgentKind; noRoles?: boolean; scrollPage?: boolean }) {
  // The minimal version breathes: when the canvas has spare height, the steps spread out (text stays the same size)
  const wrap = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)
  useEffect(() => {
    const el = wrap.current
    if (!noRoles || !el) return
    const ro = new ResizeObserver(() => setHeight(el.clientHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [noRoles])
  const gaps = sa.pattern.length - 1
  const spread = noRoles && gaps > 0
    ? Math.min(H_SMALL_MAX, Math.max(H_SMALL, (height - 2 * 16 - 2 * 32 - sa.pattern.length * NODE_SMALL_H) / gaps))
    : undefined

  return (
    <div ref={wrap} className="h-full">
      <ZoomCanvas scrollPage={scrollPage} controls={!noRoles} refitOnChange={noRoles}>
        <Flow sa={sa} structure={structure} focus={focus} noRoles={noRoles} connectorH={spread} />
      </ZoomCanvas>
    </div>
  )
}

function Flow({ sa, structure, focus, noRoles, connectorH }: { sa: SuperAgent; structure?: Structure; focus?: AgentKind; noRoles?: boolean; connectorH?: number }) {
  const pattern = sa.pattern
  const trigger = sa.trigger
  const StartIcon = trigger?.kind === "event" ? Zap : trigger?.kind === "schedule" ? CalendarClock : trigger ? Hand : Play
  const rows: number[] = [1, ...pattern.map((s) => s.length), 1] // start · steps · result, for the connectors
  return (
    <div className={cn("flex w-max flex-col items-center", noRoles ? "p-4" : "px-10 py-10")}>
      {!noRoles && <Terminal icon={StartIcon} title="Start" detail={trigger && trigger.kind !== "manual" ? trigger.label : "When you run it"} />}
      {pattern.map((stage, i) => (
        <Fragment key={i}>
          {/* The minimal version has no Start node, so its first step has nothing above it */}
          {(!noRoles || i > 0) && <Connector from={rows[i]} to={stage.length} label={stage.length > 1 ? "In parallel" : undefined} small={noRoles} height={connectorH} />}
          <div className="flex justify-center" style={{ gap: G }}>
            {stage.map((k) => (
              <AgentNode key={k} kind={k} step={i + 1} off={structure?.[k]?.on === false} approval={structure?.[k]?.on !== false && structure?.[k]?.approval} focused={focus === k} hue={sa.hue} noRole={noRoles} />
            ))}
          </div>
        </Fragment>
      ))}
      {!noRoles && (
        <>
          <Connector from={pattern.at(-1)?.length ?? 1} to={1} />
          <Terminal icon={Flag} title="Result" detail={`e.g. ${sa.script.result.verdict.toLowerCase()} · ${sa.script.result.detail.toLowerCase()}`} />
        </>
      )}
    </div>
  )
}

function Terminal({ icon: Icon, title, detail }: { icon: typeof Flag; title: string; detail: string }) {
  return (
    <div className="rise-in flex items-center gap-2.5 rounded-xl border bg-card px-3.5 py-2.5 shadow-sm" style={{ "--delay": "0ms" } as React.CSSProperties}>
      <Icon className="size-4 text-muted-foreground" />
      <span className="text-sm font-medium">{title}</span>
      <span className="max-w-64 text-xs leading-snug text-muted-foreground">{detail}</span>
    </div>
  )
}

function AgentNode({ kind, step, approval, off, focused, hue, noRole }: { kind: AgentKind; step: number; approval?: boolean; off?: boolean; focused?: boolean; hue?: number; noRole?: boolean }) {
  const { name, icon: Icon, role } = agents[kind]
  return (
    <div
      className={cn(
        "rise-in rounded-xl border transition-[opacity,box-shadow,border-color,background-color] duration-300",
        noRole ? "px-2.5 py-1.5" : "p-3",
        off ? "border-dashed bg-card/40 opacity-50 shadow-none" : "bg-card shadow-[0_1px_2px_#1018280d]",
        focused && "ring-2 ring-[oklch(0.62_0.15_var(--hue))] ring-offset-2 ring-offset-background",
      )}
      style={{ width: noRole ? W_SMALL : W, "--delay": `${80 + step * 60}ms`, "--hue": hue ?? 250 } as React.CSSProperties}
    >
      <div className="flex items-center gap-2">
        <span className={cn("flex shrink-0 items-center justify-center rounded-md bg-wash text-blue", noRole ? "size-5 [&_svg]:size-3" : "size-6 [&_svg]:size-3.5")}><Icon /></span>
        <span className={cn("flex-1 font-medium whitespace-nowrap", noRole ? "text-xs" : "text-sm")}>{name.replace(/ agent$/, "")}</span>
        {!noRole && <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">Step {step}</span>}
      </div>
      {!noRole && <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{role}</p>}
      {off && <span className="mt-2 inline-flex h-5 items-center rounded-md border border-dashed px-1.5 text-[11px] font-medium text-muted-foreground">Off</span>}
      {approval && (
        <span className="mt-2 inline-flex h-5 items-center gap-1 rounded-md bg-amber-500/10 px-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-500">
          <Hand className="size-3" /> Needs approval
        </span>
      )}
    </div>
  )
}

// Curves from every node above to every node below (fan out / fan in), with an arrow into each node below
function Connector({ from, to, label, small, height }: { from: number; to: number; label?: string; small?: boolean; height?: number }) {
  const nw = small ? W_SMALL : W
  const H = height ?? (small ? H_SMALL : H_FULL)
  const w = Math.max(rowWidth(from, nw), rowWidth(to, nw))
  const a = centers(from, nw)
  const b = centers(to, nw)
  return (
    <div className="relative" style={{ width: w, height: H }}>
      <svg width={w} height={H} viewBox={`${-w / 2} 0 ${w} ${H}`} className="text-line" aria-hidden>
        <defs>
          <marker id="wf-arrow" viewBox="0 0 8 8" refX="4" refY="7" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M0.5 1.5 L4 7 L7.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
          </marker>
        </defs>
        {a.flatMap((x1) => b.map((x2) => (
          <path key={`${x1}-${x2}`} d={`M ${x1} 0 C ${x1} ${H / 2}, ${x2} ${H / 2}, ${x2} ${H - 2}`} fill="none" stroke="currentColor" strokeWidth="1.2" markerEnd="url(#wf-arrow)" />
        )))}
      </svg>
      {label && (
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-wash px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-blue">
          {label}
        </span>
      )}
    </div>
  )
}

// ---------- Zoom & pan ----------

const MIN = 0.4
const MAX = 2
const DOT = 18 // dot grid spacing at 100%
const clamp = (k: number) => Math.min(MAX, Math.max(MIN, k))

type View = { x: number; y: number; k: number }

function ZoomCanvas({ children, scrollPage, controls = true, refitOnChange }: { children: React.ReactNode; scrollPage?: boolean; controls?: boolean; refitOnChange?: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number } | null>(null)
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 })
  const [dragging, setDragging] = useState(false)
  const [animate, setAnimate] = useState(false) // smooth only for button zooms, not wheel/drag

  // Fit the whole flow in the panel, centered (never zoom past 100% to fit)
  const fit = useCallback(() => {
    const b = box.current, c = content.current
    if (!b || !c) return
    const k = clamp(Math.min(1, b.clientWidth / c.offsetWidth, b.clientHeight / c.offsetHeight))
    setView({ k, x: (b.clientWidth - c.offsetWidth * k) / 2, y: Math.max(0, (b.clientHeight - c.offsetHeight * k) / 2) })
  }, [])
  useLayoutEffect(fit, [fit])
  // The panel changed size (the split opening, the window resizing): fit again
  useEffect(() => {
    const b = box.current
    if (!b) return
    let w = b.clientWidth, h = b.clientHeight
    const ro = new ResizeObserver(() => {
      if (b.clientWidth === w && b.clientHeight === h) return
      w = b.clientWidth; h = b.clientHeight
      fit()
    })
    ro.observe(b)
    // The flow itself changed size (the minimal version spreading out): fit again
    const c = content.current
    const rc = new ResizeObserver(() => fit())
    if (c && refitOnChange) rc.observe(c)
    return () => { ro.disconnect(); rc.disconnect() }
  }, [fit, refitOnChange])


  // Zoom by a factor around a point in the panel (default: its center)
  const zoomAt = useCallback((factor: number, px?: number, py?: number) => {
    const b = box.current
    if (!b) return
    const cx = px ?? b.clientWidth / 2, cy = py ?? b.clientHeight / 2
    setView((v) => {
      const k = clamp(v.k * factor)
      return { k, x: cx - ((cx - v.x) * k) / v.k, y: cy - ((cy - v.y) * k) / v.k }
    })
  }, [])

  // Wheel: pinch / ⌘ / Ctrl zooms toward the cursor, plain scroll pans (non-passive so the page doesn't scroll)
  useEffect(() => {
    const b = box.current
    if (!b) return
    const onWheel = (e: WheelEvent) => {
      if (scrollPage && !e.ctrlKey && !e.metaKey) return // let the page scroll
      e.preventDefault()
      setAnimate(false)
      if (e.ctrlKey || e.metaKey) {
        const r = b.getBoundingClientRect()
        zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top)
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
      }
    }
    b.addEventListener("wheel", onWheel, { passive: false })
    return () => b.removeEventListener("wheel", onWheel)
  }, [zoomAt, scrollPage])

  const button = (factor: number | "fit") => () => {
    setAnimate(true)
    if (factor === "fit") fit()
    else zoomAt(factor)
  }

  return (
    <div
      ref={box}
      className={`relative h-full touch-none overflow-hidden bg-frost select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      // The dots move and scale with the flow, so it reads as one surface
      style={{
        backgroundImage: "radial-gradient(circle, color-mix(in oklab, var(--foreground) 12%, transparent) 1px, transparent 1.2px)",
        backgroundSize: `${DOT * view.k}px ${DOT * view.k}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
      }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("button")) return
        drag.current = { x: e.clientX - view.x, y: e.clientY - view.y }
        e.currentTarget.setPointerCapture(e.pointerId)
        setAnimate(false)
        setDragging(true)
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (d) setView((v) => ({ ...v, x: e.clientX - d.x, y: e.clientY - d.y }))
      }}
      onPointerUp={() => { drag.current = null; setDragging(false) }}
      onPointerCancel={() => { drag.current = null; setDragging(false) }}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) return
        const r = e.currentTarget.getBoundingClientRect()
        setAnimate(true)
        zoomAt(1.5, e.clientX - r.left, e.clientY - r.top)
      }}
    >
      <div
        ref={content}
        className="absolute top-0 left-0 w-max origin-top-left"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, transition: animate ? "transform 200ms cubic-bezier(0.2,0,0,1)" : undefined }}
      >
        {children}
      </div>

      {/* Zoom controls */}
      {controls && <div className="absolute bottom-3 left-3 flex items-center rounded-lg border bg-card p-0.5 shadow-sm">
        <ZoomButton label="Zoom out" onClick={button(1 / 1.25)} disabled={view.k <= MIN}><Minus className="size-3.5" /></ZoomButton>
        <button
          onClick={() => { setAnimate(true); zoomAt(1 / view.k) }}
          title="Reset to 100%"
          className="h-7 w-11 cursor-pointer rounded-md text-xs text-muted-foreground tabular-nums transition-colors hover:bg-accent hover:text-foreground"
        >
          {Math.round(view.k * 100)}%
        </button>
        <ZoomButton label="Zoom in" onClick={button(1.25)} disabled={view.k >= MAX}><Plus className="size-3.5" /></ZoomButton>
        <span className="mx-0.5 h-4 w-px bg-border" />
        <ZoomButton label="Fit to view" onClick={button("fit")}><Maximize className="size-3.5" /></ZoomButton>
      </div>}
    </div>
  )
}

const ZoomButton = ({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
  >
    {children}
  </button>
)
