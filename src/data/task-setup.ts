import type { AskQuestion } from "@/components/chat/question-card"
import type { SuperAgent } from "@/data/super-agents"

/*
 * Creating a task from a template is a conversation in three steps (pages/chat.tsx):
 *   1. Assets: which assets it runs on (free text, or one of these suggestions)
 *   2. Agents: review the workflow, keep it or customize it
 *   3. Trigger: manual, scheduled, or event (coming soon)
 * ponytail: steps 2 and 3 aren't built yet. The question card can show "Step 1 of 3 · Assets" (its progress prop);
 * left off for now, to bring back later.
 */

// Suggested answers, phrased the way you'd type them, from what Rival already knows about your environment
export const assetQuestion = (sa: SuperAgent): AskQuestion => ({
  id: "assets",
  title: "Which assets should the agent run on?",
  detail: `Pick one or describe them in your own words. You'll see what ${sa.name} finds before anything is saved, and you can change the scope anytime.`,
  options: [
    { label: "All production internet-facing assets", hint: "Anything in production that's reachable from the internet", recommended: true },
    { label: "Crown-jewel assets", hint: "Tagged tier-0: payments, auth and customer data" },
    { label: "Production cloud accounts", hint: "Everything in aws-prod and gcp-prod-main" },
    { label: "Code and dependencies", hint: "Repositories and packages scanned by GitHub and Snyk" },
  ],
  placeholder: "Describe the assets, e.g. “prod in EU, without test”",
})

// After Rival shows the task's agents (components/tasks/workflow-mini.tsx)
export const structureQuestion = (sa: SuperAgent): AskQuestion => ({
  id: "structure",
  title: "Do you want to customize the structure?",
  detail: `Either way, you can edit the structure anytime later.`,
  options: [
    { label: "Keep as is", hint: `Use these ${sa.pattern.flat().length} agents, as Rival set them up`, recommended: true },
    { label: "Customize", hint: "Turn agents on or off, and choose which steps need your approval" },
  ],
  placeholder: "Or tell me what to change",
})

// The last step: when it runs
export const triggerQuestion = (sa: SuperAgent): AskQuestion => ({
  id: "trigger",
  title: `When should ${sa.name} run?`, // Rival's message already says it can change later
  options: [
    { label: "Manually", hint: "Only when you run it, from My Agents or right here in the chat", recommended: true },
    { label: "Scheduled", hint: "On a schedule you describe in your own words", input: { placeholder: "e.g. Every Monday at 9 AM", action: "Set schedule" } },
    { label: "Event", hint: "When something happens, like a scanner reporting a new critical", disabled: true, badge: "Coming soon" },
  ],
  placeholder: "Or describe when it should run",
})

// ---------- Customizing a task's structure ----------
// Per agent: on or off, and whether its step runs on its own or waits for your approval

export type AgentSetting = { on: boolean; approval: boolean }
export type Structure = Record<string, AgentSetting> // by AgentKind

// As Rival sets it up: every agent on; only the step that acts outside Rival (filing tickets) waits for you
export const defaultStructure = (sa: SuperAgent): Structure =>
  Object.fromEntries(sa.pattern.flat().map((k) => [k, { on: true, approval: k === "reporting" || k === "remediation" }]))

// The workflow with the agents you turned off taken out (a step left empty disappears)
export const applyStructure = (sa: SuperAgent, s?: Structure) =>
  s ? sa.pattern.map((stage) => stage.filter((k) => s[k]?.on !== false)).filter((stage) => stage.length) : sa.pattern

// What changed, in your words (posted as your message when you save)
export function describeChanges(sa: SuperAgent, s: Structure, names: Record<string, string>) {
  const base = defaultStructure(sa)
  const out: string[] = []
  for (const k of sa.pattern.flat()) {
    const name = names[k]
    if (!s[k].on) { if (base[k].on) out.push(`turn off ${name}`); continue }
    if (s[k].approval !== base[k].approval) out.push(s[k].approval ? `${name} needs my approval` : `${name} runs on its own`)
  }
  if (!out.length) return "Keep it as is"
  const text = out.length > 1 ? `${out.slice(0, -1).join(", ")} and ${out.at(-1)}` : out[0]
  return text.charAt(0).toUpperCase() + text.slice(1)
}
