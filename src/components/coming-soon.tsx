import { useNav } from "@/lib/nav"
import { pages } from "@/pages"

// A page from the sidebar's design that isn't built yet (pages.tsx): its title, what it will be, and a quiet note
export function ComingSoon({ text }: { text: string }) {
  const { page } = useNav()
  const title = pages.find((p) => p.id === page)?.title ?? ""
  return (
    <div className="mx-auto w-full max-w-[55.5rem] space-y-2 pt-2">
      <div className="flex items-center gap-2.5">
        <h1 className="font-title text-[28px] leading-[1.08] tracking-[-0.01em] [--title-wght:450]">{title}</h1>
        <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">Coming soon</span>
      </div>
      <p className="max-w-xl text-sm text-muted-foreground">{text}</p>
    </div>
  )
}
