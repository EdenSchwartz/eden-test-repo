import { Activity, Bot, Brain, CalendarClock, Compass, Copy, MessageSquare, Settings, ShieldAlert } from "lucide-react"
import AgentsPage from "@/pages/agents"
import ChatPage from "@/pages/chat"
import ClonePage from "@/pages/clone"
import FindingsPage from "@/pages/findings"
import MyAgentsPage, { ExplorerPage } from "@/pages/gallery"
import MemoryPage from "@/pages/memory"
import ScheduledPage from "@/pages/scheduled"

const Placeholder = () => <p className="text-muted-foreground">Nothing here yet.</p>

// Add/remove a page by adding/removing a line here. It shows up in the sidebar automatically.
// hideFab: hide the floating "New conversation" button on that page.
// inNav: false = reached another way (chat: the sidebar's Chats section, Tasks).
// section: where it sits in the sidebar (components/app-sidebar.tsx): Platform = security, Agents = agentic, footer = bottom.
// Order within a section is the order here.
export const pages = [
  { id: "chat", title: "New chat", icon: MessageSquare, component: ChatPage, hideFab: true, inNav: false },
  { id: "findings", title: "Findings", icon: ShieldAlert, component: FindingsPage, section: "platform" },
  { id: "gallery", title: "My agents", icon: Bot, component: MyAgentsPage, hideFab: true, section: "agents" }, // your agents (pages/gallery.tsx)
  { id: "explorer", title: "Agent explorer", icon: Compass, component: ExplorerPage, hideFab: true, section: "agents" }, // Rival's templates to start from; Home's "Browse agent templates"
  { id: "agents", title: "Agent activity", icon: Activity, component: AgentsPage, section: "agents" },
  { id: "scheduled", title: "Scheduled", icon: CalendarClock, component: ScheduledPage, section: "agents" },
  { id: "memory", title: "Memory", icon: Brain, component: MemoryPage, section: "agents" },
  { id: "settings", title: "Settings", icon: Settings, component: Placeholder, hideFab: true, section: "footer" },
  // Customize a task template into your own task, or edit yours (the details panel's "Customize")
  { id: "clone", title: "Customize agent", icon: Copy, component: ClonePage, hideFab: true, inNav: false },
]
