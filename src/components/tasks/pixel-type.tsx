import { useEffect, useLayoutEffect, useRef, useState } from "react"

/*
 * Text that types itself in with a pixel edge, after the "Pixelate" reference clip: only the characters being typed
 * are pixelated — each one is born as a few chunky blocks, becomes a coarse mosaic of its own glyph that flickers
 * (blocks dropping out, some half see-through, a new pattern every frame), then snaps to the crisp character in one
 * frame. Everything already typed stays crisp. Stepped, not smooth: ~30 frames a second, no fades.
 *
 * Paced like an agent writing code, not a person typing: one character every 30ms with a short think after
 * punctuation (a beat after ",", a longer one after "." / ":" / "?"), each character pixelated for 4 steps, so a
 * small shimmering band runs along the text (~4–5s for a 115-character prompt). A solid block cursor rides the edge
 * and blinks three times at the end once it's done, then goes. The full text is laid out from the start (untyped characters invisible),
 * so nothing reflows or wraps differently. Plays when it mounts or the text changes; just shows the text (no cursor)
 * for reduced motion.
 */
const FRAME = 30 // ms per step; the edge reaches one character per step
const PIXEL_FRAMES = 4 // steps a character stays pixelated
const PAUSE: Record<string, number> = { ",": 5, ".": 10, ":": 10, "?": 10, "!": 10 } // extra steps after these
const BLOCK = 2 // px, the mosaic's block size

export function PixelType({ text, className }: { text: string; className?: string }) {
  const chars = [...text]
  // the step each character is reached at, with the thinking beats after punctuation
  const starts: number[] = []
  let t = 0
  for (const c of chars) { starts.push(t); t += 1 + (PAUSE[c] ?? 0) }
  const typed = t // step after the last character is reached
  const still = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const [step, setStep] = useState(still ? Infinity : 0)
  useEffect(() => {
    if (still) return
    setStep(0)
    let n = 0
    const end = typed + PIXEL_FRAMES + 1
    const id = window.setInterval(() => { n += 1; setStep(n); if (n >= end) window.clearInterval(id) }, FRAME)
    return () => window.clearInterval(id)
  }, [text, typed, still])
  const done = step >= typed + PIXEL_FRAMES
  return (
    <p className={className} aria-label={text}>
      {chars.map((c, i) => {
        const age = step - starts[i] // steps since this character was reached
        const atEdge = !done && step >= starts[i] && (i === chars.length - 1 || step < starts[i + 1])
        const cursor = atEdge ? <Cursor key={`c${i}`} /> : null
        if (age < 0) return <span key={i} aria-hidden className="invisible">{c}</span>
        if (age > PIXEL_FRAMES || c === " ") return [<span key={i} aria-hidden>{c}</span>, cursor]
        return [<PixelChar key={i} char={c} stage={age} seed={i * 31 + step * 7} />, cursor]
      })}
      {!still && done && <Cursor blink />}
    </p>
  )
}

// The block cursor: a solid bar one character wide-ish, in the text colour, sitting on the line (no layout space);
// steady while typing; once the text is complete it blinks three times (steps, not a fade) and is gone
function Cursor({ blink }: { blink?: boolean }) {
  return <span aria-hidden className={`relative inline-block h-[0.95em] w-0 align-[-0.12em] after:absolute after:inset-y-0 after:left-px after:w-[0.5em] after:bg-current after:opacity-70 ${blink ? "after:animate-[pixel-cursor_1s_steps(1)_3_forwards]" : ""}`} />
}

// One character mid-typing: its own glyph drawn at block resolution (from the live font and colour), with dropout.
// Stage 1: a few fragments; 2–3: the mosaic, flickering. The glyph keeps its place (transparent) under the canvas.
function PixelChar({ char, stage, seed }: { char: string; stage: number; seed: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  useLayoutEffect(() => {
    const host = ref.current, cv = canvas.current
    if (!host || !cv) return
    const r = host.getBoundingClientRect()
    const s = getComputedStyle(host)
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height))
    const cols = Math.ceil(w / BLOCK), rows = Math.ceil(h / BLOCK)
    // the glyph at full size, then sampled per block
    const src = document.createElement("canvas"); src.width = w; src.height = h
    const g = src.getContext("2d", { willReadFrequently: true })!
    g.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`; g.textBaseline = "middle"; g.fillStyle = "#000"
    g.fillText(char, 0, h / 2)
    const data = g.getImageData(0, 0, w, h).data
    cv.width = cols; cv.height = rows; cv.style.width = `${cols * BLOCK}px`; cv.style.height = `${rows * BLOCK}px`
    const o = cv.getContext("2d")!
    o.clearRect(0, 0, cols, rows)
    let rnd = seed || 1
    const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647)
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      let a = 0, n = 0
      for (let py = y * BLOCK; py < Math.min(h, (y + 1) * BLOCK); py++) for (let px = x * BLOCK; px < Math.min(w, (x + 1) * BLOCK); px++) { a += data[(py * w + px) * 4 + 3]; n++ }
      if (a / n < 40) continue // block mostly empty
      const r2 = rand()
      if (stage <= 1 ? r2 < 0.55 : r2 < 0.1) continue // fragments first, then the mosaic with a few gaps
      o.globalAlpha = rand() < 0.22 ? 0.45 : 1
      o.fillStyle = s.color
      o.fillRect(x, y, 1, 1)
    }
  }, [char, stage, seed])
  return (
    <span ref={ref} aria-hidden className="relative">
      <span className="text-transparent">{char}</span>
      <canvas ref={canvas} className="pointer-events-none absolute top-0 left-0 [image-rendering:pixelated]" />
    </span>
  )
}
