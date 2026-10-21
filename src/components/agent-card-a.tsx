/*
 * Card idea A (Figma "Agent Visualizations": the round pixel-mark cards, e.g. node 64:16072). White, a 1px #F0F0F0
 * edge, 4px corners, 16px padding, gap 12:
 *   Top:  the agent's mark — a 50px circle in its colour with a 1.5px darker edge and a 2px #EFEFF0 shadow under it,
 *         a white pixel shape in the middle — then the name (Geist Medium 16/16, #121212), its context logos on the
 *         right (14px logos in 20px white circles, #F7F7F8 edge, soft shadow, overlapping by 4px), and under the name
 *         the categories (#F7F7F8 tags, 20 high, 4px sides, 2px corners, Geist 12/16 #68696C, 6 apart)
 *   Then: the description (Geist 14/16, #6C6A68), always two lines tall
 * In the demo, a little roomier than the design: 20px padding, a 60px mark, the description (14/20) 16px under the top.
 * No footer. Every agent gets its own colour and mark (in library order, agents then sub agents): the first six as in
 * the design, the rest new colours in the same bright, saturated tone, and new pixel shapes in the same spirit
 * (white squares on a small grid, roughly round, abstract).
 */
import { Hint } from "@/components/ui/hint"

// Colours: [fill, edge]. The first six from the design; the rest added in the same tone (edge ≈ 70% of the fill)
export const ideaAColors: [string, string][] = [
  ["#0177D7", "#015599"], // blue (Triage Hunter)
  ["#97B910", "#6E870C"], // lime
  ["#FA582D", "#AD3D1F"], // red orange
  ["#C91977", "#85104F"], // magenta
  ["#7F5ACF", "#5A3F93"], // violet
  ["#FDA82C", "#B1761F"], // amber
  ["#0FA39B", "#0A726C"], // teal
  ["#E6457A", "#A13055"], // rose
  ["#3D5CE0", "#2B419D"], // cobalt
  ["#1F9E55", "#16703C"], // green
  ["#F27A1A", "#A95512"], // tangerine
  ["#13A8D6", "#0D7696"], // sky
  ["#A33FC2", "#722C88"], // plum
  ["#D8B000", "#977B00"], // gold
  ["#D8343F", "#97242C"], // crimson
  ["#5FB53A", "#437F29"], // grass
  ["#0E7FB8", "#0A5981"], // ocean
  ["#D946B5", "#98317F"], // orchid
  ["#B85A1E", "#813F15"], // copper
  ["#4E5FD1", "#374392"], // indigo
  ["#11B39A", "#0C7D6C"], // mint
]

// Marks: every shape on the same 7 × 7 grid ("#" = a square), drawn in a 30px box, so the squares inside are the
// same size for every agent and the shapes line up. The first three are the design's (Figma SVGs, read onto the grid),
// then new ones in the same spirit.
const GRID = 7
const gridMarks: string[][] = [
  // dotted ring (design)
  ["...#...", ".#...#.", "#.....#", ".#...#.", "#.....#", ".#...#.", "...#..."],
  // diamond ring (design)
  ["..###..", ".#...#.", "#.....#", "#..#..#", "#.....#", ".#...#.", "..###.."],
  // burst (design)
  ["...#...", ".#...#.", "..#.#..", "#..#..#", "..#.#..", ".#...#.", "...#..."],
  // nested diamond (in place of the design's open square)
  ["...#...", "..#.#..", ".#.#.#.", "#.#.#.#", ".#.#.#.", "..#.#..", "...#..."],
  // ring of eight
  ["..#.#..", ".......", "#.....#", "...#...", "#.....#", ".......", "..#.#.."],
  // crossed circle
  ["..###..", ".#...#.", "#..#..#", "#.###.#", "#..#..#", ".#...#.", "..###.."],
  // orbit
  ["...#...", ".#...#.", ".......", "#..#..#", ".......", ".#...#.", "...#..."],
  // eye
  [".......", "..###..", ".#...#.", "#..#..#", ".#...#.", "..###..", "......."],
  // checker ring
  ["..#.#..", ".#.#.#.", "#.....#", ".#...#.", "#.....#", ".#.#.#.", "..#.#.."],
  // split ring
  [".##.##.", "#.....#", "#.....#", "...#...", "#.....#", "#.....#", ".##.##."],
  // petals
  [".#...#.", "##...##", ".......", "...#...", ".......", "##...##", ".#...#."],
  // crescent
  ["..###..", ".#.....", "#......", "#......", "#......", ".#.....", "..###.."],
  // target
  [".#####.", "#.....#", "#.###.#", "#.#.#.#", "#.###.#", "#.....#", ".#####."],
]
// Which mark each agent gets: the first six from the design (burst for Triage Hunter and dotted ring for Code CVE —
// swapped from the design — then diamond ring, nested diamond, diamond ring, dotted ring), then the new ones in turn, then round again
const markCount = gridMarks.length
const designOrder = [2, 0, 1, 3, 1, 0]
const markFor = (i: number) => i < designOrder.length ? designOrder[i] : (4 + (i - designOrder.length)) % markCount

