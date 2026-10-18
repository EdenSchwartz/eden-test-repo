// Super agent conversations: who is running, and its pattern lit up by the latest run
function SuperAgentBar({ sa, messages, busy }: { sa: SuperAgent; messages: ChatMessage[]; busy: boolean }) {
  const last = messages.findLast((m) => m.role === "assistant")
  const statuses: Partial<Record<AgentKind, AgentStatus>> = {}
  for (const p of last?.parts ?? []) if (p.type === "agent") statuses[p.agent] = p.status
  return (
    <div className="flex items-center gap-3 border-b px-6 py-2.5">
      <SuperAgentOrb sa={sa} size="sm" />
      <div className="min-w-0 flex-1 text-sm">
        <span className="font-medium">{sa.name}</span>
        <span className="text-muted-foreground"> · Super agent{busy ? " · running its playbook" : ""}</span>
      </div>
      <PatternStrip pattern={sa.pattern} statuses={statuses} />
    </div>
  )
}
