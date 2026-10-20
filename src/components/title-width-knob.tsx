import { useEffect, useState } from "react"

// ponytail: a temporary knob for trying the drawer titles' width (Hubot Sans "wdth", 75–125). Sets
// --drawer-title-wdth on <html>, remembered in localStorage. Delete this file (and its two uses) once a value is picked,
// then hardcode it as [--title-wdth:N] on the titles.
const KEY = "rival.drawer-title-wdth"
const read = () => { try { return Number(localStorage.getItem(KEY)) || 100 } catch { return 100 } }
const apply = (v: number) => document.documentElement.style.setProperty("--drawer-title-wdth", String(v))
apply(read())

export function TitleWidthKnob() {
  const [v, setV] = useState(read)
  useEffect(() => { apply(v); try { localStorage.setItem(KEY, String(v)) } catch { /* ok */ } }, [v])
  return (
    <label className="absolute top-5 right-12 z-10 flex items-center gap-2 rounded-md border border-[#ecebe9] bg-white px-2 py-1 text-[0.6875rem] text-[#6c6a68] shadow-sm">
      Title width
      <input type="range" min={75} max={125} step={1} value={v} onChange={(e) => setV(Number(e.target.value))} className="w-24 accent-[#0350d0]" />
      <span className="w-6 text-right tabular-nums text-[#121212]">{v}</span>
    </label>
  )
}