// fill: take the size of its box (the square marks set it on the pixel grid); otherwise 30px
function GridMark({ rows, color = "#fff", fill }: { rows: string[]; color?: string; fill?: boolean }) {
  const n = GRID
  const cell = 30 / n
  return (
    <svg aria-hidden viewBox="0 0 30 30" shapeRendering="crispEdges" className={fill ? "block size-full" : "size-[1.875rem] shrink-0"}>
      {rows.flatMap((r, y) => [...r].map((c, x) => c === "#" && (
        <rect key={`${x}-${y}`} x={(x + (n - r.length) / 2) * cell} y={(y + (n - rows.length) / 2) * cell} width={cell} height={cell} fill={color} />
      )))}
    </svg>
  )
}

// The circle: colour, darker 1.5px edge, a 2px light shadow under it, the mark in the middle
export function IdeaAMark({ index, size = 50 }: { index: number; size?: number }) {
  const [fill, edge] = ideaAColors[index % ideaAColors.length]
  const m = markFor(index)
  const scale = size / 50
  return (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full border-[1.5px] border-solid drop-shadow-[0px_2px_0px_#efeff0]" style={{ width: `${size / 16}rem`, height: `${size / 16}rem`, background: fill, borderColor: edge }}>
      <span className="grid place-items-center" style={{ transform: scale === 1 ? undefined : `scale(${scale})` }}>
        <GridMark rows={gridMarks[m]} />
      </span>
    </span>
  )
}

// Idea B's mark (Figma node 64:16262): a 64px circle in the agent's colour with a 3px black edge, cut into dashes by a
// white dashed ring (Figma's own image, /agent-marks/ring-dashed.png, 60px), a 3px #EFEFF0 shadow under it, and the
// same pixel shape at 36px. Same colour and shape per agent as idea A. Drawn at 64 and scaled to `size` as a whole
// (52 on the card, a little smaller than the design so it sits in balance with the card; 48 in the side panel).
// The dashed ring is the tyre (.ideab-tyre): on the card's hover it rolls while the pixel shape stays put, see index.css.
export function IdeaBMark({ index, size = 64 }: { index: number; size?: number }) {
  const [fill] = ideaAColors[index % ideaAColors.length]
  const m = markFor(index)
  return (
    <span aria-hidden className="relative grid shrink-0 place-items-center" style={{ width: `${size / 16}rem`, height: `${size / 16}rem` }}>
    <span className="absolute top-1/2 left-1/2 grid place-items-center" style={{ transform: `translate(-50%, -50%) scale(${size / 64})` }}>
    <span className="ideab-wheel relative grid size-16 shrink-0 place-items-center rounded-full border-[3px] border-solid border-black drop-shadow-[0px_3px_0px_#efeff0]" style={{ background: fill }}>
      <span className="grid place-items-center" style={{ transform: "scale(1.17)" }}>
        <GridMark rows={gridMarks[m]} />
      </span>
      <img alt="" src="/agent-marks/ring-dashed.png" width={60} height={60} className="ideab-tyre absolute top-1/2 left-1/2 block size-[3.75rem] max-w-none" style={{ transform: "translate(-50%, -50%)" }} />
    </span>
    </span>
    </span>
  )
}

// Sizes are given in px at the 16px base and drawn in rem, so the marks grow with the text on big screens.
// The square mark (side panel, Figma node 68:17737; idea A cards): tinted, not filled — a very light wash of the
// agent's colour (10%) with a hairline in it (22%), flat (no shadow), and the pixel shape in the colour's deep tone
// (the shapes are the hero, the colour only a quiet cue). 42px with 4px corners in the panel; `size` scales it for
// the cards (60px, 6px corners), the shape keeping the same share of the square.
// The pixels sit on whole pixels: the cell is a whole number of px (about 60% of the inside), the square is nudged
// up 1px if needed so the space around the shape is even, and the shape is placed at a whole-pixel offset — crisp,
// no half-pixel blur, every block the same size.
export function IdeaASquareMark({ index, size = 42 }: { index: number; size?: number }) {
  const [fill, edge] = ideaAColors[index % ideaAColors.length]
  const m = markFor(index)
  const cell = Math.max(2, Math.round(((size - 2) * 0.6) / GRID))
  const shape = cell * GRID
  const box = (size - 2 - shape) % 2 === 0 ? size : size + 1
  const offset = (box - 2 - shape) / 2
  const rem = (px: number) => `${px / 16}rem`
  return (
    <span aria-hidden className="relative block shrink-0 overflow-hidden border border-solid" style={{ width: rem(box), height: rem(box), borderRadius: box > 46 ? 6 : 4, background: `color-mix(in oklch, ${fill} 10%, white)`, borderColor: `color-mix(in oklch, ${fill} 22%, white)` }}>
      <span className="absolute block" style={{ left: rem(offset), top: rem(offset), width: rem(shape), height: rem(shape) }}>
        <GridMark rows={gridMarks[m]} color={edge} fill />
      </span>
    </span>
  )
}

// A context logo in its little white circle (overlapping the next by 4px)
export function IdeaALogoChip({ name, children, last, edge = "#f7f7f8" }: { name: string; children: React.ReactNode; last?: boolean; edge?: string }) {
  return (
    <Hint label={name}>
      <span aria-label={name} style={{ borderColor: edge }} className={`relative grid size-5 shrink-0 place-items-center rounded-[26px] border border-solid bg-white ${edge === "#f7f7f8" ? "drop-shadow-[0px_1px_0.5px_rgba(56,61,69,0.07)]" : "drop-shadow-[0px_1px_0.5px_rgba(56,61,69,0.08)]"} ${last ? "" : "-mr-1"}`}>
        <span className="relative size-3.5 shrink-0 overflow-hidden">{children}</span>
      </span>
    </Hint>
  )
}

// The three logos from the design (Figma SVGs in /public/logos), placed in the 14px box as in Figma
export const figmaLogos = {
  defender: <span className="absolute inset-[6.25%_9.37%_6.25%_9.38%] -scale-y-100"><img alt="" src="/logos/defender.svg" className="absolute inset-0 block size-full max-w-none" /></span>,
  okta: <img alt="" src="/logos/okta.svg" className="absolute inset-0 block size-full max-w-none" />,
  paloalto: <span className="absolute inset-[21.91%_9.38%_18.75%_9.26%]"><img alt="" src="/logos/paloalto.svg" className="absolute inset-0 block size-full max-w-none" /></span>,
}

// The tag under the name
export function IdeaATag({ children }: { children: React.ReactNode }) {
  return <span className="flex h-5 shrink-0 items-center rounded-[2px] bg-[#f7f7f8] px-1 text-small leading-4 font-normal whitespace-nowrap text-fg-secondary">{children}</span>
}
