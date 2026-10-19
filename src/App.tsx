import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { HeaderToolbar } from "@/components/header-toolbar"
import { NewChatFab } from "@/components/new-chat-fab"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ConversationsProvider, useConversations } from "@/lib/conversations"
import { NavContext, useNav, type NavParams } from "@/lib/nav"
import { getSuperAgent } from "@/data/super-agents"
import { pages } from "@/pages"

// ponytail: state-based nav, no router. Add react-router if you need shareable URLs per page.
export default function App() {
  const [nav, setNav] = useState<{ page: string; params: NavParams }>({ page: pages[0].id, params: {} })
  const navigate = (page: string, params: NavParams = {}) => setNav({ page, params })

  return (
    <NavContext.Provider value={{ navigate, page: nav.page, params: nav.params }}>
    <ConversationsProvider>
    <TooltipProvider>
      <SidebarProvider style={{ "--sidebar-width": "180px" } as React.CSSProperties}>
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
  return (
    <>
      <SidebarInset>
        <HeaderToolbar title={title} />
        <main className="flex flex-1 flex-col overflow-auto p-6">
          <page.component />
        </main>
      </SidebarInset>
      {!page.hideFab && <NewChatFab onClick={() => navigate("chat")} />}
    </>
  )
}
