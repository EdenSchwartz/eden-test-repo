import { useEffect, useLayoutEffect, useRef, useState } from "react"

/*
 * Text that types itself in with a pixel edge, after the "Pixelate" reference clip: only the characters being typed
 * are pixelated — each one is born as a few chunky blocks, becomes a coarse mosaic of its own glyph that flickers
 * (blocks dropping out, some half see-through, a new pattern every frame), then snaps to the crisp character in one
 * frame. Everything already typed stays crisp. Stepped, not smooth: ~30 frames a second, no fades.
 *
 * A long prompt can't take a tenth of a second per character, so the typing edge moves 2 characters a frame and
 * each character stays pixelated for 3 frames: a short shimmering band runs along the text (~2s for 115 characters).
 * The full text is laid out from the start (untyped characters invisible), so nothing reflows or wraps differently.
 * Plays once when it mounts or the text changes; shows the text straight away for reduced motion.
 */
const FRAME = 33 // ms per step
const PER_FRAME = 2 // characters the edge advances each step
const PIXEL_FRAMES = 3 // steps a character stays pixelated
const BLOCK = 2 // px, the mosaic's block size

export function PixelType({ text, className }: { text: string; className?: string }) {
  const chars = [...text]
  const total = chars.length
  const still = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const [step, setStep] = useState(still ? Infinity : 0)
  useEffect(() => {
    if (still) return
    setStep(0)
    let n = 0
    const end = Math.ceil(total / PER_FRAME) + PIXEL_FRAMES + 1
    const id = window.setInterval(() => { n += 1; setStep(n); if (n >= end) window.clearInterval(id) }, FRAME)
    return () => window.clearInterval(id)
  }, [text, total, still])
  const edge = step * PER_FRAME // characters reached so far
  return (
    <p className={className} aria-label={text}>
      {chars.map((c, i) => {
        const age = step - Math.floor(i / PER_FRAME) // steps since this character was reached
        if (i >= edge) return <span key={i} aria-hidden className="invisible">{c}</span>
        if (age > PIXEL_FRAMES || c === " ") return <span key={i} aria-hidden>{c}</span>
        return <PixelChar key={i} char={c} stage={age} seed={i * 31 + step * 7} />
      })}
    </p>
  )
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
