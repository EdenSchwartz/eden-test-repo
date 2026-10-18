
// The three steps to a first task, as one quiet line under the Tasks page's intro (pages/gallery.tsx, first visit)

const steps = ["Pick a template", "Make it yours in a short chat", "Let it run"]
export function StepsLine() {
  return (
    <ol className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      {steps.map((st, i) => (
        <li key={st} className="flex items-center gap-2">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-wash text-[11px] font-semibold text-blue tabular-nums">{i + 1}</span>
          {st}
        </li>
      ))}
    </ol>
  )
}
