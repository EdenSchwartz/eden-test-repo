import { Sidebar } from "@/components/ui/sidebar"
import {
  AgentsIcon, ChatsIcon, CollapseIcon, ConnectorsIcon, ExpandSimpleIcon, HomeIcon, PlatformIcon, PlusIcon,
  RivalMark, RivalWordmark, SectionToggleIcon, SettingsIcon,
} from "@/components/nav-icons"
import { useLayoutEffect, useRef, useState } from "react"
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
 * The Recents group lists your conversations. Each group title collapses / expands its section (hover shows the triangle). The collapse button is drawn as in the frame and does nothing.
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
const top = cn("flex h-6 w-full cursor-pointer items-center gap-1.5 rounded-[0.25rem] py-1 pr-1 pl-1.5 text-left", text)

export function AppSidebar() {
  const { navigate, page, params } = useNav()
  const { convs } = useConversations()
  // Sections you've collapsed (all open to start). Hovering a title swaps its icon for the toggle triangle
  const [closed, setClosed] = useState<Set<string>>(() => new Set())
  const toggle = (id: string) => setClosed((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  // Recents: your conversations, newest first (+ starts a new one)
  const all = [...groups, {
    id: "recents", label: "Recents", icon: ChatsIcon, plus: true,
    items: convs.map((c) => ({ label: c.title, page: "chat", params: { conversationId: c.id } })),
  }]

  return (
    <Sidebar collapsible="none" className="sticky top-0 h-svh w-[12.25rem] shrink-0 border-r border-[#ecebe9] bg-[#fcfcfa] font-[Geist,ui-sans-serif,system-ui,sans-serif]">
      <div className="flex h-full flex-col overflow-clip">
        <div className="flex h-12 w-full shrink-0 items-center justify-between pr-4 pl-3.5">
          <button onClick={() => navigate("explorer")} aria-label="Rival" className="flex h-6 cursor-pointer items-center justify-center rounded-[0.25rem] p-1.5 text-[#0350d0]">
            <RivalWordmark className="h-[1.0156rem] w-[2.8125rem]" />
          </button>
          <button aria-label="Collapse" className="flex size-6 cursor-pointer items-center justify-center rounded-[0.25rem] p-1.5 text-[#6c6a68]">
            <CollapseIcon className="size-4 shrink-0" />
          </button>
        </div>

        <nav aria-label="Main" className="flex min-h-px w-full flex-[1_0_0] flex-col items-start gap-4 overflow-y-auto px-3 py-1.5">
          <div className="flex w-full flex-col items-start">
            <div className="flex w-full flex-col items-start gap-1.5">
              <button onClick={() => navigate("chat")} className={top}>
                <HomeIcon className="size-4 shrink-0" /> <span className="min-w-px flex-[1_0_0] truncate">Home</span>
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
                        <span aria-hidden className="absolute inset-x-0 -top-[0.1875rem] -bottom-[0.1875rem] rounded-[0.375rem] border border-[#ecebe9] bg-white shadow-[0px_1px_1px_0px_rgba(119,131,152,0.2)]" />
                        <span aria-hidden className="relative h-3.5 w-0 shrink-0"><SelectedBar /></span>
                        <span className="relative min-w-px flex-[1_0_0] truncate text-[0.875rem] leading-4 text-[#2e4eca]">{it.label}</span>
                      </button>
                    ) : (
                      <button key={it.params?.conversationId ?? it.label} onClick={() => navigate(it.page, it.params)} title={it.params ? it.label : undefined} className={cn("flex h-6 w-full cursor-pointer items-center rounded-[0.25rem] pr-1 pl-[1.625rem] text-left", text)}>
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
  )
}

// The selected item's 1.5px bar, nudged onto a whole screen pixel: the UI scales with the screen (rem), which
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
  return <span ref={ref} className="absolute inset-y-0 left-0 w-[1.5px] bg-[#2e4eca]" />
}
