import type { Conversation, Part } from "@/data/conversations"
import { cloneSuperAgent, type SuperAgent } from "@/data/super-agents"
import { agents } from "@/components/chat/agents"
import { applyStructure, defaultStructure, structureQuestion, triggerQuestion, type Structure } from "@/data/task-setup"

/*
 * Creating a task from a template, turn by turn (pages/chat.tsx; the questions are in data/task-setup.ts).
 * Rival answers with tool calls (the generic tool step in components/chat/parts.tsx), like an LLM would:
 *   Assets:  your answer → search_assets → "Found 321 assets" → "Is this the correct filter?" [Yes]
 *            anything but yes refines it → update_asset_filter → "Found 214 assets" → "Is this better?" [Yes]
 *            yes (or "you rock!") settles the scope.
 *   Now (the short path): Yes → the workflow → "Should I keep the flow as is for now?" [Yes]
 *            → create_task → the task card (components/tasks/task-card.tsx), "Needs approval" [Approve and create]
 *            → it's saved to My tasks (a copy of the template), the card says Created → [Run now | Open in Tasks].
 *            Run now runs it right here; Open in Tasks shows it on the Tasks page (pages/chat.tsx handles both).
 *   Later (kept below, not reached for now):
 *   Task:    "Let's review the process…" → get_task_workflow → the workflow, compact (components/tasks/workflow-mini.tsx)
 *            → "Do you want to customize the structure?" in the question card [Keep as is | Customize]
 *            Keep as is → "Great…"
 *            Customize → the screen splits: the chat on the left with the customize card (components/tasks/structure-card.tsx)
 *            in place of the chat box, a live preview of the workflow on the right. Save posts what changed;
 *            the split closes, Rival summarizes the new structure (update_task_workflow → the widget) → "Is this better?" [Yes]
 *            anything but yes opens Customize again.
 *   Trigger: "We're almost there…" → the question card [Manually | Scheduled (+ a text area) | Event (coming soon)]
 * ponytail: what Rival says after the trigger (adding the task to your library, Run now) comes next.
 */

export type SetupStage = "assets" | "confirm-assets" | "keep-flow" | "approve" | "agents" | "customizing" | "review-structure" | "trigger" | "done"
export type Setup = {
  stage: SetupStage
  assets?: number
  scope?: string // the assets, in your words ("All production internet-facing assets")
  structure?: Structure // the saved structure (none = as Rival set it up)
  draft?: Structure // while customizing: what the preview shows
  back?: SetupStage // where Cancel returns to
}
// What a setup turn can do to the conversation: add Rival's message, change it, or open / close the split
export type SetupIO = {
  reply: () => Update
  patch: (p: Partial<Conversation>) => void
  split: (open: boolean, p: Partial<Conversation>) => void
  mapParts: (fn: (p: Part) => Part) => void // change a part already in the conversation (e.g. the task card once it's created)
}

type Update = (fn: (parts: Part[]) => Part[]) => void

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

const isNo = (t: string) => /^\s*(no|nope|nah|not)\b/i.test(t)
const isYes = (t: string) =>
  !isNo(t) && /^\s*(y(es|ep|eah|up)?|correct|right|exactly|sure|ok(ay)?|perfect|great|good|looks good|👍)\b|\b(rock|awesome|amazing|perfect|nailed|love it)\b/i.test(t)

// What Rival read from your words, shown as the tool call's input
function filtersFrom(text: string) {
  const t = text.toLowerCase()
  const f: Record<string, string> = {}
  if (/\bprod/.test(t)) f.environment = "production"
  if (/internet|external|public/.test(t)) f.exposure = "internet-facing"
  if (/crown|tier-?0|critical/.test(t)) f.tags = "tier-0"
  if (/cloud|aws|gcp|azure/.test(t)) f.accounts = "aws-prod, gcp-prod-main"
  if (/code|repo|depend|package/.test(t)) f.type = "repository, package"
  return Object.keys(f).length ? f : { text }
}

