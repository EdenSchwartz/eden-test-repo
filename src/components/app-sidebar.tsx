import { Sidebar, useSidebar } from "@/components/ui/sidebar"
import {
  AgentsIcon, AskRivalIcon, ChatsIcon, CollapseIcon, ConnectorsIcon, ExpandSimpleIcon, HomeIcon, PlatformIcon, PlusIcon,
  RivalMark, RivalWordmark, SettingsIcon, WaitingIcon,
} from "@/components/nav-icons"
import { useConversations } from "@/lib/conversations"
import { useNav } from "@/lib/nav"
import { cn } from "@/lib/utils"

/*
 * The sidebar, built from the Figma "Navbar" (file "🏎️ Rival 2.0 Demo", node 15:8489), the same in both looks.
 * 180px wide, Geist 14/16, colors from the --nav-* tokens in index.css (background #FBFBFB, a #ECEBE9 line on its right).
 *   Header (48px): the Rival wordmark, and a button that hides the sidebar (the top bar's toggle brings it back)
 *   Top:      Ask Rival (a new chat) · Home · Waiting
 *   Groups:   a muted title with its icon, then indented items joined by a thin tree line on the left
 *             Agents   My Agents · Agent Library · Activity · Scheduled · Memory · Policies · Usage
 *             Platform Findings · Entities · Packages
 *             Chats    your conversations, newest first (+ starts a new one)
 *   Active:   a white raised pill with a hairline edge, a short blue bar on the left, text in Rival blue
 *   Bottom:   Connectors · Settings · the workspace (Rival, eden@rival.io)
 * Pages that aren't built yet (Waiting, Policies, Usage, Entities, Packages, Connectors) show a short placeholder (pages.tsx).
 */

type Item = { label: string; page: string; params?: Record<string, string> }
const groups: { id: string; label: string; icon: React.ComponentType<{ className?: string }>; tint?: boolean; items: Item[] }[] = [
  {
    id: "agents", label: "Agents", icon: AgentsIcon, tint: true,
    items: [
      { label: "My Agents", page: "gallery" }, { label: "Agent Library", page: "explorer" }, { label: "Activity", page: "agents" },
      { label: "Scheduled", page: "scheduled" }, { label: "Memory", page: "memory" }, { label: "Policies", page: "policies" },
      { label: "Usage", page: "usage" },
    ],
  },
  { id: "platform", label: "Platform", icon: PlatformIcon, items: [{ label: "Findings", page: "findings" }, { label: "Entities", page: "entities" }, { label: "Packages", page: "packages" }] },
]

// 24px rows, 14px Geist; the active one becomes the white pill
const row = "flex h-6 w-full cursor-pointer items-center gap-1.5 rounded-[4px] pr-1 pl-1.5 text-left text-[14px] leading-4 text-[var(--nav-text)] transition-colors hover:bg-[var(--nav-hover)]"
const pill = "h-auto gap-3.5 border border-[var(--nav-line)] bg-[var(--nav-pill)] py-1.5 pl-2 text-[var(--nav-active)] drop-shadow-[0px_1px_0.5px_rgba(119,131,152,0.2)] hover:bg-[var(--nav-pill)]"

