import { useEffect, useState } from "react"
import { ArrowRight, Check, Play } from "lucide-react"
import { Conversation as Thread, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation"
import { Message, MessageContent } from "@/components/ai-elements/message"
import { ConversationInfo, InfoToggle } from "@/components/chat/conversation-info"
import {
  PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea, PromptInputTools,
} from "@/components/ai-elements/prompt-input"
import { CveDrawer } from "@/components/chat/cve-drawer"
import { AssistantParts, UserText } from "@/components/chat/parts"
import { QuestionCard, type AskAnswer } from "@/components/chat/question-card"
import { SuggestedQuestions } from "@/components/chat/suggested-questions"
import { configFor } from "@/data/clone-flow"
import { redTeamTranscript, scriptedReply, type Conversation, type Part } from "@/data/conversations"
import { getSuperAgent, type SuperAgent } from "@/data/super-agents"
import { assetQuestion, describeChanges, structureQuestion, type Structure } from "@/data/task-setup"
import { useConversations } from "@/lib/conversations"
import { useNav } from "@/lib/nav"
import { playAgentRun } from "@/lib/run"
import { playSetupTurn } from "@/lib/task-setup"
import { withTransition } from "@/lib/view-transition"
import { agents, type AgentKind } from "@/components/chat/agents"
import { SuperAgentOrb } from "@/components/super-agents"
import { StructureCard } from "@/components/tasks/structure-card"
import { WorkflowCanvas } from "@/components/tasks/workflow-canvas"
import { cn } from "@/lib/utils"
import HomePage from "@/pages/home"

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Nav params already turned into a conversation (guards StrictMode double effects and re-renders)
const startedFrom = new WeakSet<object>()

function Composer({ onSend, busy, autoFocus, placeholder = "Ask the security agent anything…" }: { onSend: (text: string) => void; busy?: boolean; autoFocus?: boolean; placeholder?: string }) {
  return (
    <PromptInput
      onSubmit={({ text }) => { if (text.trim() && !busy) onSend(text.trim()) }}
      className="[&_[data-slot=input-group]]:rounded-2xl [&_[data-slot=input-group]]:bg-card [&_[data-slot=input-group]]:shadow-xl [&_[data-slot=input-group]]:shadow-black/20"
    >
      <PromptInputTextarea autoFocus={autoFocus} placeholder={placeholder} />
      <PromptInputFooter>
        <PromptInputTools />
        <PromptInputSubmit status={busy ? "streaming" : undefined} disabled={busy} className="rounded-full" />
      </PromptInputFooter>
    </PromptInput>
  )
}

// The preview's width while customizing: yours to drag, remembered in this browser
const PREVIEW_KEY = "rival.preview-width"
const previewClamp = (w: number) => Math.round(Math.min(window.innerWidth * 0.62, Math.max(360, w)))
const previewDefault = () => previewClamp(window.innerWidth * 0.4)
function usePreviewWidth() {
  const [width, setWidth] = useState(() => {
    try { return previewClamp(Number(localStorage.getItem(PREVIEW_KEY)) || previewDefault()) } catch { return previewDefault() }
  })
  const set = (w: number) => {
    const v = previewClamp(w)
    setWidth(v)
    try { localStorage.setItem(PREVIEW_KEY, String(v)) } catch { /* private mode: just don't remember */ }
  }
  return [width, set] as const
}

// One page for chat: no conversation open = Home (the super agent concepts), otherwise the thread.
// New chat, Recents and pinned super agents live in the app sidebar.
// Conversation info open or closed: remembered in this browser
const INFO_KEY = "rival.info-open"

export default function ChatPage() {
  const { params, navigate } = useNav()
  const { convs, setConvs } = useConversations()
  const activeId = params.conversationId ?? null
  const [busyId, setBusyId] = useState<string | null>(null)
  const busy = busyId !== null && busyId === activeId
  const [cveId, setCveId] = useState<string | null>(null)
  const [infoOpen, setInfoOpen] = useState(() => { try { return localStorage.getItem(INFO_KEY) === "1" } catch { return false } })
  const toggleInfo = () => withTransition(() => setInfoOpen((o) => { try { localStorage.setItem(INFO_KEY, o ? "0" : "1") } catch { /* ok */ } return !o }))
  const active = convs.find((c) => c.id === activeId)
  const activeSa = getSuperAgent(active?.superAgentId)
  // Customizing a task's structure: the screen splits, the live preview on the right
  const customizing = active?.setup?.stage === "customizing" && !!activeSa
  const [focus, setFocus] = useState<AgentKind | undefined>()
  const [previewWidth, setPreviewWidth] = usePreviewWidth()

  // Started from Home: open a fresh conversation with that prompt (once per navigation)
  useEffect(() => {
    if (startedFrom.has(params)) return
    if (params.prompt) {
      startedFrom.add(params)
      send(params.prompt, getSuperAgent(params.superAgentId), true)
    }
    // Start chat (an agent's profile): a new conversation where the agent introduces itself and offers questions to ask
    const sa = params.startChat ? getSuperAgent(params.superAgentId) : undefined
    if (sa && !sa.custom) {
      startedFrom.add(params)
      createTask(sa)
    } else if (sa) {
      startedFrom.add(params)
      const id = crypto.randomUUID()
      // A task speaks as the workflow it is. Templates have "Finds what…" taglines; yours have an imperative mission ("Confirm which…")
      const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
      const intro = sa.custom
        ? `**${sa.name}** is ready, your agent based on ${getSuperAgent(sa.clonedFrom)?.name ?? "a Rival template"}. Its mission: ${lower(sa.tagline)}`
        : `**${sa.name}** is ready. This Rival agent ${lower(sa.tagline)} Its agents work through each step and report back.`
      const hello = `${intro}\n\nWhat do you want to look into? Ask me anything, or start with one of these:`
      setConvs((cs) => [{
        id, title: sa.name, updatedAt: new Date(), superAgentId: sa.id, suggestions: configFor(sa).asks,
        messages: [{ id: crypto.randomUUID(), role: "assistant", parts: [{ type: "text", text: hello }] }],
      }, ...cs])
      navigate("chat", { conversationId: id })
    }
  }, [params]) // eslint-disable-line react-hooks/exhaustive-deps

  // Use template: creating a task from it is a conversation. It opens with your ask, then the agent starts
  // setting it up, one turn at a time (data/task-setup.ts): assets in scope first, then the agents, then the trigger.
  // Each question shows in place of the chat box (components/chat/question-card.tsx).
  async function createTask(sa: SuperAgent) {
    const id = crypto.randomUUID()
    const replyId = crypto.randomUUID()
    const article = /^[aeiou]/i.test(sa.name) ? "an" : "a"
    const ask = `Let's create ${article} ${sa.name} agent`
    setConvs((cs) => [{
      id, title: `New ${sa.name} agent`, updatedAt: new Date(), superAgentId: sa.id, setup: { stage: "assets" },
      messages: [
        { id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text: ask }] },
        { id: replyId, role: "assistant", parts: [] },
      ],
    }, ...cs])
    navigate("chat", { conversationId: id })
    setBusyId(id)
    // Setting up an agent: open the info panel so its Setup card shows where you are (components/chat/conversation-info.tsx)
    setInfoOpen(true)
    try { localStorage.setItem(INFO_KEY, "1") } catch { /* ok */ }
    // Reassurance at the key moments (here, the start; then customizing and settling the structure, lib/task-setup.ts)
    const reply = "Great, let's start with the assets this agent should run on. Nothing here is final: you can edit any part of the agent later."
    await wait(700)
    let text = ""
    for (const word of reply.split(/(?<= )/)) {
      text += word
      const parts: Part[] = [{ type: "text", text }]
      setConvs((cs) => cs.map((c) => c.id !== id ? c : { ...c, messages: c.messages.map((m) => (m.id === replyId ? { ...m, parts } : m)) }))
      await wait(25)
    }
    await wait(250)
    setConvs((cs) => cs.map((c) => c.id !== id ? c : { ...c, ask: { questions: [assetQuestion(sa)] } }))
    setBusyId(null)
  }

  // An answer from the question card goes in as your message, as if you had typed it
  function answer(answers: Record<string, AskAnswer>) {
    // An option's text area reads as "Scheduled: every Monday at 9 AM"
    const text = Object.values(answers).map((a) => [...a.picked.map((p) => (a.detail?.trim() ? `${p}: ${a.detail.trim()}` : p)), a.custom.trim()].filter(Boolean).join(", ")).join("\n")
    setConvs((cs) => cs.map((c) => (c.id === activeId ? { ...c, ask: undefined } : c)))
    if (text) send(text)
  }
  const dismissAsk = () => setConvs((cs) => cs.map((c) => (c.id === activeId ? { ...c, ask: undefined } : c)))

  // Open / close the split. The workflow widget in the chat moves into the preview on the right (and back):
  // the latest widget and the preview share a view-transition name, one at a time.
  function split(open: boolean, change: () => void) {
    const mini = [...document.querySelectorAll<HTMLElement>("[data-workflow-mini]")].at(-1)
    const name = (v: string) => { if (mini) mini.style.viewTransitionName = v }
    withTransition(change, {
      before: () => { if (open) name("workflow-live") },
      after: () => name(open ? "" : "workflow-live"),
      done: () => name(""),
    })
  }
  // The customize card: edits show in the preview right away; Save posts what changed; Cancel goes back
  const setDraft = (draft: Structure) =>
    setConvs((cs) => cs.map((c) => (c.id === activeId && c.setup ? { ...c, setup: { ...c.setup, draft } } : c)))
  function saveStructure() {
    if (!active?.setup?.draft || !activeSa) return
    const names = Object.fromEntries(Object.entries(agents).map(([k, a]) => [k, a.name.replace(/ agent$/, "")]))
    send(describeChanges(activeSa, active.setup.draft, names))
  }
  function cancelStructure() {
    const s = active?.setup
    if (!s || !activeSa) return
    const back = s.back ?? "agents"
    split(false, () => setConvs((cs) => cs.map((c) => (c.id !== activeId ? c : {
      ...c, setup: { ...s, stage: back, draft: undefined },
      ...(back === "agents" ? { ask: { questions: [structureQuestion(activeSa)] } } : { replies: ["Yes"] }),
    }))))
  }

  async function send(text: string, superAgent?: SuperAgent, fresh = false) {
    const existingId = fresh ? null : activeId
    const sa = superAgent ?? getSuperAgent(convs.find((c) => c.id === existingId)?.superAgentId)
    const convId = existingId ?? crypto.randomUUID()
    const replyId = crypto.randomUUID()
    const userMsg = { id: crypto.randomUUID(), role: "user" as const, parts: [{ type: "text" as const, text }] }

    // Creating a task: Rival's next setup turn, with its tool calls (lib/task-setup.ts)
    const setup = existingId ? convs.find((c) => c.id === existingId)?.setup : undefined
    if (existingId && setup) {
      const patch = (p: Partial<Conversation>) => setConvs((cs) => cs.map((c) => (c.id === existingId ? { ...c, ...p } : c)))
      setConvs((cs) => cs.map((c) => (c.id === existingId ? { ...c, updatedAt: new Date(), replies: undefined, messages: [...c.messages, userMsg] } : c)))
      setBusyId(existingId)
      await playSetupTurn(sa!, setup, text, {
        reply: () => {
          setConvs((cs) => cs.map((c) => (c.id === existingId ? { ...c, messages: [...c.messages, { id: replyId, role: "assistant", parts: [] }] } : c)))
          return (fn: (parts: Part[]) => Part[]) => setConvs((cs) => cs.map((c) => c.id !== existingId ? c : {
            ...c, messages: c.messages.map((m) => (m.id === replyId ? { ...m, parts: fn(m.parts) } : m)),
          }))
        },
        patch,
        split: (open, p) => split(open, () => patch(p)),
        mapParts: (fn) => setConvs((cs) => cs.map((c) => c.id !== existingId ? c : {
          ...c, messages: c.messages.map((m) => ({ ...m, parts: m.parts.map(fn) })),
        })),
      })
      setBusyId(null)
      return
    }
    const reply = { id: replyId, role: "assistant" as const, parts: [] as Part[] }

    setConvs((cs) =>
      existingId
        ? cs.map((c) => (c.id === convId ? { ...c, updatedAt: new Date(), replies: undefined, messages: [...c.messages, userMsg, reply] } : c))
        : [{ id: convId, title: text.slice(0, 48), updatedAt: new Date(), messages: [userMsg, reply], superAgentId: sa?.id }, ...cs],
    )
    navigate("chat", { conversationId: convId })
    setBusyId(convId)

    // Fake streaming: mutate the reply's parts step by step
    const update = (fn: (parts: Part[]) => Part[]) =>
      setConvs((cs) => cs.map((c) => c.id !== convId ? c : {
        ...c, messages: c.messages.map((m) => (m.id === replyId ? { ...m, parts: fn(m.parts) } : m)),
      }))
    type AgentPart = Extract<Part, { type: "agent" }>
    const updateAgent = (agent: AgentPart["agent"], fn: (a: AgentPart) => AgentPart) =>
      update((p) => p.map((x) => (x.type === "agent" && x.agent === agent ? fn(x) : x)))
    const { intel, redTeam } = scriptedReply
    const running = <T extends { name: string; title: string; input: unknown }>(t: T): Part =>
      ({ type: "tool", name: t.name, title: t.title, state: "input-available", input: t.input })

    const streamText = async (text: string) => {
      update((p) => [...p, { type: "text", text: "" }])
      for (const word of text.split(/(?<= )/)) {
        await wait(25)
        update((p) => p.map((x, i) => (i === p.length - 1 && x.type === "text" ? { ...x, text: x.text + word } : x)))
      }
    }

    // An agent: play its playbook (lib/run.ts, shared with the clone conversation)
    if (sa) {
      await playAgentRun(sa, update)
      setBusyId(null)
      return
    }

    // 1. Orchestrator reasons
    await wait(300)
    update(() => [{ type: "reasoning", text: scriptedReply.reasoning, streaming: true }])
    await wait(1800)
    update((p) => [{ ...(p[0] as Extract<Part, { type: "reasoning" }>), streaming: false, duration: 2 }])

    // 2. Delegates to two helper agents in parallel
    await wait(300)
    update((p) => [
      ...p,
      { type: "agent", agent: "threat-intel", status: "running", activity: "Searching threat feeds…", parts: [running(intel.tool)] },
      { type: "agent", agent: "red-team", status: "running", task: redTeam.task, activity: "Spinning up staging replica…", parts: [] },
    ])
    await wait(1500)
    updateAgent("red-team", (a) => ({ ...a, activity: "Replaying attack payload (20 runs)…", parts: [running(redTeam.tool)] }))
    await wait(1300)
    updateAgent("threat-intel", (a) => ({
      ...a, status: "done", summary: intel.summary, verdict: intel.verdict, duration: 3,
      parts: [{ ...running(intel.tool), state: "output-available", output: intel.tool.output } as Part],
    }))
    await wait(1600)
    updateAgent("red-team", (a) => ({
      ...a, status: "done", summary: redTeam.summary, verdict: redTeam.verdict, duration: 4, transcript: redTeamTranscript,
      parts: [{ ...running(redTeam.tool), state: "output-available", output: redTeam.tool.output, result: redTeam.finding } as Part],
    }))

    // 3. Answers (results stay inside the agents that produced them)
    await wait(500)
    await streamText(scriptedReply.text)
    setBusyId(null)
  }

  return (
    // -m-6 cancels main's padding; fixed height so the thread (or Home) scrolls inside, not the page.
    // A focused, full-width conversation: no details panel beside it.
    <div className="relative -m-6 flex h-[calc(100svh-3.5rem)] [contain:inline-size]">
      {/* Conversation info's toggle (components/chat/conversation-info.tsx): pinned to the page's top-right corner,
          right above the floating cards when they're open */}
      {active && !customizing && (
        <div className="absolute top-3 right-4 z-20"><InfoToggle open={infoOpen} onClick={toggleInfo} /></div>
      )}
      {/* Customizing: the chat keeps most of the room, the preview gets a narrower column on the right */}
      {/* data-chat-thread: the Hex look gives the conversation a graph-paper canvas (src/looks/hex.css) */}
      <section data-chat-thread className={cn("relative flex min-w-0 flex-1 flex-col overflow-hidden", customizing && "border-r")}>
        {active ? (
          <>
            <Thread key={active.id} className="flex-1">
              <ConversationContent className="mx-auto w-full max-w-3xl gap-10 px-6 py-8">
                {active.messages.map((m, i) =>
                  m.role === "user" ? (
                    <Message key={m.id} from="user" className="rise-in">
                      <MessageContent className="rounded-2xl! px-4! py-2.5!">
                        <p>{m.parts.map((p, i) => p.type === "text" && <UserText key={i} text={p.text} onMention={setCveId} />)}</p>
                      </MessageContent>
                    </Message>
                  ) : (
                    <Message key={m.id} from="assistant">
                      <MessageContent className="w-full gap-4">
                        <AssistantParts parts={m.parts} />
                        {/* Start chat: the agent's questions stay under its greeting (disabled while it works) */}
                        {i === 0 && active.suggestions && (
                          <SuggestedQuestions title={`Ask ${activeSa?.name ?? "it"}`} items={active.suggestions} busy={busy} onAsk={(q) => send(q)} />
                        )}
                        {/* Quick replies (e.g. Yes) under Rival's last message; anything typed works too */}
                        {i === active.messages.length - 1 && active.replies && !busy && (
                          <div className="rise-in flex flex-wrap gap-2">
                            {active.replies.map((r) => (
                              <button
                                key={r}
                                // Open in Tasks goes to the Tasks page with your new task open; everything else is your reply
                                onClick={() => (r === "Open in My agents" ? navigate("gallery", { superAgentId: active.superAgentId }) : send(r))}
                                className={cn(
                                  "flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors",
                                  r === "Approve and create" || r === "Run now"
                                    ? "bg-primary text-primary-foreground hover:bg-primary/80"
                                    : "border bg-card hover:bg-accent",
                                )}
                              >
                                {(r === "Yes" || r === "Approve and create") && <Check className="size-3.5" />}
                                {r === "Run now" && <Play className="size-3.5" />}
                                {r}
                                {r === "Open in My agents" && <ArrowRight className="size-3.5" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </MessageContent>
                    </Message>
                  ),
                )}
              </ConversationContent>
              <ConversationScrollButton />
            </Thread>
            <div className="mx-auto w-full max-w-3xl px-6 pb-6">
              {/* A question waiting for an answer takes the chat box's place; Dismiss brings the chat box back */}
              {customizing && active.setup?.draft ? (
                <StructureCard
                  sa={activeSa!}
                  value={active.setup.draft}
                  onChange={setDraft}
                  onStep={setFocus}
                  onSave={saveStructure}
                  onCancel={cancelStructure}
                />
              ) : active.ask ? (
                <QuestionCard
                  key={active.ask.questions.map((q) => q.id).join()}
                  questions={active.ask.questions}
                  progress={active.ask.progress}
                  hue={activeSa?.hue}
                  onSubmit={answer}
                  onDismiss={dismissAsk}
                />
              ) : (
                <Composer onSend={send} busy={busy} autoFocus placeholder={active.replies && active.setup ? "Or tell me what to change…" : active.setup ? "Reply to Rival…" : activeSa ? `Follow up with ${activeSa.name}…` : undefined} />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto px-6">
            <HomePage />
          </div>
        )}
      </section>

      {active && infoOpen && !customizing && (
        <div style={{ viewTransitionName: "conversation-info" }}>
          <ConversationInfo key={active.id} conv={active} onOpenCve={setCveId} />
        </div>
      )}

      {/* The live preview: the workflow, as you're changing it */}
      {customizing && activeSa && active?.setup?.draft && (
        <section aria-label="Preview" className="relative flex shrink-0 flex-col bg-background" style={{ width: previewWidth, viewTransitionName: "workflow-live" }}>
          {/* Drag the left edge to resize; double-click to reset */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize the preview"
            title="Drag to resize · double-click to reset"
            onDoubleClick={() => setPreviewWidth(previewDefault())}
            onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId) }}
            onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) setPreviewWidth(window.innerWidth - e.clientX) }}
            className="group/resize absolute inset-y-0 -left-1 z-10 flex w-2 cursor-col-resize touch-none items-center justify-center"
          >
            <span className="h-10 w-1 rounded-full bg-foreground/0 transition-colors group-hover/resize:bg-foreground/30 group-active/resize:bg-foreground/50" />
          </div>
          <div className="flex shrink-0 items-center gap-2.5 border-b px-5 py-3">
            <SuperAgentOrb sa={activeSa} size="sm" className="size-6 rounded-md [&_svg]:size-3.5" />
            <span className="text-sm font-medium">{activeSa.name}</span>
            <span className="rounded-md border px-1.5 text-xs leading-5 text-muted-foreground">Preview</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {Object.values(active.setup.draft).filter((a) => a.on).length} of {activeSa.pattern.flat().length} agents enabled
              {active.setup.assets ? ` · ${active.setup.assets} assets` : ""}
            </span>
          </div>
          <div className="min-h-0 flex-1">
            <WorkflowCanvas sa={activeSa} structure={active.setup.draft} focus={focus} />
          </div>
        </section>
      )}
      <CveDrawer id={cveId} onClose={() => setCveId(null)} />
    </div>
  )
}
