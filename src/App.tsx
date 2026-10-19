import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { AskRivalIcon, BreadcrumbRobotIcon } from "@/components/nav-icons"
import { NewChatFab } from "@/components/new-chat-fab"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ConversationsProvider, useConversations } from "@/lib/conversations"
import { NavContext, useNav, type NavParams } from "@/lib/nav"
import { getSuperAgent } from "@/data/super-agents"
import { pages } from "@/pages"

// ponytail: state-based nav, no router. Add react-router if you need shareable URLs per page.
export default function App() {
  const [nav, setNav] = useState<{ page: string; params: NavParams }>({ page: "explorer", params: {} })
  const navigate = (page: string, params: NavParams = {}) => setNav({ page, params })

  return (
    <NavContext.Provider value={{ navigate, page: nav.page, params: nav.params }}>
    <ConversationsProvider>
    <TooltipProvider>
      <SidebarProvider className="overflow-x-clip" style={{ "--sidebar-width": "12.25rem" } as React.CSSProperties}>
        <AppSidebar />
        <Shell page={nav.page} />
      </SidebarProvider>
    </TooltipProvider>
    </ConversationsProvider>
    </NavContext.Provider>
  )
}

function Shell({ page: pageId }: { page: string }) {
  const { convs } = useConversations()
  const page = pages.find((p) => p.id === pageId) ?? pages[0]
  const { navigate, params } = useNav()
  // Chat shows the open conversation's title, like Claude / ChatGPT
  const title = page.id === "chat" ? convs.find((c) => c.id === params.conversationId)?.title ?? "New chat"
    : page.id === "clone" ? `Customize ${getSuperAgent(params.templateId)?.name ?? "agent"}`
    : page.title
  const full = page.id === "explorer"
  return (
    <>
      <SidebarInset className="relative min-w-0 bg-white font-[Geist,ui-sans-serif,system-ui,sans-serif]">
        {/* The top bar from the frame: h 48, px 16 · py 12, a #ECEBE9 line under it, the breadcrumb (robot 16 · gap 6 · Geist 12/16 #121212) */}
        <header className="flex h-12 w-full shrink-0 items-center justify-between border-b border-[#ecebe9] px-4 py-3">
          <div className="flex items-center gap-1.5">
            <BreadcrumbRobotIcon className="size-4 shrink-0" />
            <p className="max-w-[7.5rem] overflow-hidden text-[0.75rem] leading-4 text-ellipsis whitespace-nowrap text-[#121212]">{title}</p>
          </div>
          {/* Ask Rival: a new chat, as a secondary button (white, hairline edge, the sidebar's soft drop shadow) */}
          <button onClick={() => navigate("chat")} className="flex h-6 cursor-pointer items-center gap-1.5 rounded-[0.25rem] border border-[#ecebe9] bg-white pr-2 pl-1.5 text-[0.75rem] leading-4 whitespace-nowrap text-[#121212] drop-shadow-[0px_1px_0.5px_rgba(119,131,152,0.2)] transition-colors hover:border-[#dddcda] hover:bg-[#fcfcfa]">
            <AskRivalIcon className="size-3.5 shrink-0 text-[#6c6a68]" />
            Ask Rival
          </button>
        </header>
        <main className={full ? "flex flex-1 flex-col" : "flex flex-1 flex-col overflow-auto p-6"}>
          <page.component />
        </main>
      </SidebarInset>
      {!page.hideFab && <NewChatFab onClick={() => navigate("chat")} />}
    </>
  )
}
