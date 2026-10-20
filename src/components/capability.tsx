import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/*
 * The agent capabilities, in this order: Memory · Context graph · Sandbox · Internet Access. The only four.
 * Each shows as its icon in a soft grey circle (the design: 20px #F7F7F8 circle, 1px white ring = 22px, 2px apart),
 * its name in a tooltip on hover. Icons: 16px, drawn on a 32 grid (half pixels), ~12px drawings, 1.2px #68696C
 * strokes, the closed shapes filled with the same grey at 10% (the globe's middle, filled twice, reads darker).
 */
export type Capability = "memory" | "graph" | "sandbox" | "internet"
export const capabilityNames: Record<Capability, string> = { memory: "Memory", graph: "Context graph", sandbox: "Sandbox", internet: "Internet Access" }
const order: Capability[] = ["memory", "graph", "sandbox", "internet"]

const fill = { fill: "currentColor", fillOpacity: 0.1 }
const art: Record<Capability, React.ReactNode> = {
  // a round brain: scalloped edge, a line down the middle, a branch either side
  memory: <>
    <path {...fill} d="M16 5.7h-4.2a3.4 3.4 0 0 0-3.5 3.6 3.3 3.3 0 0 0-2.6 5.9 3.4 3.4 0 0 0 1.5 6.4 3.4 3.4 0 0 0 4.6 3.7H20.2a3.4 3.4 0 0 0 4.6-3.7 3.4 3.4 0 0 0 1.5-6.4 3.3 3.3 0 0 0-2.6-5.9 3.4 3.4 0 0 0-3.5-3.6Z" />
    <path d="M16 5.7v19.6M16 11.2q0 3.4 4.8 3.4M10.6 17.6q4.6 0 5.4 3.2" />
  </>,
  // two squares (top right, bottom left) joined by a path that bends back and forth
  graph: <>
    <rect {...fill} x="19.2" y="6.2" width="6.6" height="6.6" rx="1.4" />
    <rect {...fill} x="6.2" y="19.2" width="6.6" height="6.6" rx="1.4" />
    <path d="M19.2 10H11.7a1.85 1.85 0 0 0-1 3.45l10.6 5.6a1.85 1.85 0 0 1-1 3.45H12.8" />
  </>,
  // a cube: hexagon edge, three faces meeting in the middle
  sandbox: <>
    <path {...fill} d="M15 4.9a2 2 0 0 1 2 0l8.2 4.6a2 2 0 0 1 1 1.75v9.5a2 2 0 0 1-1 1.75L17 27.1a2 2 0 0 1-2 0l-8.2-4.6a2 2 0 0 1-1-1.75v-9.5a2 2 0 0 1 1-1.75Z" />
    <path d="M6.3 10.4 16 16l9.7-5.6M16 16v11.3" />
  </>,
  // a globe: circle, the equator, one meridian (a lens, filled again)
  internet: <>
    <circle {...fill} cx="16" cy="16" r="10.8" />
    <ellipse {...fill} cx="16" cy="16" rx="4.8" ry="10.8" />
    <path d="M5.2 16h21.6" />
  </>,
}

export function CapabilityIcon({ cap, className = "size-4" }: { cap: Capability; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {art[cap]}
    </svg>
  )
}

export function CapabilityMark({ cap }: { cap: Capability }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span aria-label={capabilityNames[cap]} className="grid size-5 shrink-0 place-items-center rounded-full bg-[#f7f7f8] text-[#68696c] ring-1 ring-white">
          <CapabilityIcon cap={cap} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>{capabilityNames[cap]}</TooltipContent>
    </Tooltip>
  )
}

// An agent's capabilities, always in the fixed order, side by side (2px between the white rings)
export function CapabilityMarks({ caps }: { caps: Capability[] }) {
  return (
    <span className="flex items-center gap-1">
      {order.filter((c) => caps.includes(c)).map((c) => <CapabilityMark key={c} cap={c} />)}
    </span>
  )
}
