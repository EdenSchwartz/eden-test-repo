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

// Marks: the four from the design (Figma SVGs in /public/agent-marks, at their own size), then new ones drawn on a
// grid ("#" = a white square), each fitted into a 30px box
const figmaMarks = [
  { src: "/agent-marks/mark-1.svg", w: 30.755, h: 32.001 }, // dotted ring
  { src: "/agent-marks/mark-2.svg", w: 30.179, h: 30 }, // diamond ring
  { src: "/agent-marks/mark-3.svg", w: 30, h: 30.165 }, // burst
  { src: "/agent-marks/mark-4.svg", w: 28.751, h: 28.934 }, // open square
]
const gridMarks: string[][] = [
  // ring of eight
  ["..#.#..", ".......", "#.....#", "...#...", "#.....#", ".......", "..#.#.."],
  // crossed circle
  ["..###..", ".#...#.", "#..#..#", "#.###.#", "#..#..#", ".#...#.", "..###.."],
  // orbit
  ["...#...", ".#...#.", ".......", "#..#..#", ".......", ".#...#.", "...#..."],
  // eye
  ["..###..", ".#...#.", "#..#..#", ".#...#.", "..###.."],
  // checker ring
  ["..#.#..", ".#.#.#.", "#.....#", ".#...#.", "#.....#", ".#.#.#.", "..#.#.."],
  // core
  [".####.", "#....#", "#.##.#", "#.##.#", "#....#", ".####."],
  // petals
  [".#...#.", "##...##", ".......", "...#...", ".......", "##...##", ".#...#."],
  // crescent
  ["..###.", ".#....", "#.....", "#.....", ".#....", "..###."],
  // target
  [".#####.", "#.....#", "#.###.#", "#.#.#.#", "#.###.#", "#.....#", ".#####."],
]
// Which mark each agent gets: the first six as in the design (dotted ring, burst, diamond ring, open square, diamond
// ring, dotted ring), then the new grid marks in turn, then the design's again
const markCount = figmaMarks.length + gridMarks.length
const designOrder = [0, 2, 1, 3, 1, 0]
const markFor = (i: number) => i < designOrder.length ? designOrder[i] : (figmaMarks.length + (i - designOrder.length)) % markCount

function GridMark({ rows }: { rows: string[] }) {
  const n = Math.max(rows.length, ...rows.map((r) => r.length))
  const cell = 30 / n
  return (
    <svg aria-hidden width="30" height="30" viewBox="0 0 30 30" className="shrink-0">
      {rows.flatMap((r, y) => [...r].map((c, x) => c === "#" && (
        <rect key={`${x}-${y}`} x={(x + (n - r.length) / 2) * cell} y={(y + (n - rows.length) / 2) * cell} width={cell} height={cell} fill="#fff" />
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
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full border-[1.5px] border-solid drop-shadow-[0px_2px_0px_#efeff0]" style={{ width: size, height: size, background: fill, borderColor: edge }}>
      <span className="grid place-items-center" style={{ transform: scale === 1 ? undefined : `scale(${scale})` }}>
        {m < figmaMarks.length
          ? <img alt="" src={figmaMarks[m].src} width={figmaMarks[m].w} height={figmaMarks[m].h} className="block max-w-none" />
          : <GridMark rows={gridMarks[m - figmaMarks.length]} />}
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
    <span aria-hidden className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
    <span className="absolute top-1/2 left-1/2 grid place-items-center" style={{ transform: `translate(-50%, -50%) scale(${size / 64})` }}>
    <span className="ideab-wheel relative grid size-16 shrink-0 place-items-center rounded-full border-[3px] border-solid border-black drop-shadow-[0px_3px_0px_#efeff0]" style={{ background: fill }}>
      <span className="grid place-items-center" style={{ transform: "scale(1.17)" }}>
        {m < figmaMarks.length
          ? <img alt="" src={figmaMarks[m].src} width={figmaMarks[m].w} height={figmaMarks[m].h} className="block max-w-none" />
          : <GridMark rows={gridMarks[m - figmaMarks.length]} />}
      </span>
      <img alt="" src="/agent-marks/ring-dashed.png" width={60} height={60} className="ideab-tyre absolute top-1/2 left-1/2 block size-[60px] max-w-none" style={{ transform: "translate(-50%, -50%)" }} />
    </span>
    </span>
    </span>
  )
}

// The side panel's mark (Figma "20.10 - Side Panel", node 68:17737): a 42px rounded square (4px corners) in the
// agent's colour, a 1.5px darker edge, a 2px #EFEFF0 shadow under it, the pixel shape at 24px
export function IdeaASquareMark({ index }: { index: number }) {
  const [fill, edge] = ideaAColors[index % ideaAColors.length]
  const m = markFor(index)
  return (
    <span aria-hidden className="grid size-[2.625rem] shrink-0 place-items-center overflow-hidden rounded-[4px] border-[1.5px] border-solid shadow-[0px_2px_0px_0px_#efeff0]" style={{ background: fill, borderColor: edge }}>
      <span className="grid size-6 place-items-center">
        <span className="grid place-items-center" style={{ transform: "scale(0.8)" }}>
          {m < figmaMarks.length
            ? <img alt="" src={figmaMarks[m].src} width={figmaMarks[m].w} height={figmaMarks[m].h} className="block max-w-none" />
            : <GridMark rows={gridMarks[m - figmaMarks.length]} />}
        </span>
      </span>
    </span>
  )
}

// A context logo in its little white circle (overlapping the next by 4px)
export function IdeaALogoChip({ name, children, last, edge = "#f7f7f8" }: { name: string; children: React.ReactNode; last?: boolean; edge?: string }) {
  return (
    <span title={name} style={{ borderColor: edge }} className={`relative grid size-5 shrink-0 place-items-center rounded-[26px] border border-solid bg-white ${edge === "#f7f7f8" ? "drop-shadow-[0px_1px_0.5px_rgba(56,61,69,0.07)]" : "drop-shadow-[0px_1px_0.5px_rgba(56,61,69,0.08)]"} ${last ? "" : "-mr-1"}`}>
      <span className="relative size-3.5 shrink-0 overflow-hidden">{children}</span>
    </span>
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
  return <span className="flex h-5 shrink-0 items-center rounded-[2px] bg-[#f7f7f8] px-1 text-[0.75rem] leading-4 font-normal whitespace-nowrap text-[#68696c]">{children}</span>
}
