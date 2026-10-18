import type { Part } from "@/data/conversations"
import type { SuperAgent } from "@/data/super-agents"

// Plays an agent's canned run into a reply, step by step (fake streaming). Used by the chat page and by the clone
// conversation (pages/clone.tsx), so a run looks the same wherever it happens.
// update mutates the reply's parts. Sub-agents in a stage run in parallel; the orchestrator's handoff reasoning sits between stages.

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
type AgentPart = Extract<Part, { type: "agent" }>
const running = <T extends { name: string; title: string; input: unknown }>(t: T): Part =>
  ({ type: "tool", name: t.name, title: t.title, state: "input-available", input: t.input })

export async function playAgentRun(sa: SuperAgent, update: (fn: (parts: Part[]) => Part[]) => void) {
  const { script } = sa
  const updateAgent = (agent: AgentPart["agent"], fn: (a: AgentPart) => AgentPart) =>
    update((p) => p.map((x) => (x.type === "agent" && x.agent === agent ? fn(x) : x)))
  const think = async (text: string, ms: number) => {
    update((p) => [...p, { type: "reasoning", text, streaming: true }])
    await wait(ms)
    update((p) => p.map((x, i) => (i === p.length - 1 && x.type === "reasoning" ? { ...x, streaming: false, duration: Math.max(1, Math.round(ms / 1000)) } : x)))
  }
  const streamText = async (text: string) => {
    update((p) => [...p, { type: "text", text: "" }])
    for (const word of text.split(/(?<= )/)) {
      await wait(25)
      update((p) => p.map((x, i) => (i === p.length - 1 && x.type === "text" ? { ...x, text: x.text + word } : x)))
    }
  }

  await wait(300)
  await think(script.plan, 1500)
  for (const [i, stage] of sa.pattern.entries()) {
    if (i > 0) { await wait(300); await think(script.handoffs[i - 1], 1000) }
    await wait(300)
    update((p) => [...p, ...stage.map((k): Part => ({
      type: "agent", agent: k, status: "running", activity: script.agents[k]!.activity, parts: [running(script.agents[k]!.tool)],
    }))])
    for (const [j, k] of stage.entries()) {
      const s = script.agents[k]!
      await wait(j === 0 ? 1600 : 700)
      updateAgent(k, (a) => ({
        ...a, status: "done", summary: s.summary, verdict: s.verdict, duration: 2 + i + j * 2,
        parts: [{ ...running(s.tool), state: "output-available", output: s.tool.output, result: s.tool.result } as Part],
      }))
    }
  }
  await wait(500)
  await streamText(script.text)
  if (script.approval) {
    await wait(300)
    update((p) => [...p, { type: "approval", ...script.approval! }])
  }
}
