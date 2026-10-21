import type { LucideIcon } from "lucide-react"
import { agents, type AgentKind } from "@/components/chat/agents"
import { colorFor } from "@/components/tasks/color-tile"
import type { Outcome } from "@/data/outcomes"
import { cn } from "@/lib/utils"

/*
 * The agent side panel, after the Figma design "Agent side panel — Triage Hunter (idea A)" (page "20.10 - Side Panel",
 * node 68:17716). Labels Geist Medium 12/16 #7C7C7C; values #101112; tags and chips on #FAFAFA with 2px corners.
 * Icons are the design's own (SVGs in /public/panel), drawn inline where they change colour with their state.
 */

const svgProps = { viewBox: "0 0 16 16", fill: "none", "aria-hidden": true } as const
// Tab icons (Figma "text-select, lollipops" and "apple-intelligence"), in the tab's text colour
export const OverviewIcon = (({ className }: { className?: string }) => (
  <svg {...svgProps} className={className}><path d="M3 5.33333L3.0001 11.6667C3.00011 12.0349 3.29858 12.3333 3.66677 12.3333H9M13 10.6667V4.33333C13 3.96514 12.7015 3.66667 12.3333 3.66667H7M6.33333 7H9.66667M6.33333 9H8.33333M4.66667 3.5C4.66667 4.42047 3.92047 5.16667 3 5.16667C2.07953 5.16667 1.33333 4.42047 1.33333 3.5C1.33333 2.57953 2.07953 1.83333 3 1.83333C3.92047 1.83333 4.66667 2.57953 4.66667 3.5ZM14.6667 12.5C14.6667 13.4205 13.9205 14.1667 13 14.1667C12.0795 14.1667 11.3333 13.4205 11.3333 12.5C11.3333 11.5795 12.0795 10.8333 13 10.8333C13.9205 10.8333 14.6667 11.5795 14.6667 12.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" /></svg>
)) as unknown as LucideIcon
export const SkillsIcon = (({ className }: { className?: string }) => (
  <svg {...svgProps} className={className}><path fillRule="evenodd" clipRule="evenodd" fill="currentColor" d="M6.45269 2.19437C7.16447 1.04632 8.83579 1.04632 9.54757 2.19437L10.0872 3.06471C10.1641 3.18887 10.2423 3.31226 10.3215 3.43489C10.467 3.42034 10.6123 3.40441 10.7575 3.38712L11.7751 3.26595C13.1165 3.10622 14.1597 4.41149 13.7047 5.68425L13.3601 6.64837C13.311 6.78576 13.2631 6.92357 13.2167 7.06179C13.3186 7.16618 13.4215 7.26965 13.5255 7.37217L14.2547 8.09142C15.2171 9.04059 14.8445 10.6693 13.566 11.107L12.5966 11.4389C12.4584 11.4863 12.3206 11.5349 12.1833 11.5848C12.1652 11.7295 12.1484 11.8745 12.133 12.0196L12.0248 13.0376C11.882 14.3813 10.3757 15.1051 9.23639 14.3797L8.37224 13.8294C8.2489 13.7509 8.12486 13.6735 8.00013 13.5974C7.8754 13.6735 7.75136 13.7509 7.62802 13.8294L6.76387 14.3797C5.6246 15.1051 4.11826 14.3813 3.97547 13.0376L3.86729 12.0196C3.85187 11.8745 3.83508 11.7295 3.81694 11.5848C3.67966 11.5349 3.54188 11.4863 3.40361 11.4389L2.43422 11.107C1.15574 10.6693 0.783164 9.04059 1.74553 8.09142L2.47477 7.37217C2.57872 7.26965 2.68167 7.16618 2.78361 7.06179C2.73711 6.92357 2.6893 6.78576 2.64019 6.64837L2.29553 5.68425C1.84053 4.41148 2.88378 3.10622 4.22518 3.26596L5.24272 3.38712C5.38794 3.40441 5.53328 3.42034 5.67873 3.43489C5.75799 3.31226 5.83611 3.18887 5.91309 3.06471L6.45269 2.19437ZM5.07605 4.3218L4.11311 4.20714C3.46905 4.13044 2.97052 4.7567 3.18804 5.36519L3.5144 6.2781C4.06968 5.65444 4.59099 5.0014 5.07605 4.3218ZM3.85902 7.30735C4.69701 6.40736 5.46522 5.44495 6.15699 4.42845C7.38397 4.52191 8.61629 4.52191 9.84327 4.42845C10.535 5.44495 11.3032 6.40737 12.1412 7.30735C11.7771 8.48137 11.503 9.68137 11.3212 10.897C10.1752 11.3446 9.06496 11.8788 8.00013 12.4948C6.9353 11.8788 5.82508 11.3446 4.67909 10.897C4.49728 9.68137 4.22313 8.48137 3.85902 7.30735ZM3.10179 8.08503L2.41111 8.76625C1.95054 9.2205 2.12822 10.0004 2.74125 10.2103L3.65915 10.5246C3.51729 9.70199 3.33123 8.88763 3.10179 8.08503ZM4.81562 11.9741L4.918 12.9375C4.9863 13.5803 5.7079 13.9284 6.25478 13.5802L7.07218 13.0597C6.34003 12.6577 5.58675 12.2953 4.81562 11.9741ZM8.92807 13.0597L9.74547 13.5802C10.2924 13.9284 11.014 13.5803 11.0823 12.9375L11.1846 11.9741C10.4135 12.2953 9.66023 12.6577 8.92807 13.0597ZM12.3411 10.5246L13.259 10.2103C13.872 10.0004 14.0497 9.2205 13.5892 8.76625L12.8985 8.08503C12.669 8.88763 12.483 9.70199 12.3411 10.5246ZM12.4859 6.2781L12.8122 5.36519C13.0297 4.7567 12.5312 4.13044 11.8872 4.20714L10.9242 4.3218C11.4093 5.0014 11.9306 5.65445 12.4859 6.2781ZM9.25241 3.51707C8.41816 3.56193 7.5821 3.56193 6.74785 3.51707L7.25826 2.69381C7.59938 2.14362 8.40088 2.14362 8.742 2.69381L9.25241 3.51707Z" /></svg>
)) as unknown as LucideIcon
// The top bar's chevrons (Figma "chevron-down-medium" / "chevron-top"): #525252, #BDBDBD when there's nowhere to go
export const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 12 12" fill="none" aria-hidden className={className}><path d="M1.66667 4.33333L6 8.66667L10.3333 4.33333" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
export const ChevronUpIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 12 12" fill="none" aria-hidden className={className}><path d="M2 7.50005L5.64644 3.8536C5.8417 3.65834 6.15828 3.65834 6.35354 3.8536L10 7.50005" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" /></svg>
)