function SubItem({ label, active, onClick, title }: { label: string; active: boolean; onClick: () => void; title?: string }) {
  return (
    <button onClick={onClick} aria-current={active ? "page" : undefined} title={title} className={cn(row, "pl-[22px]", active && cn(pill, "pl-2"))}>
      {active && <span aria-hidden className="h-3.5 w-[1.5px] shrink-0 rounded-full bg-[var(--nav-active)]" />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  )
}

function Group({ label, icon: Icon, tint, action, children }: { label: string; icon: React.ComponentType<{ className?: string }>; tint?: boolean; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative flex w-full flex-col gap-3">
      {/* The tree line, from under the title's icon down the items */}
      <span aria-hidden className="absolute top-7 bottom-0 left-2 w-px bg-[var(--nav-rail)]" />
      <div className="relative flex w-full items-center gap-1.5 text-[14px] leading-4 text-[var(--nav-muted)]">
        {tint && <span aria-hidden className="absolute top-[3px] left-[2px] h-2.5 w-3 rounded-[2px] bg-[var(--nav-muted)]/10" />}
        <Icon className="relative size-4 shrink-0" />
        <span className="flex-1 truncate">{label}</span>
        {action}
      </div>
      <div className="flex w-full flex-col gap-1.5">{children}</div>
    </div>
  )
}

export function AppSidebar() {
  const { navigate, page, params } = useNav()
  const { convs } = useConversations()
  const { toggleSidebar } = useSidebar()
  const onHome = page === "chat" && !params.conversationId

  return (
    <Sidebar collapsible="offcanvas" className="font-[Geist,ui-sans-serif,system-ui,sans-serif] [&_[data-sidebar=sidebar]]:bg-[var(--nav-bg)]">
      <div className="flex h-full flex-col">
        {/* Header: the wordmark, and hide-the-sidebar */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--nav-line)] pr-4 pl-3.5">
          <button onClick={() => navigate("chat")} aria-label="Rival home" className="flex h-6 cursor-pointer items-center justify-center rounded-[4px] p-1.5 text-[var(--nav-active)]">
            <RivalWordmark className="h-[16.25px] w-[45px]" />
          </button>
          <button onClick={toggleSidebar} aria-label="Hide sidebar" title="Hide sidebar" className="flex size-6 cursor-pointer items-center justify-center rounded-[4px] p-1 text-[var(--nav-text)] transition-colors hover:bg-[var(--nav-hover)]">
            <CollapseIcon className="size-4" />
          </button>
        </div>

        <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3.5 py-1.5">
          <div className="flex w-full flex-col gap-6">
            <div className="flex w-full flex-col gap-1.5">
              <button onClick={() => navigate("chat")} className={cn(row, "drop-shadow-[0px_1px_0.5px_rgba(119,131,152,0.2)]")}>
                <AskRivalIcon className="size-4 shrink-0" /> Ask Rival
              </button>
              <button onClick={() => navigate("chat")} aria-current={onHome ? "page" : undefined} className={cn(row, onHome && cn(pill, "gap-1.5 pl-1.5"))}>
                <HomeIcon className="size-4 shrink-0" /> <span className="flex-1 truncate">Home</span>
              </button>
              <button onClick={() => navigate("waiting")} aria-current={page === "waiting" ? "page" : undefined} className={cn(row, page === "waiting" && cn(pill, "gap-1.5 pl-1.5"))}>
                <WaitingIcon className="size-4 shrink-0" /> <span className="flex-1 truncate">Waiting</span>
              </button>
            </div>

            {groups.map((g) => (
              <Group key={g.id} label={g.label} icon={g.icon} tint={g.tint}>
                {g.items.map((it) => <SubItem key={it.label} label={it.label} active={page === it.page} onClick={() => navigate(it.page)} />)}
              </Group>
            ))}

            <Group
              label="Chats"
              icon={ChatsIcon}
              action={
                <button onClick={() => navigate("chat")} aria-label="New chat" title="New chat" className="flex size-4 cursor-pointer items-center justify-center rounded-[4px] text-[var(--nav-text)] transition-colors hover:text-[var(--nav-active)]">
                  <PlusIcon className="size-4" />
                </button>
              }
            >
              {convs.map((c) => (
                <SubItem key={c.id} label={c.title} title={c.title} active={page === "chat" && params.conversationId === c.id} onClick={() => navigate("chat", { conversationId: c.id })} />
              ))}
            </Group>
          </div>
        </nav>

        <div className="flex shrink-0 flex-col gap-1.5 p-1.5">
          <button onClick={() => navigate("connectors")} aria-current={page === "connectors" ? "page" : undefined} className={cn(row, page === "connectors" && cn(pill, "gap-1.5 pl-1.5"))}>
            <ConnectorsIcon className="size-4 shrink-0" /> <span className="flex-1 truncate">Connectors</span>
          </button>
          <button onClick={() => navigate("settings")} aria-current={page === "settings" ? "page" : undefined} className={cn(row, page === "settings" && cn(pill, "gap-1.5 pl-1.5"))}>
            <SettingsIcon className="size-4 shrink-0" /> <span className="flex-1 truncate">Settings</span>
          </button>
          {/* The workspace switcher (static in the demo) */}
          <button className="flex h-10 w-full cursor-pointer items-center gap-1.5 rounded-[6px] px-1.5 py-1 text-left text-[14px] leading-4 transition-colors hover:bg-[var(--nav-hover)]">
            <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[6px] border border-[var(--nav-line)] bg-[var(--nav-pill)] text-[var(--nav-active)] shadow-[0px_1px_1px_0px_rgba(119,131,152,0.2)]">
              <RivalMark className="size-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[var(--nav-strong)]">Rival</span>
              <span className="block truncate text-[var(--nav-muted)]">eden@rival.io</span>
            </span>
            <ExpandSimpleIcon className="size-3 shrink-0 text-[var(--nav-muted)]" />
          </button>
        </div>
      </div>
    </Sidebar>
  )
}
