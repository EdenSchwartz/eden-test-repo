import { Activity, Bot, Boxes, Brain, CalendarClock, Compass, Copy, Gauge, Hand, MessageSquare, Plug, Scale, Settings, ShieldAlert, Waypoints } from "lucide-react"
import { ComingSoon } from "@/components/coming-soon"
import AgentsPage from "@/pages/agents"
import ChatPage from "@/pages/chat"
import ClonePage from "@/pages/clone"
import FindingsPage from "@/pages/findings"
import MyAgentsPage, { ExplorerPage } from "@/pages/gallery"
import MemoryPage from "@/pages/memory"
import ScheduledPage from "@/pages/scheduled"

// Pages in the sidebar's design (components/app-sidebar.tsx) that aren't built yet: a title and what it will be
const soon = (text: string) => () => <ComingSoon text={text} />

// Every page: id (what navigate() takes), title (shown in the top bar), and its component.
// Where each sits in the sidebar is set in components/app-sidebar.tsx (from the Figma Navbar), not here.
// hideFab: hide the floating "New conversation" button on that page.
export const pages = [
  { id: "chat", title: "New chat", icon: MessageSquare, component: ChatPage, hideFab: true },
  { id: "waiting", title: "Waiting", icon: Hand, component: soon("Everything waiting on you in one place: approvals, questions from your agents, and runs that need a hand."), hideFab: true },
  { id: "gallery", title: "My Agents", icon: Bot, component: MyAgentsPage, hideFab: true }, // your agents (pages/gallery.tsx)
  { id: "explorer", title: "Agent Library", icon: Compass, component: ExplorerPage, hideFab: true }, // Rival's templates to start from; Home's "Browse agent templates"
  { id: "agents", title: "Activity", icon: Activity, component: AgentsPage },
  { id: "scheduled", title: "Scheduled", icon: CalendarClock, component: ScheduledPage },
  { id: "memory", title: "Memory", icon: Brain, component: MemoryPage },
  { id: "policies", title: "Policies", icon: Scale, component: soon("The rules your agents follow: what they do on their own, and what needs your approval first."), hideFab: true },
  { id: "usage", title: "Usage", icon: Gauge, component: soon("How much your agents run, how long they take, and what it costs."), hideFab: true },
  { id: "findings", title: "Findings", icon: ShieldAlert, component: FindingsPage },
  { id: "entities", title: "Entities", icon: Waypoints, component: soon("The assets, identities, services and AI agents Rival knows about, and how they connect."), hideFab: true },
  { id: "packages", title: "Packages", icon: Boxes, component: soon("The open-source packages across your code, and the risk each one carries."), hideFab: true },
  { id: "connectors", title: "Connectors", icon: Plug, component: soon("The tools Rival connects to: scanners, clouds, code, identity and ticketing."), hideFab: true },
  { id: "settings", title: "Settings", icon: Settings, component: soon("Your workspace, members and preferences."), hideFab: true },
  // Customize a task template into your own task, or edit yours (the details panel's "Customize")
  { id: "clone", title: "Customize agent", icon: Copy, component: ClonePage, hideFab: true },
]
