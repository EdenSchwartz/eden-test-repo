import { createContext, useContext } from "react"

// Cross-page navigation, e.g. "open this conversation" from the AI Agents table.
// prompt (+ superAgentId) = start a new conversation with this message, e.g. from Home.
// workflowId opens that workflow on Scheduled; runId opens that run on AI Agents; memoryId highlights it on Memory.
// templateId opens the guided clone chat for that super agent (pages/clone.tsx); created = just made by it (Home celebrates).
// startChat (+ superAgentId) = open a new conversation with that agent, which greets you with questions to ask.
export type NavParams = { conversationId?: string; prompt?: string; superAgentId?: string; startChat?: boolean; workflowId?: string; runId?: string; memoryId?: string; templateId?: string; created?: boolean }
export const NavContext = createContext<{ navigate: (page: string, params?: NavParams) => void; page: string; params: NavParams }>({
  navigate: () => {},
  page: "",
  params: {},
})
export const useNav = () => useContext(NavContext)
