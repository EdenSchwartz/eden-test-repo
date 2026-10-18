import { House, MessageSquare, Plus, SquarePen } from "lucide-react"
import { SuperAgentOrb } from "@/components/super-agents"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupLabel, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarRail,
} from "@/components/ui/sidebar"
import { getSuperAgent } from "@/data/super-agents"
import { useConversations } from "@/lib/conversations"
import { useNav } from "@/lib/nav"
import { timeAgo } from "@/lib/time"
import { pages } from "@/pages"

const orbInMenu = "size-4 rounded-[4px] ring-0 [&_svg]:size-2.5"
// Rival Harness nav items (from the reference demo): soft text and icons; the active one is a white card with a blue icon
const item = "text-foreground/75 [&>svg]:text-foreground/40 hover:[&>svg]:text-blue data-[active=true]:bg-card data-[active=true]:text-foreground data-[active=true]:shadow-[0_1px_2px_rgba(16,24,40,0.06)] data-[active=true]:[&>svg]:text-blue data-[active=true]:hover:bg-card"
const label = "font-medium text-foreground/55"

// Three sections, so it's quick to find your way:
//   Platform  security (Findings)
//   Agents    everything agentic (Agent activity, Super agents, Scheduled, Memory)
//   Chats     your conversations, newest first; + starts a new one
// Settings sits at the bottom. Which page goes where is set in pages.tsx (section).
const sections = [
  { id: "platform", label: "Platform" },
  { id: "agents", label: "Agents" },
] as const

export function AppSidebar() {
  const { navigate, page, params } = useNav()
  const { convs } = useConversations()
  const onChat = page === "chat"
  const navItem = (p: (typeof pages)[number]) => (
    <SidebarMenuItem key={p.id}>
      <SidebarMenuButton tooltip={p.title} isActive={p.id === page} onClick={() => navigate(p.id)} className={item}>
        <p.icon />
        <span>{p.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="group-data-[collapsible=icon]:p-0!" onClick={() => navigate("chat")}>
              {/* Rival logo (public/rival-logo.png) on a blue-washed tile. shrink-0 keeps it square when the sidebar collapses to icons */}
              <span className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-wash">
                <img src="/rival-logo.png" alt="" className="h-4 w-auto" />
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="text-sm leading-normal font-semibold">Rival Harness</span>
                <span className="text-xs text-muted-foreground">Demo</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {/* The main action: always on top, also when collapsed to icons */}
          <SidebarMenuItem className="mt-3">
            <SidebarMenuButton tooltip="New chat" onClick={() => navigate("chat")} className={item}>
              <SquarePen />
              <span>New chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {/* Home: a placeholder for now. Never highlighted, and not clickable */}
          <SidebarMenuItem className="mt-1">
            <SidebarMenuButton tooltip="Home" aria-disabled="true" tabIndex={-1} className={`pointer-events-none ${item}`}>
              <House />
              <span>Home</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {sections.map((s) => (
          <SidebarGroup key={s.id}>
            <SidebarGroupLabel className={label}>{s.label}</SidebarGroupLabel>
            <SidebarMenu>{pages.filter((p) => "section" in p && p.section === s.id).map(navItem)}</SidebarMenu>
          </SidebarGroup>
        ))}

        {/* Chats: every conversation, plain chat or a super agent's, newest first */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className={label}>Chats</SidebarGroupLabel>
          <SidebarGroupAction title="New chat" aria-label="New chat" onClick={() => navigate("chat")} className="cursor-pointer">
            <Plus />
          </SidebarGroupAction>
          <SidebarMenu>
            {convs.map((c) => {
              const sa = getSuperAgent(c.superAgentId)
              return (
                <SidebarMenuItem key={c.id}>
                  <SidebarMenuButton
                    isActive={onChat && params.conversationId === c.id}
                    onClick={() => navigate("chat", { conversationId: c.id })}
                    className={`group/recent ${item}`}
                  >
                    <MessageSquare />
                    <span className="flex-1 truncate">{c.title}</span>
                    {/* Time on hover only, so it doesn't push the agent icon in from the edge */}
                    <span className="hidden shrink-0 text-xs text-muted-foreground group-hover/recent:inline">
                      {timeAgo(c.updatedAt)}
                    </span>
                    {/* Which super agent it's with: secondary, so it trails the title */}
                    {sa && <SuperAgentOrb sa={sa} size="sm" className={orbInMenu} />}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>{pages.filter((p) => "section" in p && p.section === "footer").map(navItem)}</SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
