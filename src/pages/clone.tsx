import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowRight, CircleCheck, Copy, Info, PencilLine, SlidersHorizontal, Sparkles } from "lucide-react"
import { Conversation as Thread, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation"
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message"
import { Shimmer } from "@/components/ai-elements/shimmer"
import { AssistantParts } from "@/components/chat/parts"
import { StepHeader } from "@/components/chat/primitives"
import { SuggestedQuestions } from "@/components/chat/suggested-questions"
import { DraftPanel, type Flashes } from "@/components/clone/draft-panel"
import { RoundCard, type Answer, type Choice } from "@/components/clone/question-card"
import { Composer } from "@/components/home/composer"
import { AgentStack, SuperAgentOrb } from "@/components/super-agents"
import {
  DONE, applyMulti, briefFor, configFor, lc as lower, buildAgent, changedSections, diffFromTemplate, examples, initialDraft, interpret, nextRound,
  questions, rounds, scheduleLabel, sectionLabels, type Draft, type Slot,
} from "@/data/clone-flow"
import { cloneSuperAgent, getSuperAgent, superAgents, type SuperAgent } from "@/data/super-agents"
import { workflows } from "@/data/workflows"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useNav } from "@/lib/nav"
import { useConversations, useStartRun } from "@/lib/conversations"
import { cn } from "@/lib/utils"

/*
 * Clone a super agent through a guided chat: the step after "Clone this agent" in its profile panel.
 *   Chat:  Rival asks in rounds of up to 3 related questions, in a card docked on the chat box
 *          (components/clone/question-card.tsx). You answer the round, Rival reacts once, and the next round
 *          adapts to what you said. The chat box stays live: one reply in your own words can answer several questions.
 *   Right: the agent as it takes shape (components/clone/draft-panel.tsx). Changed sections glow.
 *   End:   a review of what's different from the template, then Create → it lands on Home, ready to run.
 * The questions and how answers are read live in data/clone-flow.ts.
 */

