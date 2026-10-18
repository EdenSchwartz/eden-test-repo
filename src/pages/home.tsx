import { ConceptHome } from "@/components/home/concept-home"
import { getSuperAgent } from "@/data/super-agents"
import { useNav } from "@/lib/nav"

// The empty state of the chat page (pages/chat.tsx): chat on top, super agents marketplace below,
// profile side panel on click. Earlier concepts were removed once this direction was chosen.

// Each navigation gets a fresh params object, so "New chat" while already here still resets the page
const visits = new WeakMap<object, number>()
let visitCount = 0
const visitId = (params: object) => { if (!visits.has(params)) visits.set(params, ++visitCount); return visits.get(params) }

export default function HomePage() {
  const { params } = useNav()
  const initial = getSuperAgent(params.superAgentId) // picked from the sidebar
  return <ConceptHome key={visitId(params)} initial={initial} created={params.created} />
}
