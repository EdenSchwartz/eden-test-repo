import { Sidebar } from "@/components/ui/sidebar"
import {
  AgentsIcon, AskRivalIcon, ChatsIcon, CollapseIcon, ConnectorsIcon, ExpandSimpleIcon, HomeIcon, PlatformIcon, PlusIcon,
  RivalMark, RivalWordmark, SettingsIcon, WaitingIcon,
} from "@/components/nav-icons"
import { useNav } from "@/lib/nav"
import { cn } from "@/lib/utils"

/*
 * The sidebar, exactly as in the Figma "Frame 2147206359" (file "🏎️ Rival 2.0 Demo").

 * Sizes are in rem (Figma px ÷ 16), so the frame is 1:1 at 16px and grows with the big-screen scaling in index.css.
 * 196px wide, background #FCFCFA, a #ECEBE9 line on its right, no line under its header, Geist 14/16.
 *   Navigation px 12 · py 6, gap 16; main nav gap 24; groups px 2 gap 12, title rows px 4, items pl 26,
 *   the tree line at left 14 / top 28 (#9A9893 at 20%)
 *   Active: white, #ECEBE9 border, drop shadow 0 1 0.5 rgba(119,131,152,.2), pl 12 py 6 gap 14, bar and text #0170FD
 *   Bottom: px 14 · py 8, gap 6; the workspace px 2
 * The Chats group lists the frame's own items. The collapse button is drawn as in the frame and does nothing.
 */

type Item = { label: string; page: string }
const groups: { id: string; label: string; icon: React.ComponentType<{ className?: string }>; items: Item[]; plus?: boolean }[] = [
  {
    id: "agents", label: "Agents", icon: AgentsIcon,
    items: [
      { label: "My Agents", page: "gallery" }, { label: "Agents Library", page: "explorer" }, { label: "Activity", page: "agents" },
      { label: "Scheduled", page: "scheduled" }, { label: "Memory", page: "memory" }, { label: "Policies", page: "policies" },
      { label: "Usage", page: "usage" },
    ],
  },
  { id: "platform", label: "Platform", icon: PlatformIcon, items: [{ label: "Findings", page: "findings" }, { label: "Entities", page: "entities" }, { label: "Packages", page: "packages" }] },
  {
    id: "chats", label: "Chats", icon: ChatsIcon, plus: true,
    items: [
      { label: "My Agents", page: "gallery" }, { label: "Agent Library", page: "explorer" }, { label: "Activity", page: "agents" },
      { label: "Scheduled", page: "scheduled" }, { label: "Memory", page: "memory" },
    ],
  },
]

const text = "text-[0.875rem] leading-4 text-[#6c6a68]"
const top = cn("flex h-6 w-full cursor-pointer items-center gap-1.5 rounded-[0.25rem] py-1 pr-1 pl-1.5 text-left", text)

export function AppSidebar() {
  const { navigate, page } = useNav()

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

        <nav aria-label="Main" className="flex min-h-px w-full flex-[1_0_0] flex-col items-start gap-4 px-3 py-1.5">
          <div className="flex w-full flex-col items-start gap-6">
            <div className="flex w-full flex-col items-start gap-1.5">
              <button onClick={() => navigate("chat")} className={cn(top, "drop-shadow-[0px_1px_0.5px_rgba(119,131,152,0.2)]")}>
                <AskRivalIcon className="size-4 shrink-0" /> <span className="whitespace-nowrap">Ask Rival</span>
              </button>
              <button onClick={() => navigate("chat")} className={top}>
                <HomeIcon className="size-4 shrink-0" /> <span className="min-w-px flex-[1_0_0] truncate">Home</span>
              </button>
              <button onClick={() => navigate("waiting")} className={top}>
                <WaitingIcon className="size-4 shrink-0" /> <span className="min-w-px flex-[1_0_0] truncate">Waiting</span>
              </button>
            </div>

            {groups.map((g) => (
              <div key={g.id} className="relative flex w-full flex-col items-start gap-3 px-0.5">
                <span aria-hidden className="absolute top-7 bottom-0 left-3.5 w-px bg-[#9a9893]/20" />
                <div className="relative flex w-full items-center gap-1.5 px-1">
                  <div className="flex min-w-px flex-[1_0_0] items-center gap-1.5">
                    <g.icon className="size-4 shrink-0 text-[#9a9893]" />
                    <span className="truncate text-[0.875rem] leading-4 text-[#9a9893]">{g.label}</span>
                  </div>
                  {g.plus && (
                    <button onClick={() => navigate("chat")} aria-label="New chat" className="flex size-4 shrink-0 cursor-pointer items-center justify-center text-[#6c6a68]">
                      <PlusIcon className="size-4" />
                    </button>
                  )}
                </div>
                <div className="flex w-full flex-col items-start gap-1.5">
                  {g.items.map((it) => {
                    const active = g.id !== "chats" && page === it.page
                    return active ? (
                      <button key={it.label} onClick={() => navigate(it.page)} aria-current="page" className="flex w-full cursor-pointer items-center gap-3.5 rounded-[0.25rem] border border-[#ecebe9] bg-white py-1.5 pr-1 pl-3 text-left drop-shadow-[0px_1px_0.5px_rgba(119,131,152,0.2)]">
                        <span aria-hidden className="relative h-3.5 w-0 shrink-0"><span className="absolute inset-y-0 -left-[0.75px] w-[1.5px] bg-[#0170fd]" /></span>
                        <span className="min-w-px flex-[1_0_0] truncate text-[0.875rem] leading-4 text-[#0170fd]">{it.label}</span>
                      </button>
                    ) : (
                      <button key={it.label} onClick={() => navigate(it.page)} className={cn("flex h-6 w-full cursor-pointer items-center rounded-[0.25rem] pr-1 pl-[1.625rem] text-left", text)}>
                        <span className="min-w-px flex-[1_0_0] truncate">{it.label}</span>
                      </button>
                    )
                  })}
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