// A property in the header row: label (12 medium #7C7C7C), 8px, its value
export const PanelProp = ({ label, title, children }: { label: string; title?: string; children: React.ReactNode }) => (
  <div className="flex min-w-0 shrink-0 flex-col items-start gap-2">
    <dt className="text-[0.75rem] leading-4 font-medium whitespace-nowrap text-[#7c7c7c]">{label}</dt>
    <dd className="flex min-h-5 items-center whitespace-nowrap" title={title}>{children}</dd>
  </div>
)

// Created by Rival: the mark (12 × 13) and the name, 8 apart
export const PanelRival = () => (
  <span className="flex h-5 items-center gap-2 text-[0.875rem] leading-5 text-[#101112]"><img alt="" src="/panel/rival-mark.svg" width={12} height={13} className="block" />Rival</span>
)

// A tag (category): #FAFAFA, 20 high, 4px sides, 2px corners, Geist 12/16 #424345; 6 apart
export const PanelTag = ({ children }: { children: React.ReactNode }) => (
  <span className="flex h-5 shrink-0 items-center rounded-[2px] bg-[#fafafa] px-1 text-[0.75rem] leading-4 whitespace-nowrap text-[#424345]">{children}</span>
)
export const PanelTags = ({ items }: { items: string[] }) => <span className="flex items-start gap-1.5">{items.map((c) => <PanelTag key={c}>{c}</PanelTag>)}</span>

// A section: its title as a small grey label (12 medium #7C7C7C), then the content (8px under; 12 for the prompt and steps)
export function PanelSection({ title, gap = "sm", grow, children }: { title: string; gap?: "sm" | "md"; grow?: boolean; children: React.ReactNode }) {
  return (
    <section className={cn("flex w-full flex-col items-start", gap === "sm" ? "gap-2" : "gap-3", grow && "min-h-0 flex-1")}>
      <h3 className="text-[0.75rem] leading-4 font-medium whitespace-nowrap text-[#7c7c7c]">{title}</h3>
      {children}
    </section>
  )
}

