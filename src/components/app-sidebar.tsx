import { Sidebar } from "@/components/ui/sidebar"
import {
  AgentsIcon, ChatsIcon, CollapseIcon, ConnectorsIcon, ExpandSimpleIcon, HomeIcon, PlatformIcon, PlusIcon,
  RivalMark, RivalWordmark, SectionToggleIcon, SettingsIcon,
} from "@/components/nav-icons"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useConversations } from "@/lib/conversations"
import { useNav } from "@/lib/nav"
import { cn } from "@/lib/utils"

/*
 * The sidebar, exactly as in the Figma "Frame 2147206359" (file "🏎️ Rival 2.0 Demo").

 * Sizes are in rem (Figma px ÷ 16), so the frame is 1:1 at 16px and grows with the big-screen scaling in index.css.
 * 196px wide, background #FCFCFA, a #ECEBE9 line on its right, no line under its header, Geist 14/16.
 *   Navigation px 12 · py 6, gap 16; main nav gap 24; groups px 2 gap 12, title rows px 4, items pl 26,
 *   the tree line at left 14 / top 28 (#9A9893 at 20%)
 *   Active: white, #ECEBE9 border, drop shadow 0 1 0.5 rgba(119,131,152,.2), pl 12 py 6 gap 14, bar and text #2E4ECA
 *   Bottom: px 14 · py 8, gap 6; the workspace px 2
 * The Recents group lists your conversations. Each group title collapses / expands its section (hover shows the triangle). The collapse button (top right) folds the whole sidebar into a 48px rail of icons
 * (Home · Agents · Platform · Recents · Connectors · Settings); hovering an icon shows its items in a popover beside it.
 * Remembered across reloads.
 */

type Item = { label: string; page: string; params?: Record<string, string> }
const groups: { id: string; label: string; icon: React.ComponentType<{ className?: string }>; items: Item[]; plus?: boolean }[] = [
  {
    id: "agents", label: "Agents", icon: AgentsIcon,
    items: [
      { label: "Waiting", page: "waiting" }, { label: "My Agents", page: "gallery" }, { label: "Agents Library", page: "explorer" },
      { label: "Activity", page: "agents" }, { label: "Memory", page: "memory" }, { label: "Usage", page: "usage" },
    ],
  },
  { id: "platform", label: "Platform", icon: PlatformIcon, items: [{ label: "Findings", page: "findings" }, { label: "Assets", page: "assets" }, { label: "Applications", page: "applications" }, { label: "Packages", page: "packages" }] },
]

const text = "text-[0.875rem] leading-4 text-[#6c6a68]"
// The selected box: white, a 1px #ECEBE9 stroke, 6px corners, drop shadow 0 1 1 #778398 at 20%, 6px above and below
// the text, drawn past its 24px row so nothing moves when you select
const selectedBox = "absolute inset-x-0 -top-[0.1875rem] -bottom-[0.1875rem] rounded-[0.375rem] border border-[#ecebe9] bg-white shadow-[0px_1px_1px_0px_rgba(119,131,152,0.2)]"
// Hover (every item, like the collapse button): a soft grey wash on the row
const hoverRow = "transition-colors hover:bg-[#9a9893]/10"
const top = cn("flex h-6 w-full cursor-pointer items-center gap-1.5 rounded-[0.25rem] py-1 pr-1 pl-1.5 text-left", hoverRow, text)