type Msg =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; text: string; thinking?: string; changed?: string[]; review?: boolean; created?: string; runId?: string } // runId = an agent run (its own conversation, shown inline)

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const sentence = (s: string) => { const t = s.trim(); const x = t.charAt(0).toUpperCase() + t.slice(1); return /[.!?]$/.test(x) ? x : `${x}.` }
const list = (xs: string[]) => xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`

export default function ClonePage() {
  const { params } = useNav()
  const target = getSuperAgent(params.templateId) ?? superAgents.find((s) => s.id === "patch-pilot")!
  // Customize on one of YOUR agents edits it here (never another copy); on a Rival template it makes your version
  const editing = target.custom ? target : undefined
  const sa = editing ? getSuperAgent(editing.clonedFrom) ?? target : target
  return <CloneChat key={target.id} sa={sa} editing={editing} />
}

function CloneChat({ sa, editing }: { sa: SuperAgent; editing?: SuperAgent }) {
  const { navigate } = useNav()
  const { convs } = useConversations()
  const startRun = useStartRun()
  const qs = useMemo(() => questions(sa), [sa])
  // Editing: start from its saved answers, all answered (straight to "what would you like to change?")
  const [draft, setDraftState] = useState<Draft>(() => editing ? { ...(editing.draft ?? initialDraft(sa)), name: editing.name, answered: questions(sa).map((q) => q.slot) } : initialDraft(sa))
  const draftRef = useRef(draft) // the async chat steps read the latest draft
  const setDraft = (d: Draft) => { draftRef.current = d; setDraftState(d) }
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [ask, setAsk] = useState<Slot[] | "review" | null>(null) // the open round; "review" at the end; null while Rival is typing
  const [choices, setChoices] = useState<Partial<Record<Slot, Choice>>>({}) // your answers, restored when a question is reopened
  const [flashes, setFlashes] = useState<Flashes>({})
  const [value, setValue] = useState("")
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<SuperAgent | null>(editing ?? null) // the saved agent: once you've created it, or the one you're editing
  const createdRef = useRef<SuperAgent | null>(editing ?? null)
  // Agent details panel: open by default where there's room for it beside the chat; the ⓘ button toggles it
  const [details, setDetails] = useState(() => window.innerWidth >= 1024)
  const round = Array.isArray(ask) ? ask.map((s) => qs.find((q) => q.slot === s)!) : []

  // Where the chat is, for the draft panel's stepper: 0 Basics, 1 Technical, 2 Guardrails (follow-ups too), 3 Review, 4 created.
  // It moves when the draft updates, so the stepper and the glowing sections change together.
  const roundIndex = (s: Slot) => Math.min(2, Math.max(0, rounds.findIndex((r) => r.slots.includes(s))))
  const upcoming = nextRound(qs, draft)
  const step = created ? 4 : Array.isArray(ask) && ask.length ? roundIndex(ask[0]) : upcoming ? Math.min(2, upcoming.index) : 3
  const stage = created ? "created" : Array.isArray(ask) ? "asking" : ask === "review" ? "review" : "busy"

  // Rival's turn in the chat: think, apply the draft change (so the panel glows in sync), type, then open `next`
  async function say(text: string, next: Slot[] | "review", opts: { changed?: string[]; apply?: () => void } = {}) {
    const changed = opts.changed?.length ? opts.changed : undefined
    const id = crypto.randomUUID()
    setMsgs((m) => [...m, { id, role: "assistant", text: "", thinking: changed ? "Updating the draft…" : "Thinking…" }])
    await wait(changed ? 900 : 600)
    opts.apply?.()
    if (changed) setFlashes((f) => Object.fromEntries([...Object.entries(f), ...changed.map((c) => [c, (f[c] ?? 0) + 1])]))
    setMsgs((m) => m.map((x) => (x.id === id ? { ...x, thinking: undefined, changed } : x)))
    await wait(changed ? 250 : 0)
    for (const word of text.split(/(?<= )/)) {
      await wait(14)
      setMsgs((m) => m.map((x) => (x.id === id && x.role === "assistant" ? { ...x, text: x.text + word } : x)))
    }
    // A review message carries the review card; once created, changes just get a short "Saved" reply
    setMsgs((m) => m.map((x) => (x.id === id ? { ...x, review: next === "review" && !createdRef.current } : x)))
    setAsk(next)
  }
  const roundOf = (d: Draft) => { const r = nextRound(qs, d); return r ? r.questions.map((q) => q.slot) : "review" as const }

  function review(d: Draft) {
    const diff = diffFromTemplate(sa, d)
    return `Here's **${d.name}**. Compared with Rival's ${sa.name}, yours:\n\n${diff.length ? diff.map((x) => `- ${x}`).join("\n") : "- Keeps Rival's playbook as is"}\n\nCreate it when you're ready, or tell me what to change.`
  }

  // Opening: what you're cloning and how this works; the first round opens in the card (once, StrictMode-safe)
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    // Editing one of yours: no questions; say what it does today and ask what to change (Change on any part of the draft works too)
    if (editing) {
      return void say(
        `Let's customize **${editing.name}**. Every change you make here saves to it.\n\n${review(draftRef.current).replace(/^Here's \*\*[^*]+\*\*\. Compared with Rival's [^,]+, yours:/, `Here's how it differs from Rival's ${sa.name} today:`).replace(/\n\nCreate it when you're ready, or tell me what to change\.$/, "")}\n\nWhat would you like to change? Tell me in your own words, or use **Change** on any part of it in the panel.`,
        "review",
      )
    }
    void say(
      `You're turning Rival's **${sa.name}** template into your own agent. The template stays exactly as it is; your agent is yours to shape.\n\nI'll ask a few short rounds of questions below. Pick an option, or answer in your own words. The draft updates after each round.\n\n${nextRound(qs, draftRef.current)?.intro ?? ""}`,
      roundOf(draftRef.current),
    )
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Your answers land in the chat; Rival reacts once, updates the draft, and opens the next round (or the review)
  async function commit(userText: string, next: Draft, filled: Slot[], notes: string[], asked: Slot[], typed = false) {
    const prev = draftRef.current
    const merged: Draft = { ...next, answered: [...new Set([...prev.answered, ...filled])] }
    setMsgs((m) => [...m, { id: crypto.randomUUID(), role: "user", text: userText }])
    setAsk(null)
    setValue("")
    await wait(250)

    // Your own words covered questions that weren't asked yet: say so, they won't come up
    // (only during a round: in the review or after creating, every question is fair game)
    const extra = asked.length ? [...new Set(filled.filter((s) => s !== "cadence" && !asked.includes(s) && !prev.answered.includes(s)).map((s) => sectionLabels[s].toLowerCase()))] : []
    const ack = [
      ...(typed && filled.length > 1 ? [`Got it: ${heard(filled, merged)}.`] : []),
      ...notes,
      ...(extra.length ? [`That also covers **${list(extra)}**, so I won't ask about ${extra.length > 1 ? "those" : "that"}.`] : []),
    ].filter(Boolean).join(" ")
    // Then lead into the next round by its topic, or wrap up with the review
    const nr = nextRound(qs, merged)
    // Already created: changes save straight to the agent (and its schedule) instead of going back to the review
    const agent = createdRef.current
    const saved = () => {
      if (!agent) return
      Object.assign(agent, buildAgent(sa, merged), { draft: merged })
      syncSchedule(agent, merged)
      setCreated({ ...agent })
    }
    const wrap = nr ? nr.intro : agent ? `Saved to **${merged.name}**. Anything else?` : review(merged)
    await say([ack, wrap].filter(Boolean).join("\n\n"), roundOf(merged), { changed: changedSections(prev, merged), apply: () => { setDraft(merged); if (!nr) saved() } })
  }

  // A typed reply, played back in plain words so it visibly landed: "every weekday, hands-off permissions, reaching you via …"
  const heard = (filled: Slot[], d: Draft) => [
    filled.includes("scope") && list(d.scope.map(lower)),
    (filled.includes("trigger") || filled.includes("cadence")) && d.trigger && (d.trigger.kind === "manual" ? "on demand" : lower(d.trigger.label)),
    filled.includes("autonomy") && `${lower(d.autonomyLabel ?? "custom")} permissions`,
    filled.includes("escalation") && `reaching you via ${list(d.escalation.map(lower))}`,
    filled.includes("name") && `named ${d.name}`,
  ].filter(Boolean).join(", ")

  const defaultAck = (s: Slot, d: Draft) => ({
    scope: d.scope.length ? `Scoped to ${list(d.scope.map(lower))}.` : "No narrowing: it covers everything.",
    escalation: d.escalation.length ? `It'll reach you via ${list(d.escalation)}.` : "It'll keep everything inside Rival.",
    cadence: `Scheduled: ${d.trigger?.label.toLowerCase()}.`,
  } as Partial<Record<Slot, string>>)[s] ?? ""

  // Submit a round: each answer is applied in order; your own words are read for this question and any other they answer.
  // Questions left unanswered keep Rival's default. In the chat, the round reads as one friendly prompt, not a form dump.
  function submitRound(answers: Partial<Record<Slot, Answer>>) {
    let d = draftRef.current
    const filled: Slot[] = []
    const notes: string[] = []
    const said: string[] = []
    const asked = round.map((q) => q.slot)
    for (const q of round) {
      const a = answers[q.slot]
      filled.push(q.slot)
      if (!a || a.skipped) { said.push(keep(q.slot, d)); continue }
      setChoices((c) => ({ ...c, [q.slot]: { sel: a.picked.map((o) => o.label), custom: a.custom, schedule: a.schedule } }))
      if (q.multi) {
        const labels = [...a.picked.map((o) => o.label), ...(a.custom ? [a.custom] : [])]
        d = { ...d, ...applyMulti(q.slot, d, labels) }
        notes.push(defaultAck(q.slot, d))
      } else if (a.schedule) {
        const label = scheduleLabel(a.schedule)
        d = { ...d, trigger: { kind: "schedule", label } }
        notes.push(`Scheduled: ${lower(label)}, your timezone.`)
      } else if (a.picked[0]) {
        d = { ...d, ...a.picked[0].apply(d) }
        notes.push(a.picked[0].note || defaultAck(q.slot, d))
      } else if (q.slot === "name") {
        d = { ...d, name: a.custom.replace(/[."]/g, "").trim() } // a name is just a name, never read for other answers
      } else {
        const r = interpret(sa, qs, d, q, a.custom, true)
        d = r.patch
        filled.push(...r.filled)
        notes.push(...r.notes)
      }
      said.push(phrase(q.slot, a, d))
    }
    void commit(said.filter(Boolean).join(" "), d, filled, notes, asked)
  }

  // How each answer reads in your prompt
  function phrase(s: Slot, a: Answer, d: Draft): string {
    const own = a.custom ? sentence(a.custom) : ""
    const pick = a.picked[0]?.label ?? ""
    switch (s) {
      case "name": return `Let's call it ${d.name}.`
      case "purpose": return `Its mission: ${own ? lower(own) : lower(d.purpose ?? sa.tagline)}`
      case "scope": return d.scope.length ? `Focus on ${list(d.scope.map(lower))}.` : "Cover everything, no narrowing."
      case "trigger": return d.trigger?.kind === "manual" ? "Only run it when I brief it." : d.trigger ? `Run it ${lower(d.trigger.label)}.` : own
      case "autonomy":
        if (own) return own
        if (pick.startsWith("Keep")) return "Keep Rival's usual permissions."
        if (pick.startsWith("Ask")) return "Check with me before you change anything."
        if (pick.startsWith("Let it")) return `You can ${pick.replace(/^Let it /, "")}.`
        return "You can act on your own."
      case "limits": return own || (pick === "No limits" ? "No guardrail needed." : `Just keep it to ${lower(pick)}.`)
      case "escalation": return d.escalation.length ? `When you need me, reach me via ${list(d.escalation)}.` : "Keep everything inside Rival."
      case "connect": return own || (pick.startsWith("Connect") ? `${pick.replace(/ now$/, "")}.` : "Skip connecting for now.")
      default: return own || `${pick}.`
    }
  }
  // A question you skipped (or left open), in your prompt
  const keep = (s: Slot, d: Draft) => ({
    name: `Keep the name ${d.name} for now.`,
    purpose: `Keep ${sa.name}'s mission.`,
    scope: "Cover everything, no narrowing.",
    trigger: "Only run it when I brief it.",
    autonomy: "Keep Rival's usual permissions.",
    escalation: "Keep everything inside Rival.",
  } as Partial<Record<Slot, string>>)[s] ?? ""

  // The chat box: during a round, your own words (read for every open question); in the review, changes or "create it"
  function send(text: string) {
    const d = draftRef.current
    if (Array.isArray(ask)) {
      const r = interpret(sa, qs, d, round[0], text)
      return void commit(text, r.patch, r.filled, r.notes, ask, true)
    }
    if (ask !== "review") return
    if (DONE.test(text)) {
      setMsgs((m) => [...m, { id: crypto.randomUUID(), role: "user", text }])
      setValue("")
      if (!createdRef.current) return void create()
      setAsk(null)
      return void say(`It's already saved as **${createdRef.current.name}**. Anything else you'd like to change?`, "review")
    }
    const r = interpret(sa, qs, d, undefined, text)
    if (r.filled.length === 0) {
      setMsgs((m) => [...m, { id: crypto.randomUUID(), role: "user", text }])
      setValue("")
      setAsk(null)
      return void say("I can change its mission, scope, schedule, permissions, escalation or name. Which one? You can also just say it, like *\"run it nightly instead\"*.", "review")
    }
    void commit(text, r.patch, r.filled, r.notes, [], true)
  }

  // Change (draft panel or review card): reopen that one question; its follow-ups are asked again if still relevant
  function reopen(s: Slot) {
    if (!ask || creating) return
    const followUps: Partial<Record<Slot, Slot[]>> = { trigger: ["cadence"], autonomy: ["limits"], escalation: ["connect"] }
    const d = draftRef.current
    setDraft({ ...d, answered: d.answered.filter((a) => a !== s && !followUps[s]?.includes(a)) })
    if (window.innerWidth < 1024) setDetails(false) // narrow: get the panel out of the way of the question
    setAsk([s])
  }

  // Dismiss: stop asking; whatever's unanswered keeps Rival's defaults, straight to the review
  function dismiss() {
    const done: Draft = { ...draftRef.current, answered: qs.map((q) => q.slot) }
    setAsk(null)
    void say(`No problem. I kept Rival's defaults for the rest.\n\n${review(done)}`, "review", { apply: () => setDraft(done) })
  }

  // Create: save the clone (and its schedule) and stay in the conversation. Rival confirms, with a way to Super agents;
  // anything you change in the chat afterwards saves to the created agent (see commit)
  async function create() {
    if (creating || createdRef.current) return
    setCreating(true)
    setAsk(null)
    const copy = cloneSuperAgent(sa, { ...buildAgent(sa, draftRef.current), draft: draftRef.current })
    syncSchedule(copy, draftRef.current)
    createdRef.current = copy
    // A scheduled agent goes live: its first run starts now (it shows up in its Schedule tab and Recents)
    const firstRun = copy.trigger && copy.trigger.kind !== "manual"
    if (firstRun) startRun(copy, copy.briefs[0], "scheduled")
    const id = crypto.randomUUID()
    setMsgs((m) => [...m, { id, role: "assistant", text: "", thinking: "Creating your agent…" }])
    await wait(1100)
    setCreated(copy)
    setCreating(false)
    setMsgs((m) => m.map((x) => (x.id === id ? { ...x, thinking: undefined, created: copy.id } : x)))
    setAsk("review")
  }

  // A created agent's schedule lives on Scheduled: add, update or remove its workflow to match the draft
  function syncSchedule(agent: SuperAgent, d: Draft) {
    const i = workflows.findIndex((w) => w.superAgentId === agent.id)
    if (!d.trigger || d.trigger.kind === "manual") { if (i >= 0) workflows.splice(i, 1); return }
    const w = {
      id: `wf_${agent.id}`, name: agent.name, description: agent.tagline, trigger: { kind: d.trigger.kind, label: d.trigger.label },
      nextRun: d.trigger.kind === "event" ? "On the next matching event" : "Tomorrow, 09:00", agents: agent.pattern.flat(),
      superAgentId: agent.id, createdBy: "You", enabled: true,
    }
    if (i >= 0) workflows.splice(i, 1, w)
    else workflows.unshift(w)
  }
  const openGallery = () => navigate("gallery", { superAgentId: createdRef.current?.id })
  // A suggested question: run the new agent on it right here, in this conversation (never a new chat: its context lives here)
  const [runningRun, setRunningRun] = useState(false)
  // The run is also saved as its own conversation (useStartRun), so it shows up in the agent's Schedule tab and Recents;
  // here it's shown inline, read live from that conversation.
  async function tryIt(q: string) {
    const agent = createdRef.current
    if (!agent || runningRun) return
    setRunningRun(true)
    setAsk(null)
    const run = startRun(agent, q, "asked")
    setMsgs((m) => [...m, { id: crypto.randomUUID(), role: "user", text: q }, { id: crypto.randomUUID(), role: "assistant", text: "", runId: run.id }])
    await run.done
    setRunningRun(false)
    setAsk("review")
  }
  const runParts = (runId: string) => convs.find((c) => c.id === runId)?.messages.findLast((m) => m.role === "assistant")?.parts ?? []

  const last = msgs.at(-1)
  const lastReview = msgs.findLast((m) => m.role === "assistant" && m.review) // its card stays, and shows Created once you have
  // The questionnaire stays docked until the review; then the chat box alone is for changes
  // (after creating, only a reopened question brings the card back; otherwise it's the chat box)
  const asking = !creating && (Array.isArray(ask) || (!created && ask !== "review" && !(ask === null && last?.role === "assistant" && last.review)))

  return (
    // -m-6 cancels main's padding; fixed height so the thread scrolls inside, like the chat page.
    // contain-inline-size: one-line (truncated) text inside must not widen the whole shell
    <div className="relative -m-6 flex h-[calc(100svh-3rem)] [contain:inline-size]" style={{ "--hue": sa.hue } as React.CSSProperties}>
      {/* With agent details open, the panel docks as a column on the right and the chat makes room (narrow screens: it overlays) */}
      <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <Thread className="flex-1">
          <ConversationContent className="mx-auto w-full max-w-2xl gap-8 px-6 py-8">
            <TemplateCard sa={sa} editing={editing} />
            {msgs.map((m) =>
              m.role === "user" ? (
                <Message key={m.id} from="user" className="rise-in">
                  <MessageContent className="rounded-2xl! px-4! py-2.5!"><p className="whitespace-pre-line">{m.text}</p></MessageContent>
                </Message>
              ) : (
                <Message key={m.id} from="assistant">
                  <MessageContent className="w-full gap-3">
                    {m.thinking && <Shimmer as="span" duration={1.2} className="text-sm">{m.thinking}</Shimmer>}
                    {m.changed && (
                      <div className="rise-in -my-1" style={{ "--delay": "0ms" } as React.CSSProperties}>
                        <StepHeader icon={PencilLine} label="Updated draft" meta={m.changed.join(" · ")} expandable={false} />
                      </div>
                    )}
                    {m.text && <MessageResponse>{m.text}</MessageResponse>}
                    {m.runId && <AssistantParts parts={runParts(m.runId)} />}
                    {m.created && created && (
                      <>
                        <CreatedNote name={created.name} firstRun={!!created.trigger && created.trigger.kind !== "manual"} onOpenGallery={openGallery} />
                        <SuggestedQuestions title={`Try ${created.name} on one of these`} items={configFor(sa).asks} busy={runningRun} onAsk={(q) => void tryIt(q.replace(/@(?=CVE-)/, ""))} />
                      </>
                    )}
                    {m === lastReview && (ask === "review" || created) && (
                      <ReviewCard sa={sa} draft={draft} creating={creating} created={!!created} onCreate={() => void create()} onEdit={reopen} onOpenGallery={openGallery} />
                    )}
                  </MessageContent>
                </Message>
              ),
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Thread>
        {/* Docked like Claude's clarifying questions: the round sits on top of the chat box, which stays live */}
        <div className="mx-auto w-full max-w-2xl space-y-2 px-6 pb-4">
          {asking && (round.length ? (
            <RoundCard
              key={`${round.map((q) => q.slot).join()}-${msgs.length}`}
              questions={round}
              draft={draft}
              initial={choices}
              onSubmit={submitRound}
              onDismiss={dismiss}
            />
          ) : (
            // Between rounds: Rival is updating the draft
            <div className="flex h-14 items-center rounded-2xl border bg-card px-5 shadow-xl shadow-black/20">
              <Shimmer as="span" duration={1.2} className="text-sm">{msgs.some((m) => m.role === "user") ? "Updating the draft…" : "Getting the questions ready…"}</Shimmer>
            </div>
          ))}
          <Composer
            key={asking ? "asking" : String(ask)}
            value={value}
            onChange={setValue}
            onSubmit={send}
            autoFocus={!asking} // while asking, keys go to the card (←→ ↑↓ ↵ 1–9)
            blocked={creating || (asking ? !round.length : ask !== "review")}
            rotating={ask === "review" ? (created ? ["Make it run nightly instead", "Also open a Jira ticket", "Ask me before every change"] : examples(sa, "review", draft)) : undefined}
            placeholder={asking ? "Or reply in your own words…" : "Rival is typing…"}
            footer={<span className="text-xs text-muted-foreground">{asking ? "One reply can answer several questions" : "Ask for changes, or say “create it”"}</span>}
          />
          {asking && round.length > 0 && (
            <p className="hidden items-center gap-1.5 px-1 text-xs text-muted-foreground sm:flex">
              <Kbd>←</Kbd><Kbd>→</Kbd> questions · <Kbd>↑</Kbd><Kbd>↓</Kbd> options · <Kbd>↵</Kbd> select · <Kbd>esc</Kbd> dismiss
            </p>
          )}
        </div>
      </section>

      {/* Agent details: ⓘ shows and hides the side panel, like a chat app's "Chat content" button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setDetails((o) => !o)}
            aria-label={details ? "Hide agent details" : "Agent details"}
            aria-expanded={details}
            className={cn(
              "absolute top-3 right-3 z-30 flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-accent hover:text-foreground",
              details ? "border bg-card/60 text-foreground backdrop-blur" : "text-muted-foreground",
            )}
          >
            <Info className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">{details ? "Hide agent details" : "Agent details"}</TooltipContent>
      </Tooltip>
      {details && (
        <aside
          aria-label="Agent details"
          className="absolute inset-y-0 right-0 z-20 flex w-[400px] max-w-full animate-in border-l bg-card duration-300 ease-snappy fade-in-0 slide-in-from-right-4 lg:static lg:bg-card/40 xl:w-[460px] 2xl:w-[520px]"
        >
          <DraftPanel
            sa={sa} draft={draft} flashes={flashes} stage={stage} asking={Array.isArray(ask) ? ask : []} step={step} created={created} creating={creating}
            onEdit={reopen} onCreate={() => void create()} onOpenGallery={openGallery} className="flex-1"
          />
        </aside>
      )}
    </div>
  )
}

// Where this starts: the Rival template you're making a copy of, or your own agent you're editing
function TemplateCard({ sa, editing }: { sa: SuperAgent; editing?: SuperAgent }) {
  return (
    <div className="rise-in flex items-center gap-3 rounded-2xl border bg-card p-3 pr-4" style={{ "--hue": sa.hue } as React.CSSProperties}>
      <SuperAgentOrb sa={sa} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{editing?.name ?? sa.name}</p>
        <p className="truncate text-xs text-muted-foreground">{editing ? `Your agent · based on ${sa.name} · ${editing.tagline}` : `Agent template by Rival · ${sa.tagline}`}</p>
      </div>
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[oklch(0.6_0.14_var(--hue)/0.12)] px-2.5 py-1 text-xs font-medium text-[oklch(0.82_0.09_var(--hue))]">
        {editing ? <><SlidersHorizontal className="size-3" /> Customizing</> : <><Copy className="size-3" /> Cloning</>}
      </span>
    </div>
  )
}

// The end of the chat: the agent as it'll appear, its first brief, and Create
function ReviewCard({ sa, draft, creating, created, onCreate, onEdit, onOpenGallery }: {
  sa: SuperAgent; draft: Draft; creating: boolean; created: boolean; onCreate: () => void; onEdit: (s: Slot) => void; onOpenGallery: () => void
}) {
  return (
    <div className="rise-in overflow-hidden rounded-2xl border bg-card" style={{ "--hue": sa.hue } as React.CSSProperties}>
      <div
        className="flex items-center gap-3 px-4 py-4"
        style={{ background: `radial-gradient(ellipse at 100% 0%, oklch(0.6 0.14 ${sa.hue} / 0.3), transparent 60%)` }}
      >
        <SuperAgentOrb sa={sa} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Your agent · {sa.category} · from {sa.name}</p>
          <p className="truncate text-base font-semibold tracking-tight">{draft.name}</p>
        </div>
        <AgentStack kinds={draft.pattern.flat()} size="xs" />
      </div>
      <dl className="grid gap-x-6 gap-y-3 border-t px-4 py-3.5 text-sm sm:grid-cols-2">
        <Fact label="Runs" value={draft.trigger?.label ?? "On demand"} onEdit={() => onEdit("trigger")} />
        <Fact label="Escalates to" value={draft.escalation.length ? list(draft.escalation) : "In Rival only"} onEdit={() => onEdit("escalation")} />
        <Fact label="Asks you before" value={draft.autonomy.approval.length ? list(draft.autonomy.approval.map(lower)) : draft.limits && draft.limits !== "None" ? `Anything beyond: ${lower(draft.limits.replace(/\.$/, ""))}` : "Nothing"} onEdit={() => onEdit("autonomy")} />
        <Fact label="First brief" value={`“${briefFor(sa, draft)}”`} />
      </dl>
      <div className="flex flex-wrap items-center gap-2 border-t px-4 py-3">
        {created ? (
          <>
            <span className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-500/10 px-3 text-sm font-medium text-emerald-500">
              <CircleCheck className="size-4" /> Created
            </span>
            <button onClick={onOpenGallery} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent">
              Open in Tasks <ArrowRight className="size-3.5" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onCreate}
              disabled={creating}
              className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              <Sparkles className="size-4" /> {creating ? "Creating…" : `Create ${draft.name}`}
            </button>
            <span className="text-xs text-muted-foreground">Adds it to My Agents{draft.trigger && draft.trigger.kind !== "manual" ? " and Scheduled" : ""}. You can change it any time.</span>
          </>
        )}
      </div>
    </div>
  )
}

// Rival's confirmation after Create: you stay in the conversation, with a way to the gallery
function CreatedNote({ name, firstRun, onOpenGallery }: { name: string; firstRun: boolean; onOpenGallery: () => void }) {
  return (
    <div className="rise-in flex items-start gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3.5 text-sm leading-relaxed" style={{ "--delay": "0ms" } as React.CSSProperties}>
      <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
      <p>
        {/^my /i.test(name) ? "" : "Your "}<span className="font-semibold">{name}</span> was created successfully. You can always customize it right here in our conversation,
        or from the{" "}
        <button onClick={onOpenGallery} className="cursor-pointer font-medium underline decoration-foreground/30 underline-offset-2 transition-colors hover:decoration-foreground">
          Tasks
        </button>{" "}
        page.
        {firstRun && <> Its first scheduled run is starting now; you'll find it, and every run after it, under <span className="font-medium">Activity</span> in its profile.</>}
      </p>
    </div>
  )
}

function Fact({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
  return (
    <div className="group/fact min-w-0">
      <dt className="flex items-center gap-2 text-xs text-muted-foreground">
        {label}
        {onEdit && <button onClick={onEdit} className="cursor-pointer text-[11px] opacity-0 transition-opacity group-hover/fact:opacity-100 hover:text-foreground focus-visible:opacity-100">Change</button>}
      </dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  )
}

const Kbd = ({ children }: { children: string }) => (
  <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 font-sans text-[11px]">{children}</kbd>
)

