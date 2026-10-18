import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

// Rival | Hex: switches the whole demo's look (src/looks/hex.css) by setting <html data-look>.
// Remembered in this browser (index.html applies it before the app paints).
const looks = [
  { id: "rival", label: "Rival" },
  { id: "hex", label: "Hex" },
] as const
type Look = (typeof looks)[number]["id"]

export function LookSwitch() {
  const [look, setLook] = useState<Look>(() => (document.documentElement.dataset.look === "hex" ? "hex" : "rival"))
  useEffect(() => {
    const root = document.documentElement
    if (look === "hex") root.setAttribute("data-look", "hex")
    else root.removeAttribute("data-look")
    try { localStorage.setItem("rival.look", look) } catch { /* private mode: just don't remember */ }
  }, [look])
  const choose = (l: Look) => setLook(l)
  return (
    <div role="radiogroup" aria-label="Look" title="Compare looks" className="inline-flex items-center rounded-lg bg-muted p-[3px]">
      {looks.map((l) => (
        <button
          key={l.id}
          role="radio"
          aria-checked={look === l.id}
          onClick={() => choose(l.id)}
          className={cn(
            "flex h-6.5 cursor-pointer items-center rounded-md px-2.5 text-xs font-medium transition-colors",
            look === l.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