export function AppSidebar() {
  const { navigate, page, params } = useNav()
  const { convs } = useConversations()
  const onHome = page === "chat" && !params.conversationId
  // Sections you've collapsed (all open to start). Hovering a title swaps its icon for the toggle triangle
  const [closed, setClosed] = useState<Set<string>>(() => new Set())
  const toggle = (id: string) => setClosed((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  // Recents: your conversations, newest first (+ starts a new one)
  const all = [...groups, {
    id: "recents", label: "Recents", icon: ChatsIcon, plus: true,
    items: convs.map((c) => ({ label: c.title, page: "chat", params: { conversationId: c.id } })),
  }]
  // The whole sidebar folded into a rail of icons (remembered)
  const [slim, setSlim] = useState(() => { try { return localStorage.getItem("rival.nav.slim") === "1" } catch { return false } })
  const setSlimSaved = (v: boolean) => { setSlim(v); try { localStorage.setItem("rival.nav.slim", v ? "1" : "0") } catch { /* ok */ } }

  // Opening and closing glide: the frame's width moves between 196px and 48px (and the page beside it with it);
  // opening reveals the full menu as it widens, closing keeps the rail's icons still while the edge slides in
  return (
    <div className="sticky top-0 h-svh shrink-0 overflow-hidden border-r border-[#ecebe9] bg-[#fcfcfa] transition-[width] duration-300 ease-[cubic-bezier(.3,.7,.15,1)] motion-reduce:transition-none" style={{ width: slim ? "3rem" : "12.25rem" }}>
    {slim ? <SlimSidebar groups={all} onHome={onHome} onExpand={() => setSlimSaved(false)} /> : (
    <Sidebar collapsible="none" className="h-full w-[12.25rem] shrink-0 bg-[#fcfcfa] font-[Geist,ui-sans-serif,system-ui,sans-serif]">
      <div className="flex h-full flex-col overflow-clip">
        <div className="flex h-12 w-full shrink-0 items-center justify-between pr-4 pl-3.5">
          <button onClick={() => navigate("explorer")} aria-label="Rival" className="flex h-6 cursor-pointer items-center justify-center rounded-[0.25rem] p-1.5 text-[#0350d0]">
            <RivalWordmark className="h-[1.0156rem] w-[2.8125rem]" />
          </button>
          <button onClick={() => setSlimSaved(true)} aria-label="Collapse sidebar" title="Collapse sidebar" className="flex size-6 cursor-pointer items-center justify-center rounded-[0.25rem] p-1.5 text-[#6c6a68] transition-colors hover:bg-[#9a9893]/10">
            <CollapseIcon className="size-4 shrink-0" />
          </button>
        </div>

        <nav aria-label="Main" className="flex min-h-px w-full flex-[1_0_0] flex-col items-start gap-4 overflow-y-auto px-3 py-1.5">
          <div className="flex w-full flex-col items-start">
            <div className="flex w-full flex-col items-start gap-1.5">
              {/* Home: selected like the menu items (white box, Rival blue), the icon turns blue (filled a very light blue) instead of a bar */}
              <button onClick={() => navigate("chat")} aria-current={onHome ? "page" : undefined} className={cn(top, "relative", onHome && "z-10 text-[#2e4eca] hover:bg-transparent")}>
                {onHome && <span aria-hidden className={selectedBox} />}
                <HomeIcon className={cn("relative size-4 shrink-0", onHome && "[&_path]:fill-[#e6ebfa]")} /> <span className="relative min-w-px flex-[1_0_0] truncate">Home</span>
              </button>
            </div>

            {/* 24px between sections; under a collapsed one, titles stack at the top rows' rhythm (30px apart) */}
            {all.map((g, i) => (
              <div key={g.id} className={cn("relative flex w-full flex-col items-start px-0.5 transition-[margin] duration-200 ease-out", i > 0 && closed.has(all[i - 1].id) ? "mt-3.5" : "mt-6")}>
                <span aria-hidden className={cn("absolute top-7 bottom-0 left-3.5 w-px bg-[#9a9893]/20 transition-opacity duration-200", closed.has(g.id) && "opacity-0")} />
                <div className="relative flex w-full items-center gap-1.5 px-1">
                  {/* The title: click to collapse or expand; on hover its icon becomes the triangle (down = open) */}
                  <button onClick={() => toggle(g.id)} aria-expanded={!closed.has(g.id)} className="group/title flex min-w-px flex-[1_0_0] cursor-pointer items-center gap-1.5 text-left">
                    <span className="relative size-4 shrink-0">
                      <g.icon className="absolute inset-0 size-4 text-[#9a9893] transition-opacity duration-150 group-hover/title:opacity-0" />
                      <SectionToggleIcon className={cn("absolute inset-0 size-4 text-[#6c6a68] opacity-0 transition-[opacity,rotate] duration-200 group-hover/title:opacity-100", !closed.has(g.id) && "rotate-90")} />
                    </span>
                    <span className="truncate text-[0.875rem] leading-4 text-[#9a9893] transition-colors group-hover/title:text-[#6c6a68]">{g.label}</span>
                  </button>
                  {g.plus && (
                    <button onClick={() => navigate("chat")} aria-label="New chat" className="flex size-4 shrink-0 cursor-pointer items-center justify-center text-[#6c6a68]">
                      <PlusIcon className="size-4" />
                    </button>
                  )}
                </div>
                {/* The items fold away (rows animate from their height to 0) */}
                <div className={cn("grid w-full transition-[grid-template-rows] duration-200 ease-out", closed.has(g.id) ? "grid-rows-[0fr]" : "grid-rows-[1fr]")}>
                <div className="min-h-0 w-full overflow-hidden">
                <div className="flex w-full flex-col items-start gap-1.5 pt-3">
                  {g.items.map((it) => {
                    const active = it.params ? page === "chat" && params.conversationId === it.params.conversationId : page === it.page
                    return active ? (
                      <button key={it.params?.conversationId ?? it.label} onClick={() => navigate(it.page, it.params)} aria-current="page" className="relative z-10 flex h-6 w-full cursor-pointer items-center gap-3.5 pr-1 pl-3 text-left">
                        {/* The white box: 6px above and below the text (30px tall), drawn past the row so nothing moves */}
                        <span aria-hidden className={selectedBox} />
                        <span aria-hidden className="relative h-3.5 w-0 shrink-0"><SelectedBar /></span>
                        <span className="relative min-w-px flex-[1_0_0] truncate text-[0.875rem] leading-4 text-[#2e4eca]">{it.label}</span>
                      </button>
                    ) : (
                      <button key={it.params?.conversationId ?? it.label} onClick={() => navigate(it.page, it.params)} title={it.params ? it.label : undefined} className={cn("flex h-6 w-full cursor-pointer items-center rounded-[0.25rem] pr-1 pl-[1.625rem] text-left", hoverRow, text)}>
                        <span className="min-w-px flex-[1_0_0] truncate">{it.label}</span>
                      </button>
                    )
                  })}
                </div>
                </div>
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="flex shrink-0 flex-col items-start gap-1.5 px-3.5 py-2">
          <button onClick={() => navigate("connectors")} className={cn(top, "w-[10.5rem]")}>
            <ConnectorsIcon className="size-4 shrink-0" /> <span className="min-w-px flex-[1_0_0] truncate">Connectors</span>
          </button>
          <button onClick={() => navigate("settings")} className={cn(top, "w-[10.5rem]")}>
            <SettingsIcon className="size-4 shrink-0" /> <span className="min-w-px flex-[1_0_0] truncate">Settings</span>
          </button>
          <button className="flex h-10 w-[10.5rem] cursor-pointer items-center gap-1.5 rounded-[0.375rem] px-0.5 py-1 text-left text-[0.875rem] leading-4">
            <span className="relative size-8 shrink-0 overflow-clip rounded-[0.375rem] border border-[#ecebe9] bg-white shadow-[0px_1px_1px_0px_rgba(119,131,152,0.2)]">
              <RivalMark className="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 text-[#0350d0]" />
            </span>
            <span className="flex min-w-px flex-[1_0_0] flex-col items-start justify-center">
              <span className="text-[#121212]">Rival</span>
              <span className="whitespace-nowrap text-[#9a9893]">eden@rival.io</span>
            </span>
            <ExpandSimpleIcon className="size-3 shrink-0 text-[#9a9893]" />
          </button>
        </div>
      </div>
    </Sidebar>
    )}
    </div>
  )
}

// The selected item's 2px bar, nudged onto a whole screen pixel: the UI scales with the screen (rem), which
// can leave it at e.g. 26.56px, where it smudges wider. Re-snaps when the window or the scaling changes.
function SelectedBar() {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const snap = () => {
      el.style.transform = ""
      const dpr = window.devicePixelRatio || 1
      const x = el.getBoundingClientRect().left * dpr
      el.style.transform = `translateX(${(Math.round(x) - x) / dpr}px)`
    }
    snap()
    window.addEventListener("resize", snap)
    return () => window.removeEventListener("resize", snap)
  }, [])
  return <span ref={ref} className="absolute inset-y-0 left-0 w-[2px] bg-[#2e4eca]" />
}

/*
 * The collapsed sidebar: a 48px rail with the same background and line. Only the menu items, as icons:
 * Home, then Agents · Platform · Recents, and Connectors · Settings · the workspace at the bottom.
 * Hovering an icon opens a popover beside it with its items (or just its name, for a single item); the popover
 * stays while the pointer moves into it. The icon of the section you're in takes the selected look (white box, blue).
 */
type Group = { id: string; label: string; icon: React.ComponentType<{ className?: string }>; items: Item[]; plus?: boolean }

function SlimSidebar({ groups, onHome, onExpand }: { groups: Group[]; onHome: boolean; onExpand: () => void }) {
  const { navigate, page, params } = useNav()
  const [hover, setHover] = useState<{ id: string; top: number; left: number } | null>(null)
  const timer = useRef(0)
  const open = (id: string, e: React.MouseEvent) => {
    clearTimeout(timer.current)
    const r = e.currentTarget.getBoundingClientRect()
    setHover({ id, top: r.top, left: r.right })
  }
  const leave = () => { clearTimeout(timer.current); timer.current = window.setTimeout(() => setHover(null), 160) }
  useEffect(() => () => clearTimeout(timer.current), [])
  const isActive = (it: Item) => it.params ? page === "chat" && params.conversationId === it.params.conversationId : page === it.page
  const go = (it: Item) => { setHover(null); navigate(it.page, it.params) }

  const icon = (id: string, label: string, Icon: React.ComponentType<{ className?: string }>, active: boolean, onClick: () => void) => (
    <button
      key={id}
      onClick={onClick}
      onMouseEnter={(e) => open(id, e)}
      onMouseLeave={leave}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn("relative grid size-7 shrink-0 cursor-pointer place-items-center rounded-[0.375rem] text-[#6c6a68] transition-colors", active ? "z-10 text-[#2e4eca]" : "hover:bg-[#9a9893]/10", hover?.id === id && !active && "bg-[#9a9893]/10")}
    >
      {active && <span aria-hidden className="absolute inset-0 rounded-[0.375rem] border border-[#ecebe9] bg-white shadow-[0px_1px_1px_0px_rgba(119,131,152,0.2)]" />}
      {/* Selected: the icon in Rival blue, filled a very light blue (like Home in the open sidebar), dead centre */}
      <Icon className={cn("relative col-start-1 row-start-1 size-4", active && "[&_path]:fill-[#e6ebfa]")} />
    </button>
  )
  const singles: Record<string, { label: string; page: string }> = {
    home: { label: "Home", page: "chat" }, connectors: { label: "Connectors", page: "connectors" }, settings: { label: "Settings", page: "settings" },
  }
  const current = hover && (groups.find((g) => g.id === hover.id) ?? (singles[hover.id] && { id: hover.id, label: singles[hover.id].label, items: [] as Item[], plus: false }))

  return (
    <Sidebar collapsible="none" className="h-full w-12 shrink-0 bg-[#fcfcfa] font-[Geist,ui-sans-serif,system-ui,sans-serif]">
      <div className="flex h-full flex-col items-center">
        <div className="flex h-12 w-full shrink-0 items-center justify-center">
          {/* The Rival R; hovering it swaps in the expand button */}
          <button onClick={onExpand} aria-label="Expand sidebar" title="Expand sidebar" className="group/logo grid size-7 cursor-pointer place-items-center rounded-[0.375rem] text-[#6c6a68] transition-colors hover:bg-[#9a9893]/10">
            <RivalMark className="col-start-1 row-start-1 size-7 text-[#0350d0] transition-opacity duration-150 group-hover/logo:opacity-0" />
            <CollapseIcon className="col-start-1 row-start-1 size-4 rotate-180 opacity-0 transition-opacity duration-150 group-hover/logo:opacity-100" />
          </button>
        </div>
        <nav aria-label="Main" className="flex min-h-px w-full flex-[1_0_0] flex-col items-center gap-0.5 py-1.5">
          {icon("home", "Home", HomeIcon, onHome, () => navigate("chat"))}
          <span aria-hidden className="my-1 h-px w-4 bg-[#ecebe9]" />
          {groups.map((g) => icon(g.id, g.label, g.icon, g.items.some(isActive), () => g.items[0] && go(g.items[0])))}
        </nav>
        <div className="flex shrink-0 flex-col items-center gap-0.5 py-2">
          {icon("connectors", "Connectors", ConnectorsIcon, page === "connectors", () => navigate("connectors"))}
          {icon("settings", "Settings", SettingsIcon, page === "settings", () => navigate("settings"))}
          <span className="relative mt-1 size-8 shrink-0 overflow-clip rounded-[0.375rem] border border-[#ecebe9] bg-white shadow-[0px_1px_1px_0px_rgba(119,131,152,0.2)]" title="Rival · eden@rival.io">
            <RivalMark className="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 text-[#0350d0]" />
          </span>
        </div>
      </div>

      {hover && current && createPortal(
        <div
          role="menu"
          aria-label={current.label}
          onMouseEnter={() => clearTimeout(timer.current)}
          onMouseLeave={leave}
          className="fixed z-50 flex min-w-[11rem] max-w-[16rem] flex-col rounded-[0.5rem] border border-[#ecebe9] bg-white p-1 font-[Geist,ui-sans-serif,system-ui,sans-serif] shadow-[0px_4px_16px_rgba(18,18,18,0.08),0px_1px_2px_rgba(119,131,152,0.2)] animate-in fade-in-0 slide-in-from-left-1 duration-150"
          style={{ top: hover.top - 4, left: hover.left + 10 }}
        >
          {current.items.length === 0 ? (
            <button role="menuitem" onClick={() => { setHover(null); navigate(singles[current.id].page) }} className="flex h-7 cursor-pointer items-center rounded-[0.25rem] px-2 text-left text-[0.875rem] leading-4 text-[#121212] hover:bg-[#f4f4f2]">
              {current.label}
            </button>
          ) : <>
            <div className="flex h-7 items-center justify-between px-2 text-[0.75rem] leading-4 text-[#9a9893]">
              {current.label}
              {current.plus && (
                <button onClick={() => { setHover(null); navigate("chat") }} aria-label="New chat" className="flex size-4 cursor-pointer items-center justify-center text-[#6c6a68]"><PlusIcon className="size-4" /></button>
              )}
            </div>
            {current.items.map((it) => (
              <button
                key={it.params?.conversationId ?? it.label}
                role="menuitem"
                onClick={() => go(it)}
                aria-current={isActive(it) ? "page" : undefined}
                className={cn("flex h-7 cursor-pointer items-center rounded-[0.25rem] px-2 text-left text-[0.875rem] leading-4", isActive(it) ? "bg-[#2e4eca]/[0.06] text-[#2e4eca]" : "text-[#6c6a68] hover:bg-[#f4f4f2] hover:text-[#121212]")}
              >
                <span className="truncate">{it.label}</span>
              </button>
            ))}
          </>}
        </div>,
        document.body,
      )}
    </Sidebar>
  )
}
