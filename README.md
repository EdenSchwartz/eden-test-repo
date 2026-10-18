# Rival demo

High-fidelity design demo for Rival's AI security product: chat plus **super agents** (named teams of specialist agents running a playbook). All data is local mock data; there is no backend.

## Run it

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Where things live

- `src/pages.tsx`: the sidebar pages (add or remove a page with one line)
- `src/pages/chat.tsx`: the chat page. With no conversation open it shows Home (`src/pages/home.tsx`): chat plus the super agents marketplace
- `src/components/super-agent-panel.tsx`: a super agent's profile side panel (Overview, Skills, Scheduled, Activity, Start with)
- `src/components/super-agents.tsx`: super agent cards, workflow diagram, agent and app icons
- `src/pages/clone.tsx`: guided clone of a super agent ("Clone this agent" in its profile): a questionnaire docked in the chat box (`src/components/clone/question-card.tsx`) tailors your copy, with the live draft beside it (`src/components/clone/draft-panel.tsx`), ending in a review and Create
- `src/data/clone-flow.ts`: the clone chat's questions, per-template suggestions, free-text reading and the review
- `src/components/app-sidebar.tsx`: New chat, workspace pages, Recents
- `src/data/super-agents.ts`: the super agents (pattern, skills, apps, permissions, scripted runs, schedules, run history)
- `src/data/`: other mock data (conversations, findings, agent runs, CVEs)
- `src/components/chat/primitives.tsx`: the chat design system (Steps, Agent runs, Result cards) and its rules
- `src/components/ai-elements/`, `src/components/ui/`: AI Elements and shadcn/ui components, copied in so they can be restyled freely

Built with Vite, React, TypeScript, Tailwind, shadcn/ui and Vercel AI Elements.
