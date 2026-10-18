import { createContext, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import { conversationStore, type Conversation, type RunKind } from "@/data/conversations"
import type { SuperAgent } from "@/data/super-agents"
import { playAgentRun } from "@/lib/run"

// All conversations, app-wide: the sidebar's Recents list and the chat page read the same state,
// and a run keeps streaming into it even after you navigate away.
const ConversationsContext = createContext<{
  convs: Conversation[]
  setConvs: Dispatch<SetStateAction<Conversation[]>>
}>({ convs: [], setConvs: () => {} })

export function ConversationsProvider({ children }: { children: ReactNode }) {
  const [convs, setConvs] = useState(conversationStore.current)
  // Keep the module store in sync: the AI Agents log reads runs from it
  useEffect(() => { conversationStore.current = convs }, [convs])
  return <ConversationsContext.Provider value={{ convs, setConvs }}>{children}</ConversationsContext.Provider>
}

export const useConversations = () => useContext(ConversationsContext)

// Start a super agent run as its own conversation and stream it in the background (lib/run.ts).
// Returns the conversation id (to open it, or show it inline) and a promise that settles when the run is done.
// Every run lives in Recents and in its agent's Schedule tab (components/super-agent-panel.tsx), so you can always go back to it.
export function useStartRun() {
  const { setConvs } = useConversations()
  return (sa: SuperAgent, prompt: string, kind: RunKind = "manual") => {
    const id = crypto.randomUUID()
    const replyId = crypto.randomUUID()
    setConvs((cs) => [{
      id, title: prompt.slice(0, 48), updatedAt: new Date(), superAgentId: sa.id, run: { kind },
      messages: [
        { id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text: prompt }] },
        { id: replyId, role: "assistant", parts: [] },
      ],
    }, ...cs])
    const done = playAgentRun(sa, (fn) => setConvs((cs) => cs.map((c) => c.id !== id ? c : {
      ...c, messages: c.messages.map((m) => (m.id === replyId ? { ...m, parts: fn(m.parts) } : m)),
    })))
    return { id, done }
  }
}
