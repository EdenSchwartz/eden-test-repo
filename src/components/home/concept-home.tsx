import { useRef, useState } from "react"
import { ArrowRight, Check, Play } from "lucide-react"
import { AgentChip, Composer, Greeting, useLaunch } from "@/components/home/composer"
import { SuperAgentPanel, usePanelWidth } from "@/components/super-agent-panel"
import { AgentMeta, SuperAgentOrb } from "@/components/super-agents"
import { blockers, getSuperAgent, matchSuperAgent, type SuperAgent } from "@/data/super-agents"
import { useNav } from "@/lib/nav"
import { cn } from "@/lib/utils"

// Typewriter mixes questions (chat) with jobs (super agents), so both uses are suggested from the first second
const suggestions = [
  "What's exposed to the internet right now?",
  "Red team the new billing assistant before Friday's launch",
  "Which agents leaked PII this week?",
  "Remediate @CVE-2026-94545 as fast as possible",
  "Explain the latest prompt injection attempt",
  "Prepare the AI section of our SOC 2 evidence",
]

// Home: chat on top, super agents marketplace below, one page.
//   Chat:   typewriter suggestions (Tab accepts). Plain questions go to Rival.
//   Bridge: when what you type is really a job, offer the matching super agent: run it, or see how it works.
//   Cards:  picking a super agent puts it in the chat right away (hero, chip, its own typewriter briefs)
//           and opens its profile in the side panel (components/super-agent-panel.tsx).
export function ConceptHome({ initial, created }: { initial?: SuperAgent; created?: boolean }) {
  const launch = useLaunch()
  const { navigate } = useNav()
  const top = useRef<HTMLDivElement>(null)
  const [value, setValue] = useState("")
  const [picked, setPicked] = useState(initial) // the composer briefs this agent
  const [profile, setProfile] = useState<SuperAgent | null>(initial ?? null)
  const match = picked ? undefined : matchSuperAgent(value)
  const focus = profile ?? picked ?? match // whose hue tints the page
  const pickedBlockers = picked ? blockers(picked) : []

  const select = (sa: SuperAgent) => {
    setPicked(sa)
    setProfile(sa)
    setValue("")
    top.current?.scrollIntoView({ block: "start", behavior: "smooth" }) // so you see it land in the chat
  }
  const clear = () => { setPicked(undefined); setProfile(null) } // the panel and the chat context go together
  const clone = (sa: SuperAgent) => navigate("clone", { templateId: sa.id }) // guided clone chat (pages/clone.tsx)
  const startChat = (sa: SuperAgent) => navigate("chat", { superAgentId: sa.id, startChat: true }) // a conversation with it (pages/chat.tsx)
  const [panelWidth, setPanelWidth] = usePanelWidth()
  const [resizing, setResizing] = useState(false)

  return (
    // Wide screens: leave room for the docked panel so the chat stays visible beside it. Narrow: the panel slides over.
    <div
      ref={top}
      style={{ "--panel-w": `${panelWidth}px` } as React.CSSProperties}
      className={cn("scroll-mt-6", !resizing && "transition-[padding] duration-300 ease-snappy", profile && "xl:pr-[calc(var(--panel-w)+20px)]")}
    >
      <div className="relative isolate mx-auto flex w-full max-w-5xl flex-col items-center gap-7 pt-[6vh] pb-16">
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-1/2 -z-10 h-72 w-[36rem] max-w-full -translate-x-1/2 rounded-full opacity-60 blur-3xl transition-[background] duration-700"
          style={{ background: focus ? `radial-gradient(closest-side, oklch(0.6 0.14 ${focus.hue} / 0.3), transparent)` : "transparent" }}
        />

        {/* The chat's context: you, or the super agent you picked */}
        {picked ? (
          <div key={picked.id} className="flex flex-col items-center gap-3 text-center">
            {/* Just made in the guided clone chat (pages/clone.tsx): say so, and where it came from */}
            {created && picked.id === initial?.id && (
              <span className="rise-in inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
                <Check className="size-3 text-emerald-500" />
                Created from {getSuperAgent(picked.clonedFrom)?.name ?? "a Rival template"}
                {picked.trigger && picked.trigger.kind !== "manual" && <> · runs {picked.trigger.label.charAt(0).toLowerCase() + picked.trigger.label.slice(1)}</>}
              </span>
            )}
            <SuperAgentOrb sa={picked} size="lg" className="rise-in" />
            <h2 className="rise-in text-3xl font-semibold tracking-tight" style={{ "--delay": "40ms" } as React.CSSProperties}>{picked.name}</h2>
            <p className="rise-in max-w-md text-muted-foreground" style={{ "--delay": "80ms" } as React.CSSProperties}>{picked.tagline}</p>
          </div>
        ) : (
          <Greeting key="greeting" />
        )}

        <div className="rise-in w-full max-w-2xl space-y-3" style={{ "--delay": "80ms" } as React.CSSProperties}>
          <Composer
            key={picked?.id ?? "ask"}
            value={value}
            onChange={setValue}
            onSubmit={(t) => launch(t, picked)}
            rotating={picked ? picked.briefs : suggestions}
            autoFocus
            header={picked && <AgentChip sa={picked} onClear={clear} />}
            blocked={pickedBlockers.length > 0}
            footer={
              pickedBlockers.length > 0
                ? <span className="text-xs text-amber-500">Connect {pickedBlockers.map((t) => t.name).join(", ")} to run {picked!.name}</span>
                : <span className="text-xs text-muted-foreground">{picked ? `Running ${picked.name} · its agents work through each step and report back` : "Asking Rival"}</span>
            }
            submitLabel={picked && <><Play className="size-3.5" /> Run</>}
          />

          {/* What you typed is really a job: offer the super agent built for it */}
          {match && (
            <div
              key={match.id}
              className="rise-in flex w-full items-center gap-3 rounded-xl border border-dashed bg-card/60 p-2.5 pr-2.5 text-sm"
              style={{ "--delay": "0ms" } as React.CSSProperties}
            >
              <SuperAgentOrb sa={match} size="sm" className="size-8 rounded-lg [&_svg]:size-4" />
              <span className="min-w-0 flex-1">
                <span className="block">This looks like a job for <span className="font-medium">{match.name}</span></span>
                <AgentMeta sa={match} className="mt-0.5" />
              </span>
              <button
                onClick={() => { const v = value; select(match); setValue(v) }}
                className="cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                Use {match.name}
              </button>
              <button
                disabled={blockers(match).length > 0}
                title={blockers(match).length > 0 ? `Connect ${blockers(match).map((t) => t.name).join(", ")} first` : undefined}
                onClick={() => launch(value.trim(), match)}
                className="flex cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground"
              >
                Run now <ArrowRight className="size-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Templates have their own page now (Tasks); Home is just the chat, with a way there */}
        <button
          onClick={() => navigate("explorer")}
          className="rise-in flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          style={{ "--delay": "160ms" } as React.CSSProperties}
        >
          Looking for a ready-made workflow? <span className="font-medium text-foreground">Browse agent templates</span> <ArrowRight className="size-3.5" />
        </button>
      </div>

      {profile && <SuperAgentPanel key={profile.id} sa={profile} onClose={clear} onStartChat={startChat} onClone={clone} onResize={setPanelWidth} onResizing={setResizing} />}
    </div>
  )
}
