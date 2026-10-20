import type { LucideIcon } from "lucide-react"

/*
 * An agent's icon tile: its colour as a quiet accent: the icon in a slightly greyed version of it, on a near-white
 * wash with a light stroke of the same hue (all mixed from the one colour, so the 21 stay a family).
 * Used on the Agents Library cards and in the agent drawers, so both read the same.
 * The colours grow from a warm, muted four (sage, slate blue, ochre, brick) into a family of 21.
 */
export const flatColors = [
  "#3e6f8e", "#4f8a5f", "#cf9f45", "#b85a55", // slate blue (Triage Hunter), sage, ochre, brick (the reference)
  "#6a7f4a", "#2f7a78", "#c47a4a", "#8a6aa0", // olive, teal, terracotta, dusty violet
  "#5a6f9e", "#a3835a", "#9a4f6a", "#6e9a8a", // denim, camel, mulberry, eucalyptus
  "#d08a5e", "#4a5d7a", "#8f9a4f", "#b86a7a", // apricot, navy slate, moss, rose
  "#5f8fae", "#a35d3e", "#7a8f6a", "#c2a35e", // steel, rust, lichen, soft mustard
  "#6a5a8a", // plum
]

// ponytail: agents without a library card (opened from "Part of", My Agents) get a colour from their name
export const colorFor = (name: string) => {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return flatColors[h % flatColors.length]
}

export function ColorTile({ color, icon: Icon }: { color: string; icon: LucideIcon }) {
  return (
    <span
      aria-hidden
      className="grid size-10 shrink-0 place-items-center rounded-[0.375rem] border"
      style={{
        background: `color-mix(in oklch, ${color} 7%, white)`,
        borderColor: `color-mix(in oklch, ${color} 22%, white)`,
        color: `color-mix(in oklch, ${color} 82%, #9a9893)`,
      }}
    >
      <Icon className="size-[1.125rem]" strokeWidth={1.75} />
    </span>
  )
}