// Outcomes: #FAFAFA chips (20 high, 6px sides) with a 2 × 10 bar in the outcome's colour, then the name in title case
const toneBar: Record<Outcome["tone"], string> = { good: "#4fa90b", clear: "#0170fd", warn: "#fda501", risk: "#db0509", failed: "#db0509", unclear: "#a3a3a3" }
const small = new Set(["a", "an", "and", "as", "at", "by", "for", "in", "of", "on", "or", "the", "to"])
const titleCase = (s: string) => s.split(" ").map((w, i) => (i > 0 && small.has(w.toLowerCase()) ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1))).join(" ")
export function PanelOutcomes({ items }: { items: Outcome[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-1.5">
      {items.map((o) => (
        <li key={o.label} className="flex h-5 items-center gap-1.5 rounded-[2px] bg-[#fafafa] px-1.5 text-[0.75rem] leading-4 whitespace-nowrap text-[#424345]">
          <span aria-hidden className="h-2.5 w-0.5 shrink-0" style={{ background: toneBar[o.tone] }} />
          {titleCase(o.label)}
        </li>
      ))}
    </ul>
  )
}

// The prompt: #FAFAFA box, #ECECEC edge, 6px corners, 12px padding, Geist Mono 12/18 #7C7C7C
export const PanelPrompt = ({ text }: { text: string }) => (
  <div className="w-full rounded-[6px] border border-solid border-[#ececec] bg-[#fafafa] p-3">
    <p className="font-mono text-[0.75rem] leading-[1.125rem] text-[#7c7c7c]">{text}</p>
  </div>
)

// How it works: each step a small pill (white 80%, #E5E3E3 edge, 6px corners, 24 high, soft shadow) with its icon on a
// tinted 20px square and the name (Geist Medium 14), then what it does under it (14/16 #525252, 28px in). A faint rail
// (#E5E3E3 at 70%) runs down through the icons. Steps that run together are joined by a blue line with a "Parallel" pill
// on it, and sit further apart (68px instead of 20).
const stepLook: Partial<Record<AgentKind, { src: string; bg: string }>> = {
  correlation: { src: "/panel/step-correlation.svg", bg: "rgba(239,176,118,0.2)" },
  exploitability: { src: "/panel/step-exploitability.svg", bg: "#fcf8e3" },
  "threat-intel": { src: "/panel/step-threat-intel.svg", bg: "#faeef4" },
  prioritization: { src: "/panel/step-prioritization.svg", bg: "#ebf4f6" },
  ownership: { src: "/panel/step-ownership.svg", bg: "#eeebf6" },
  reporting: { src: "/panel/step-reporting.svg", bg: "#edf4e5" },
}
function StepIcon({ kind }: { kind: AgentKind }) {
  const look = stepLook[kind]
  const color = colorFor(`sub:${kind}`)
  const Icon = agents[kind].icon
  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-[4px]" style={{ background: look?.bg ?? `color-mix(in oklch, ${color} 14%, white)` }}>
      {look ? <img alt="" src={look.src} width={14} height={14} className="block" /> : <Icon className="size-3.5" style={{ color }} strokeWidth={2} />}
    </span>
  )
}
export function PanelSteps({ pattern }: { pattern: AgentKind[][] }) {
  const items = pattern.flatMap((group) => group.map((kind, i) => ({ kind, withPrev: i > 0 })))
  return (
    <ol className="relative flex flex-col items-start">
      <span aria-hidden className="absolute top-[25px] bottom-10 left-3 w-px bg-[#e5e3e3]/70" />
      {items.map(({ kind, withPrev }, i) => {
        const next = items[i + 1]
        return (
          <li key={kind} className={cn("relative flex flex-col items-start gap-2", i > 0 && (withPrev ? "mt-[68px]" : "mt-5"))}>
            <span className="relative flex h-6 items-center gap-1.5 rounded-[6px] border border-solid border-[#e5e3e3] bg-white/80 pr-2 pl-0.5 shadow-[0px_1px_1px_0px_rgba(56,61,69,0.08)]">
              <StepIcon kind={kind} />
              <span className="text-[0.875rem] leading-5 font-medium whitespace-nowrap text-[#101112]">{agents[kind].name.replace(/ agent$/, "")}</span>
            </span>
            <span className="pr-8 pl-7 text-[0.875rem] leading-4 whitespace-nowrap text-[#525252]">{agents[kind].short}</span>
            {next?.withPrev && (
              <>
                <span aria-hidden className="absolute top-6 left-3 h-[92px] w-px bg-[#0350d0]" />
                <span className="absolute top-[72px] left-0 flex h-4 items-center rounded-full border border-solid border-[#c6dbff] bg-[#ecf3ff] px-1.5 text-[0.625rem] whitespace-nowrap text-[#0350d0]">Parallel</span>
              </>
            )}
          </li>
        )
      })}
    </ol>
  )
}

// Use Agent: #0350D0 with a #023FA3 edge, 4px corners, 10px top and bottom, Geist Medium 12 white, then ⌘⏎
export const PanelUseButton = ({ onClick, wide }: { onClick: () => void; wide?: boolean }) => (
  <button onClick={onClick} className={cn("flex cursor-pointer items-center justify-center gap-1.5 rounded-[4px] border border-solid border-[#023fa3] bg-[#0350d0] py-2.5 pr-2 pl-1.5 text-[0.75rem] leading-4 font-medium text-white drop-shadow-[0px_1px_0.5px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#0a47b8]", wide ? "px-4" : "w-full")}>
    Use Agent
    <kbd className="rounded-[4px] bg-white/15 px-[5px] py-px font-sans text-[0.75rem] leading-4 font-medium text-white/85">⌘⏎</kbd>
  </button>
)
