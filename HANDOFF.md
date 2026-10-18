# Rival demo 06: handoff

A copy of `rival-haness-demo-05` (frozen on 2026-10-18) that we keep iterating on. Run it with:

```
npm run dev -- --port 5178 --strictPort
```

Never modify `rival-haness-demo-05` (port 5177), `rival-haness-demo-04` (port 5176) or `rival-haness-demo-03` (port 5175): they are frozen saved versions.

## Checkpoints (local git, no GitHub)
demo-06 is a local git repo (nothing is pushed anywhere; the user doesn't use git, so Claude does it for them).
- **Save a checkpoint** ("save a checkpoint"): commit everything, then `git tag -a checkpoint-<short-name> -m "<what it is>"`.
- **List them**: `git tag -n`. **Look at / run an old one**: `git worktree add ../demo-06-<name> checkpoint-<name>` (a separate folder; copy or link `node_modules`), never rewrite history.
- **Go back for real**: ask the user first; then commit current work as its own checkpoint before restoring.
- Checkpoints so far: `checkpoint-info-panel` (Oct 18: outcomes, sources stack, floating info panel, sections closed).
  It's open as its own folder `../rival-haness-demo-06-checkpoint-info-panel` (a git worktree, `node_modules` linked to demo-06's) and runs with the `checkpoint-info-panel` launch config on **port 5179** (config is in both demo-06's and demo-05's `.claude/launch.json`, since the preview tool reads the session's original folder). Don't edit files there.
- Exploring UI: build variants side by side with a small in-demo variant switcher, pick one, delete the rest.

## Goal of this version
Mix what the real product's Agents page has (app.us1-dev.rival-internal.io/investigations/agents, read on 2026-10-18) into the demo:
- **Outcomes** on every agent: the results a run ends in, as chips (e.g. Exploitable · Not Exploitable · Unclear · Failed).
- **Runs on**: which finding/asset kinds it handles (CVE, SAST, Secret, Branch).
- **Capabilities** as small icons (meaning not read yet: names show on hover in the product).
- **Create in chat** as the way to make your own agent.
- Product's 10 built-in agents: Code CVE Exploitability, Cloud Exploitability, Code SAST Exploitability, Red Team Simulation, Finding Ownership, WAF Analysis, Remediation, Secret Validation, App Inventory, Deployment Mapping. They map roughly to the demo's sub agents.
- Product has no templates/explorer, multi-step agents, status, triggers, scope or run history: those stay from the demo.

## Done in demo-06
- **Outcomes** (`data/outcomes.ts`, chips in `components/tasks/outcomes.tsx`): a section under Description in the Overview tab (agents, by template id; clones use their template's) and under "What it does" in a sub agent's panel (exploitability, threat intel, red team, remediation, data leak, prioritization). Tones: risk red · clear blue · good green · warn amber · unclear grey · failed red ✕.
- **Sources in the panel metadata**: `SourceStack` in template-detail.tsx: overlapping monogram tiles in brand colors (no logo files), max 3 then "+N", not connected = faded + dashed; names/states on hover. A fuller Sources section (states, Connect) is planned later. To keep one row, your own agents drop **Created by** (always "You"; the card has the avatar): templates = Created by · Agents · Capabilities · Time per run · Sources; yours = Agents · Capabilities · Time per run · Scope · Trigger · Sources (~20px spare worst case, measured by width, not on screen).
- Conversation info's **toggle is pinned to the chat page's top-right corner** (pages/chat.tsx outer div), above the floating cards.
- **Scope and Trigger only on your own agents** (after cloning/configuring): a template's panel shows Created by · Agents · Capabilities · Time per run.

- **Conversation info** (`components/chat/conversation-info.tsx`, wired in pages/chat.tsx): an info button top right of a conversation opens a 20rem column of stacked cards, like agent harnesses' context panels. All read from the conversation: Agent (yours/template/Rival, status, open it), Context (rough token meter, scope, @CVE mentions → open the CVE drawer, assets/teams/repos touched, memories), Sub agents (status/verdict), Outputs (approvals waiting, agent created, findings), Sources (the agent's connectors, tools called; folded by default). Open/closed remembered in localStorage (`rival.info-open`); hidden while customizing. The cards **float** (no column edge, rounded-2xl + soft shadow, start under the toggle); no "Open in …" link. **Setup card** on top while configuring an agent: a 3-step stepper (Scope → Workflow → Review & create) with what's settled ("321 assets", "As the template"), pulsing ring on the current step, all checked once created; the panel opens by itself when a setup starts (createTask in pages/chat.tsx). No "who you're talking to" card (the user found it meaningless). With an agent, **Sub agents** lists its whole lineup ("Not run yet" until each runs here) and **Outputs** shows "Can end in" (its outcome chips) above "Produced here".

## Stack
- Vite, React 19, TypeScript, Tailwind v4, shadcn/ui, Vercel AI Elements, lucide-react.
- No router. Pages switch through `useNav()` (`navigate(page, params)`). The Tasks page id is `gallery`.
- Mock data lives in memory (a reload resets it). Conversations are in `lib/conversations.tsx`; tasks and templates in `data/super-agents.ts`.
- Checks: `npx tsc -b` and `npx oxlint` (the warnings in `pages/findings.tsx` are old).

## Visual language: Rival Harness
Everything now follows the reference demo `/Users/edenschwartz/Downloads/rival-harness-demo (1).html` (a single bundled file; open it in a browser to compare).
- Fonts: Mona Sans (text) and Hubot Sans (titles, `.font-title` with `[--title-wght:450]`), extracted to `public/fonts`, declared in `src/fonts.css`.
- Palette and tokens in `src/index.css`: blue-tinted neutrals, one blue accent (`--blue`, `--wash`, `--line`, `--hairline`, `--frost`, `--chip`, status washes). Utility classes like `bg-wash text-blue`, `border-hairline`, `bg-frost`.
- `.pressable` (index.css) = the reference's clickable card (hairline ring, soft hover).
- Sidebar (`components/app-sidebar.tsx`) uses the reference's exact item and label classes; header "Rival Harness / Demo".

## Where things are
- **Tasks page** `pages/gallery.tsx`:
  - First visit (no tasks of your own): title "Tasks", the intro, the three steps as one line (`StepsLine`, components/tasks/empty-state.tsx), a search, then the templates grouped by job with their one-line descriptions (same groups and cards as the catalog). One group per row (title, description, its cards). Tried and rejected: centering the text and cards, and groups side by side. Content stays left-aligned in a centered 3-card column. Tried and dropped: a big welcome card, a Category dropdown, a featured "good first task" card, job groups as soft blocks, and rows instead of cards.
  - Once you have a task: only your tasks, plus a **Browse templates** button in the header. It slides in the template catalog over the page (`← Back to my tasks`), with its own grid + panel (`Split` in gallery.tsx). The catalog groups templates by job (`jobs` + `grouped` in gallery.tsx) with the same cards as the first visit (an agent-icon strip was tried and dropped: the user wants one card style). Your task cards show their run status instead of "You" (`taskStatus` in `lib/task-status.ts`: Never run / Running / Needs you / Ran 2h ago, same logic as the panel's Schedule tab). Above them: "Search your tasks", a Status filter, and a Cards | List switch on the right (remembered in localStorage). List = `components/tasks/task-table.tsx`, Linear-style: one collapsible group per template ("mother") with your tasks made from it as rows (Task · Status · When it runs · Runs · Created). The old `components/super-agents-table.tsx` is unused (older style).
  - Cards `components/tasks/template-card.tsx`: blue-washed icon, name, a description of at most 2 lines (kept short in the copy), footer Rival/You · agents · ~time.
  - The panel is Docked (30rem). Floating (a card over the grid) and Wide (a 36rem split) still work in `Split`, but the temporary switch to compare them was removed; `layout` in gallery.tsx picks one.
- **Task panel** `components/tasks/template-detail.tsx`: icon + title, properties grid (Created by, Agents, Memory access, Time per run), tabs Overview | Skills (+ Schedule on your own tasks), Overview = Description, Prompt (blue-ruled quote), How it works. Use template at the bottom. Fits without scrolling at 1440×900.
  - How it works: a vertical timeline (Docked, Floating), or in Wide the zoomable flow chart `components/tasks/workflow-canvas.tsx` with `noRoles` (agents only, spreads out to fill the height).
- **Creating a task** (Use template → chat), script `lib/task-setup.ts`, wiring `pages/chat.tsx`:
  1. "Let's create a Triage Hunter task" → assets question (question card) → `search_assets` → "Is this the correct filter?" [Yes]
  2. → the workflow widget → "Should I keep the flow as is for now?" [Yes]
  3. → `create_task` → the task card `components/tasks/task-card.tsx` (Needs approval) [Approve and create]
  4. → `save_task`: a copy of the template goes to My tasks, the card says Created → [Run now | Open in Tasks]. Run now plays the run in the chat; Open in Tasks opens the Tasks page with it selected.
  - The older steps (customize the structure with a live preview, the trigger question) are still in the script but not reached for now.

## 2026-10-18: changes from the session with Yossi
- Copy: "Tasks" is now **Agents** everywhere (page, nav, chat setup: `create_agent`/`save_agent`, "Open in Agents"); "Memory access" → **Capabilities**; the panel's Schedule tab is labelled **Activity** (id still `schedule`). The sidebar "Scheduled" page is unchanged.
- Agents page: an **Agents | Sub agents** switch under the intro (`kindSwitch` in gallery.tsx). Sub agents = the 10 helpers in `components/chat/agents.ts`, cards + panel in `components/tasks/sub-agent-card.tsx` (status, Used in, Enabled, "Part of" list). Clicking an agent in "Part of" opens it in the same panel under a breadcrumb "← Sub agent › Agent" (`Crumbs` + `nestedId` in gallery.tsx); you stay on Sub agents, the crumb goes back. On the first visit (no agents of yours) sub agents look like templates: "Rival" in the footer, no status, no switch, no Status filter (`template` prop); the user found statuses there confusing.
- Templates are **one grid** now (no job sections; order = `order` in gallery.tsx), on the first visit and in the catalog.
- **Enabled switch** on your agents' and sub agents' cards (`components/tasks/enable-switch.tsx`, state in `lib/enabled.ts`, in memory). Off = card fades, chip says Stopped.
- **Status chip** top-right of the card (`components/tasks/status-chip.tsx`, CSS `.status-chip` in index.css): Running (bouncing bars + sweep), Needs you (waving hand + ping, card glows amber), Stopped (hatched, pause), Never run / Ready (dashed), Ran … (check draws in). Sub agent status = its latest agent part across chats (`subAgentStatus` in lib/task-status.ts).
- **Triggers** at the top of your agent's Activity tab (`components/tasks/triggers.tsx`, state + per-template defaults in `lib/triggers.ts`): On demand (always on), Schedule (how often, when, next run) and Event (event, from, only if), each of the last two with its own switch. The old "When it runs" box and its **Run now** button are gone: the panel's bottom button is the only action. `sa.trigger` (single, from the clone flow) still exists and only seeds which trigger starts on. Two looks, switched by `const look` at the top of triggers.tsx: **"sentence"** (current: compact rows, no On demand row, config as a sentence with neutral chips) and **"table"** (the earlier one: On demand + label/value box). The user picked "sentence" (2026-10-18); "table" stays as a fallback. By default the schedule is on and the event off, so both states show.
- **Explore | My Agents** tabs under the title once you have an agent (`tabs` in gallery.tsx, styled after ElevenLabs' Explore | My Voices: outlined pill + dark underline on the active one). Explore = templates and sub agents as plain cards; My Agents (default) = yours with statuses and switches. This **replaces the slide-in Browse templates catalog** (removed). Home's "Browse agent templates" opens Explore (`tab: "explore"` nav param).
- **My Agents cards**: Enabled switch top right; footer = status chip · "6 agents · ~8 min" (one line, no icons) · creator avatar (IB for you, Rival logo for sub agents) at the end. **Card footers must never wrap** (the user was firm): shorten or merge before letting anything break onto a second line.
- **Panel metadata** is ONE row of six (the user rejected two rows), panel widened to 35rem (the widest that keeps two cards beside it at 1440; 36rem drops to one). Short values, full text on hover: Scope (templates: "Prod assets", "Public assets"…; yours: "321 assets"), Trigger ("Mon · 09:00", "Daily · 07:00", "1st · 10:00", "On event", "Schedule + event"). Was: Created by (just You/Rival; "from …" is in the subtitle), Agents, Capabilities, Time per run, **Scope** (yours: "321 assets" from `sa.scope`, saved in lib/task-setup.ts, full filter on hover; templates: a typical scope from `templateScope`), **Trigger** (what's on in its triggers: "Mondays at 09:00", the event, "Schedule + event" or "On demand").
- **Show all runs**: a tertiary blue link right of "Runs" in the Activity tab → Agent activity (pages/agents.tsx) with `superAgentId`, filtered to the sub agent runs inside that agent's conversations, shown as a removable chip next to All | Conversations | Scheduled.
- **Two pages now** (one file, `pages/gallery.tsx`, a `Gallery` component with `mode`): **My agents** (`gallery`, default export) = your agents, statuses, Cards | List, Sub agents with statuses; none yet → empty state with "Open Agent explorer". **Agent explorer** (`explorer`, `ExplorerPage`, Compass icon) = Rival's templates + sub agents as templates, the three steps until you have an agent. The Explore | My Agents tabs are gone. Home's "Browse agent templates" → explorer; chat's "Open in My agents" → My agents.
- The Enabled switch moved off the cards into the panel header (`EnabledToggle` in template-detail.tsx, left of ✕, also on sub agents); the status chip is back top right on the card.
- The card is now a `div.pressable` with one stretched button (`CardShell` in template-card.tsx) so the switch can sit inside.

## Done: browsing templates as a place you visit (built 2026-10-15; not done yet: runs/month on catalog cards (no room in the footer), a featured card)
Agreed direction (option 4, with 1 and 3 inside it):
- Once you have tasks of your own, the Tasks page shows **only your tasks**. No templates there.
- In the header, a **Browse templates** button (not "New task": creating from scratch isn't allowed, only from a template).
  Optionally a quiet "Can't find what you're looking for? Browse templates" link under your tasks.
- Browse templates **slides in a full-height catalog over the Tasks page**, with "← Back to my tasks". Inside: the same card grid + side panel layout (don't break it).
- Inside the catalog, make templates feel different from your tasks:
  - **Grouped by the job** instead of the Category dropdown, e.g. *Cut the noise* (Triage Hunter, Patch Pilot), *Close exposure* (Exposure Hunter), *Secure your AI agents* (Injection Shield, Leak Sentinel, Red Team Drill), *Stay audit-ready* (Audit Ready).
  - Template cards **preview the workflow**: a small strip of the agents' icons in order (parallel ones stacked), maybe "342 runs this month".
  - Your own task cards stay plain or show status (e.g. "Never run", "Last run 2h ago").
- First visit (no tasks yet) stays as it is: the welcome card + templates.
- Later maybe: a featured "Most popular" wide card on top of the catalog.

## How the user likes to work
- Iterates visually and in small steps. Builds only what was asked, then asks before the next step.
- Don't copy reference screenshots literally, unless asked to "copy" something (then match it closely).
- **Never truncate text** (no `truncate`, `line-clamp`, ellipsis). Shorten the copy or let it wrap.
- Calm, reassuring copy. Minimal, readable, nothing hidden. Headers and body text at the same size; section labels small and muted.
