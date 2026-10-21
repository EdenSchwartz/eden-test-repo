import { useEffect, useRef } from "react"

/*
 * The header box's grid lit by a fluid. A small Navier-Stokes simulation (Jos Stam's "stable fluids":
 * add forces, diffuse, advect, project so it stays incompressible) runs on a grid twice as fine as the drawn one.
 * Moving the pointer pushes the fluid and pours in dye; the dye swirls, curls and fades. Nothing is painted
 * as an area: only the grid lines take the dye's color, so the flow shows through the lines alone.
 * The color is silver like chrome: tight dark-steel to bright-silver bands that shift with the dye, with
 * bluish silver-white highlights sweeping through and, where the flow is fast, short white glints (the shine) with a cool steel / faint champagne tint, and faster flow
 * catches the light. Darker than the resting grid so it reads on white, at most 80% strength.
 * Coming near the box from outside (within 18rem) pours a little dye in at the closest edge, as a hint.
 * Left alone, it pulses on its own now and then (every 8 to 13s, each from a shuffled place): one soft stroke drifts across and fades.
 * Runs only while there's dye to show; still (no fluid) if the user prefers reduced motion.
 */
export function FluidGrid() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current, box = canvas?.parentElement
    if (!canvas || !box) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const ctx = canvas.getContext("2d")!
    let w = 0, h = 0, cell = 20, res = 10, N = 0, M = 0
    let u: Float32Array, v: Float32Array, u0: Float32Array, v0: Float32Array, d: Float32Array, d0: Float32Array
    const IX = (i: number, j: number) => i + (N + 2) * j

    const size = () => {
      const dpr = window.devicePixelRatio || 1
      w = box.clientWidth; h = box.clientHeight
      cell = parseFloat(getComputedStyle(document.documentElement).fontSize) * 1.25
      res = cell / 2
      N = Math.ceil(w / res); M = Math.ceil(h / res)
      const n = (N + 2) * (M + 2)
      u = new Float32Array(n); v = new Float32Array(n); u0 = new Float32Array(n); v0 = new Float32Array(n)
      d = new Float32Array(n); d0 = new Float32Array(n)
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    // ---- stable fluids ----
    const bound = (b: number, x: Float32Array) => {
      for (let i = 1; i <= N; i++) { x[IX(i, 0)] = b === 2 ? -x[IX(i, 1)] : x[IX(i, 1)]; x[IX(i, M + 1)] = b === 2 ? -x[IX(i, M)] : x[IX(i, M)] }
      for (let j = 1; j <= M; j++) { x[IX(0, j)] = b === 1 ? -x[IX(1, j)] : x[IX(1, j)]; x[IX(N + 1, j)] = b === 1 ? -x[IX(N, j)] : x[IX(N, j)] }
    }
    const lin = (b: number, x: Float32Array, x0: Float32Array, a: number, c: number) => {
      for (let k = 0; k < 6; k++) {
        for (let j = 1; j <= M; j++) for (let i = 1; i <= N; i++)
          x[IX(i, j)] = (x0[IX(i, j)] + a * (x[IX(i - 1, j)] + x[IX(i + 1, j)] + x[IX(i, j - 1)] + x[IX(i, j + 1)])) / c
        bound(b, x)
      }
    }
    const diffuse = (b: number, x: Float32Array, x0: Float32Array, k: number, dt: number) => { const a = dt * k * N * M; lin(b, x, x0, a, 1 + 4 * a) }
    const advect = (b: number, dd: Float32Array, d0_: Float32Array, uu: Float32Array, vv: Float32Array, dt: number) => {
      for (let j = 1; j <= M; j++) for (let i = 1; i <= N; i++) {
        let x = i - dt * uu[IX(i, j)], y = j - dt * vv[IX(i, j)]
        x = Math.min(Math.max(x, 0.5), N + 0.5); y = Math.min(Math.max(y, 0.5), M + 0.5)
        const i0 = Math.floor(x), j0 = Math.floor(y), s1 = x - i0, t1 = y - j0
        dd[IX(i, j)] = (1 - s1) * ((1 - t1) * d0_[IX(i0, j0)] + t1 * d0_[IX(i0, j0 + 1)]) + s1 * ((1 - t1) * d0_[IX(i0 + 1, j0)] + t1 * d0_[IX(i0 + 1, j0 + 1)])
      }
      bound(b, dd)
    }
    const project = (uu: Float32Array, vv: Float32Array, p: Float32Array, div: Float32Array) => {
      for (let j = 1; j <= M; j++) for (let i = 1; i <= N; i++) {
        div[IX(i, j)] = -0.5 * (uu[IX(i + 1, j)] - uu[IX(i - 1, j)] + vv[IX(i, j + 1)] - vv[IX(i, j - 1)])
        p[IX(i, j)] = 0
      }
      bound(0, div); bound(0, p); lin(0, p, div, 1, 4)
      for (let j = 1; j <= M; j++) for (let i = 1; i <= N; i++) {
        uu[IX(i, j)] -= 0.5 * (p[IX(i + 1, j)] - p[IX(i - 1, j)])
        vv[IX(i, j)] -= 0.5 * (p[IX(i, j + 1)] - p[IX(i, j - 1)])
      }
      bound(1, uu); bound(2, vv)
    }
    const step = (dt: number) => {
      // velocity
      u0.set(u); v0.set(v); diffuse(1, u, u0, 0.00002, dt); diffuse(2, v, v0, 0.00002, dt); project(u, v, u0, v0)
      u0.set(u); v0.set(v); advect(1, u, u0, u0, v0, dt); advect(2, v, v0, u0, v0, dt); project(u, v, u0, v0)
      // dye
      d0.set(d); advect(0, d, d0, u, v, dt)
      for (let k = 0; k < d.length; k++) { d[k] *= 0.98; u[k] *= 0.996; v[k] *= 0.996 } // slow fade, long swirl
    }

    // ---- pointer: push the fluid and pour dye in a soft disc ----
    let last: { x: number; y: number } | null = null
    const splat = (x: number, y: number, fx: number, fy: number, amount: number) => {
      const ci = x / res + 1, cj = y / res + 1, r = 2.6
      for (let j = Math.max(1, Math.floor(cj - r)); j <= Math.min(M, Math.ceil(cj + r)); j++)
        for (let i = Math.max(1, Math.floor(ci - r)); i <= Math.min(N, Math.ceil(ci + r)); i++) {
          const f = Math.exp(-((i - ci) ** 2 + (j - cj) ** 2) / (r * r * 0.5))
          u[IX(i, j)] += fx * f; v[IX(i, j)] += fy * f; d[IX(i, j)] = Math.min(1.6, d[IX(i, j)] + amount * f)
        }
    }
    let touched = -Infinity // when the pointer last stirred the fluid (inside or near the box)
    const move = (e: PointerEvent) => {
      const b = box.getBoundingClientRect()
      const x = e.clientX - b.left, y = e.clientY - b.top
      const inside = x >= 0 && y >= 0 && x <= b.width && y <= b.height
      if (inside) {
        touched = performance.now()
        const dx = last ? x - last.x : 0, dy = last ? y - last.y : 0
        splat(x, y, dx * 0.75, dy * 0.75, 0.35 + Math.min(0.6, Math.hypot(dx, dy) * 0.02))
        last = { x, y }
      } else {
        last = null
        // The hint: a little dye at the closest edge, more the nearer you are, drifting inward
        const cx = Math.min(Math.max(x, 0), b.width), cy = Math.min(Math.max(y, 0), b.height)
        const range = parseFloat(getComputedStyle(document.documentElement).fontSize) * 18
        const near = Math.max(0, 1 - Math.hypot(x - cx, y - cy) / range)
        if (near <= 0) return
        touched = performance.now()
        splat(cx, cy, (cx - x) * 0.01 * near, (cy - y) * 0.01 * near, 0.12 * near ** 1.5)
      }
      start()
    }

    // ---- draw: only the grid lines, colored by the dye under them ----
    const metal = (p: number, sheen: number) => {
      // brushed metal: graphite to silver bands, a cool steel tint one way and a faint champagne the other;
      // faster flow catches the light (a brighter, cooler sheen)
      const band = 0.5 + 0.5 * Math.cos(2 * Math.PI * p)
      const tint = Math.sin(2 * Math.PI * p * 0.5 + 1.3)
      const l = Math.min(1, band * 0.7 + sheen * 0.4)
      const base = [80 + l * 104, 90 + l * 106, 110 + l * 104]
      // now and then a bluish silver-white highlight sweeps through the bands
      const hi = Math.pow(Math.max(0, Math.cos(2 * Math.PI * (p * 0.7 + 0.2))), 3) * 0.7
      const blue = [170, 190, 232]
      return [base[0] + tint * 6, base[1] + tint * 2, base[2] - tint * 4]
        .map((c, i) => c + (blue[i] - c) * hi)
        .map((c) => Math.round(Math.min(232, Math.max(80, c))))
    }
    const sample = (x: number, y: number) => {
      const i = Math.min(N, Math.max(1, Math.round(x / res + 0.5))), j = Math.min(M, Math.max(1, Math.round(y / res + 0.5)))
      return IX(i, j)
    }
    const seg = (x: number, y: number, horiz: boolean, t: number) => {
      const k = sample(horiz ? x + res / 2 : x, horiz ? y : y + res / 2)
      const a = Math.min(1, d[k] * 1.6) * 0.5 // kept subtle (the movement is unchanged)
      if (a < 0.02) return 0
      const speed = Math.hypot(u[k], v[k])
      let [r, g, b] = metal(x / w * 3.2 + y / h * 0.9 + d[k] * 0.6 + t * 0.00005, Math.min(1, speed * 0.25))
      // The shine: now and then a short glint, where the flow moves fast, the line flashes to near white
      const glint = Math.pow(Math.max(0, Math.sin(t * 0.0035 + x * 0.071 + y * 0.113)), 14) * Math.min(1, speed * 0.5)
      r += (248 - r) * glint; g += (250 - g) * glint; b += (255 - b) * glint
      // a soft 3px sheen around the line (the metal catching light), then the line itself
      ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${a * 0.1})`
      if (horiz) ctx.fillRect(x, y - 1, res, 3); else ctx.fillRect(x - 1, y, 3, res)
      ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${a})`
      if (horiz) ctx.fillRect(x, y, res, 1); else ctx.fillRect(x, y, 1, res)
      return a
    }
    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      let lit = 0
      // rows counted up from the bottom stroke, like the resting grid (index.css .alive-base)
      for (let y = h % cell; y < h; y += cell) for (let x = 0; x < w; x += res) lit += seg(x, y, true, t)
      for (let x = 0; x <= w; x += cell) for (let y = 0; y < h; y += res) lit += seg(x, y, false, t)
      return lit
    }

    let raf = 0, prev = 0
    const loop = (t: number) => {
      const dt = Math.min(0.033, (t - (prev || t)) / 1000) * 6
      prev = t
      step(dt || 0.1)
      const lit = draw(t)
      raf = lit > 0.05 || box.matches(":hover") ? requestAnimationFrame(loop) : 0
      if (!raf) { prev = 0; ctx.clearRect(0, 0, w, h) }
    }
    const start = () => { if (!raf) raf = requestAnimationFrame(loop) }

    // The idle pulse: now and then (first a few seconds in, then every 8 to 13s, each from a new place; never while you're on or near it, never in a hidden tab)
    // a soft stroke drifts across part of the header by itself, as if someone breathed on it, then fades
    let pulseTimer = 0, pulseRaf = 0, lastStart = { x: -1e4, y: -1e4 }
    const schedule = (first = false) => { pulseTimer = window.setTimeout(pulse, first ? 2500 + Math.random() * 1500 : 8000 + Math.random() * 5000) }
    const pulse = () => {
      if (document.hidden || box.matches(":hover") || performance.now() - touched < 6000 || !w) return schedule()
      // Shuffled: a new start each time, anywhere in the box (but not where the last one began), heading any way
      // that stays mostly inside, with its own length, curve and pace
      let x0 = 0, y0 = 0
      for (let k = 0; k < 8; k++) {
        x0 = w * (0.08 + Math.random() * 0.84); y0 = h * (0.2 + Math.random() * 0.6)
        if (Math.hypot(x0 - lastStart.x, y0 - lastStart.y) > w * 0.25) break
      }
      lastStart = { x: x0, y: y0 }
      const toCenter = Math.atan2(h / 2 - y0, w / 2 - x0)
      const angle = toCenter + (Math.random() - 0.5) * 2.2
      const len = Math.min(w * (0.18 + Math.random() * 0.2), 24 * cell)
      const ax = Math.cos(angle), ay = Math.sin(angle) * 0.35 // flatter: the box is wide and short
      const bend = (Math.random() - 0.5) * h * 0.3, waves = 0.8 + Math.random() * 1.2
      const t0 = performance.now(), dur = 750 + Math.random() * 400
      let px = x0, py = y0
      const stroke = (t: number) => {
        const p = Math.min(1, (t - t0) / dur), e = p * p * (3 - 2 * p)
        const x = x0 + ax * len * e, y = y0 + ay * len * e + Math.sin(e * Math.PI * waves) * bend
        splat(x, y, (x - px) * 0.45, (y - py) * 0.45, 0.16 * Math.sin(p * Math.PI))
        px = x; py = y
        start()
        if (p < 1) pulseRaf = requestAnimationFrame(stroke); else schedule()
      }
      pulseRaf = requestAnimationFrame(stroke)
    }
    schedule(true)

    size()
    const ro = new ResizeObserver(size)
    ro.observe(box)
    window.addEventListener("pointermove", move, { passive: true })
    return () => { cancelAnimationFrame(raf); cancelAnimationFrame(pulseRaf); clearTimeout(pulseTimer); ro.disconnect(); window.removeEventListener("pointermove", move) }
  }, [])
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 -z-1 size-full" />
}
