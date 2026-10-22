import type React from "react"


/*
 * The cards' hover, after the reference video: the card turns toward the pointer in real perspective (6° at most),
 * lifts a little, and its shadow grows and leans away. Light comes from a fixed source (top left): the agent's
 * colour square catches it as a soft highlight that moves as the card turns, and the paper only shades faintly on
 * the side turning away. Eases back flat on leave. Styles: .tilt-card in index.css.
 */
export function useTilt() {
  const still = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const set = (el: HTMLElement, x: number, y: number) => {
    el.style.setProperty("--rx", `${(-y * 6).toFixed(2)}deg`)
    el.style.setProperty("--ry", `${(x * 6).toFixed(2)}deg`)
    // where the light falls (from the top left): it moves against the tilt, like a fixed source on a turning surface
    el.style.setProperty("--bx", `${(35 - x * 30).toFixed(1)}%`)
    el.style.setProperty("--by", `${(30 - y * 30).toFixed(1)}%`)
    el.style.setProperty("--sx", `${(-x * 6).toFixed(1)}px`)
    el.style.setProperty("--sy", `${(8 - y * 4).toFixed(1)}px`)
  }
  return still ? {} : {
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const b = e.currentTarget.getBoundingClientRect()
      set(e.currentTarget, ((e.clientX - b.left) / b.width) * 2 - 1, ((e.clientY - b.top) / b.height) * 2 - 1)
    },
    onPointerLeave: (e: React.PointerEvent<HTMLElement>) => set(e.currentTarget, 0, 0),
  }
}