// Plays Rival's next setup turn for your message. Returns once the turn is done.
export async function playSetupTurn(sa: SuperAgent, setup: Setup, text: string, { reply, patch, split, mapParts }: SetupIO) {
  // Scope confirmed: show the flow, ask to keep it as is for now
  if (setup.stage === "confirm-assets" && isYes(text)) {
    const update = reply()
    await wait(400)
    await stream(update, `Great, the scope is set: ${setup.assets} assets. This is how ${sa.name} works through them:`)
    await wait(300)
    update((p) => [...p, { type: "workflow", superAgentId: sa.id, scope: `${setup.assets} assets` }])
    await wait(500)
    await stream(update, "Should I keep the flow as is for now? You can change it anytime from My agents.")
    await wait(150)
    patch({ setup: { ...setup, stage: "keep-flow" }, replies: ["Yes"] })
    return
  }

  // Flow kept: put the task together and ask for your approval
  if (setup.stage === "keep-flow") {
    const update = reply()
    await wait(400)
    const tool: Extract<Part, { type: "tool" }> = {
      type: "tool", name: "create_agent", title: "Putting the agent together", state: "input-available",
      input: { template: sa.id, name: sa.name, assets: { count: setup.assets, filter: setup.scope }, workflow: "as is", trigger: "manual" },
    }
    update(() => [tool])
    await wait(1300)
    update(() => [{ ...tool, state: "output-available", title: `Ready to create ${sa.name}`, output: { status: "draft", needs: "your approval" } }])
    await wait(300)
    await stream(update, `Here's your agent. Approve it and I'll add **${sa.name}** to your agents.`)
    await wait(250)
    update((p) => [...p, { type: "task", superAgentId: sa.id, scope: setup.scope ?? "your assets", assets: setup.assets ?? 0 }])
    await wait(150)
    patch({ setup: { ...setup, stage: "approve" }, replies: ["Approve and create"] })
    return
  }

  // Approved: save it (a copy of the template in My tasks), mark the card created, offer to run it
  if (setup.stage === "approve") {
    const update = reply()
    await wait(400)
    if (!/approve|create|yes|ok|go|sure|👍/i.test(text)) {
      await stream(update, "No problem. Tell me what to change, or approve it when you're ready.")
      patch({ replies: ["Approve and create"] })
      return
    }
    const task = cloneSuperAgent(sa, {
      name: sa.name, trigger: { kind: "manual", label: "When you start it" },
      scope: { label: setup.scope ?? "Your assets", assets: setup.assets ?? 0 },
    })
    const tool: Extract<Part, { type: "tool" }> = {
      type: "tool", name: "save_agent", title: "Creating the agent", state: "input-available", input: { from: sa.id, name: task.name },
    }
    update(() => [tool])
    await wait(1100)
    update(() => [{ ...tool, state: "output-available", title: `Created ${task.name}`, output: { id: task.id, library: "My agents" } }])
    mapParts((x) => (x.type === "task" && x.superAgentId === sa.id && !x.created ? { ...x, superAgentId: task.id, created: true } : x))
    await wait(300)
    await stream(update, `Done! **${task.name}** is in My agents. Run it now, or open it there.`)
    await wait(150)
    // From here on the conversation is with your new task: Run now plays its run (pages/chat.tsx)
    patch({ setup: undefined, superAgentId: task.id, title: task.name, replies: ["Run now", "Open in My agents"] })
    return
  }

  // The trigger is chosen. ponytail: Rival's wrap-up (the task in your library, Run now) comes next
  if (setup.stage === "trigger" || setup.stage === "done") {
    patch({ setup: { ...setup, stage: "done" } })
    return
  }

  // Keep as is → on to the trigger. Customize (or any change in your own words) → the split with the live preview
  if (setup.stage === "agents" || (setup.stage === "review-structure" && !isYes(text))) {
    const keep = setup.stage === "agents" && /keep|as is|looks good|^\s*(no|nope)\b/i.test(text) && !/custom/i.test(text)
    const update = reply()
    await wait(400)
    if (keep) {
      await stream(update, "Great, we'll keep the structure as is.")
      await askTrigger(sa, setup, update, patch)
      return
    }
    await stream(update, setup.stage === "agents"
      ? "Sure. Turn agents on or off and choose which steps wait for your approval. The preview on the right shows the result as you go, and none of it is permanent: you can come back and change it anytime."
      : "Sure, let's adjust it. The preview is on the right.")
    await wait(300)
    split(true, { setup: { ...setup, stage: "customizing", draft: setup.structure ?? defaultStructure(sa), back: setup.stage } })
    return
  }

  // Saved (your changes came in as your message): close the split, then summarize the new structure
  if (setup.stage === "customizing") {
    const structure = setup.draft ?? defaultStructure(sa)
    split(false, { setup: { ...setup, stage: "review-structure", structure, draft: undefined } })
    const update = reply()
    await wait(500)
    await stream(update, "So let me summarize the new structure:")
    const pattern = applyStructure(sa, structure)
    const tool: Extract<Part, { type: "tool" }> = {
      type: "tool", name: "update_task_workflow", title: "Updating the workflow", state: "input-available",
      input: { template: sa.id, agents: Object.fromEntries(Object.entries(structure).map(([k, v]) => [k, v.on ? (v.approval ? "needs approval" : "automatic") : "off"])) },
    }
    await wait(300)
    update((p) => [...p, tool])
    await wait(1100)
    update((p) => [...p.slice(0, -1), {
      ...tool, state: "output-available", title: `Updated: ${pattern.flat().length} agents in ${pattern.length} steps`,
      output: { steps: pattern.map((stage, i) => ({ step: i + 1, agents: stage.map((k) => agents[k].name) })) },
    }])
    await wait(250)
    update((p) => [...p, { type: "workflow", superAgentId: sa.id, scope: `${setup.assets} assets`, structure }])
    await wait(350)
    await stream(update, "Is this better? You can still change it now, or anytime later.")
    await wait(150)
    patch({ replies: ["Yes"] })
    return
  }

  // The new structure is confirmed
  if (setup.stage === "review-structure") {
    const update = reply()
    await wait(400)
    await stream(update, "Great, the structure is set.")
    await askTrigger(sa, setup, update, patch)
    return
  }
  // (Later) Scope confirmed: on to the task itself, the agents that will run it. Unreachable for now: the short path above wins
  if (setup.stage === "confirm-assets" && isYes(text)) {
    const update = reply()
    await wait(400)
    await stream(update, `Great, let's review the ${sa.name} process we're going to create. These are the agents we're using:`)
    const tool: Extract<Part, { type: "tool" }> = {
      type: "tool", name: "get_task_workflow", title: `Loading the ${sa.name} workflow`, state: "input-available", input: { template: sa.id, assets: setup.assets },
    }
    await wait(300)
    update((p) => [...p, tool])
    await wait(1200)
    const agents = sa.pattern.flat()
    update((p) => [...p.slice(0, -1), {
      ...tool, state: "output-available", title: `Loaded ${agents.length} agents in ${sa.pattern.length} steps`,
      output: { steps: sa.pattern.map((stage, i) => ({ step: i + 1, agents: stage, parallel: stage.length > 1 })) },
    }])
    await wait(250)
    update((p) => [...p, { type: "workflow", superAgentId: sa.id, scope: `${setup.assets} assets` }])
    // Then the question, in place of the chat box
    await wait(500)
    patch({ setup: { stage: "agents", assets: setup.assets }, ask: { questions: [structureQuestion(sa)] } })
    return
  }

  const update = reply()
  const first = setup.stage === "assets"
  const before = setup.assets ?? 0
  const count = first ? 321 : Math.round(before * 0.667)
  const removed = before - count
  const testy = /test|staging|sandbox|dev\b/i.test(text)

  const tool: Extract<Part, { type: "tool" }> = first
    ? { type: "tool", name: "search_assets", title: "Searching assets", state: "input-available", input: { query: text, filters: filtersFrom(text) } }
    : {
        type: "tool", name: "update_asset_filter", title: "Updating assets", state: "input-available",
        input: { instruction: text, exclude: testy ? { tags: ["env:test", "env:staging"], name_contains: "test" } : { text } },
      }

  await wait(400)
  update(() => [tool])
  await wait(first ? 1800 : 1500)
  update(() => [{
    ...tool,
    state: "output-available",
    title: `Found ${count} assets`,
    output: first
      ? { total: count, by_type: { cloud_resources: 168, hosts: 81, web_apps: 47, apis: 25 }, sample: ["storefront-prod-1", "checkout-api", "acme-static-assets", "auth-gateway", "…"] }
      : { total: count, removed, ...(testy && before === 321 ? { removed_by: { "env:test": 61, "env:staging": 29, "name contains test": 17 } } : {}) },
  }])

  await wait(350)
  const answer = first
    ? `Found **${count} assets** matching “${text}”: 168 cloud resources, 81 hosts, 47 web apps and 25 APIs.\n\nIs this the correct filter?`
    : testy && before === 321
      ? `Down to **${count} assets**. I removed ${removed} test-related ones: tagged env:test or env:staging, or with “test” in the name.\n\nIs this better?`
      : `Down to **${count} assets**. I removed ${removed} that match “${text}”.\n\nIs this better?`
  await stream(update, answer)
  await wait(150)
  patch({ setup: { stage: "confirm-assets", assets: count, scope: first ? text : setup.scope }, replies: ["Yes"] })
}

// Rival's words, a few at a time, as a new text part
async function stream(update: Update, text: string) {
  update((p) => [...p, { type: "text", text: "" }])
  for (const word of text.split(/(?<= )/)) {
    await wait(25)
    update((p) => p.map((x, i) => (i === p.length - 1 && x.type === "text" ? { ...x, text: x.text + word } : x)))
  }
}

// Last step: when the task runs. Rival says so, then asks in the question card
async function askTrigger(sa: SuperAgent, setup: Setup, update: Update, patch: SetupIO["patch"]) {
  await wait(500)
  await stream(update, "We're almost there. We only need to decide when this agent should be triggered (you can always change this later).")
  await wait(400)
  patch({ setup: { ...setup, stage: "trigger" }, ask: { questions: [triggerQuestion(sa)] } })
}
