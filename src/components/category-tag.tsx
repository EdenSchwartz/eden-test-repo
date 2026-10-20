import { cn } from "@/lib/utils"

/*
 * The agent categories. These five are the only ones, spelled exactly so; don't add, rename or merge.
 * Each has a Central Icons style icon (24 grid, 1.5 stroke). The drawings fill about 14px of a 20px icon.
 *   CategoryTag:  a soft grey tag, icon + name (the cards)
 *   CategoryList: icon + name, side by side (the drawers' properties)
 */
export const VM = "Vuln Management", APP = "Appsec", CLOUD = "CloudSec", THREATS = "Threats", GRC = "GRC"

const paths: Record<string, React.ReactNode> = {
  [APP]: <><rect x="3.75" y="3.75" width="16.5" height="16.5" rx="2.5" /><path d="M10 9.5 7.5 12l2.5 2.5M14 9.5l2.5 2.5-2.5 2.5" /></>,
  [VM]: <><path d="M9 8.25a3 3 0 0 1 6 0" /><rect x="7" y="8.25" width="10" height="12" rx="5" /><path d="M12 11.5v8.5M7 11.5 4.5 10.5M7 14.75H4.25M7 18l-2.5 1M17 11.5l2.5-1M17 14.75h2.75M17 18l2.5 1" /></>,
  [THREATS]: <><circle cx="12" cy="12" r="8.25" /><path d="M9 9.25a4.25 4.25 0 1 0 6 0" /><path d="M12 8v4" /></>,
  [CLOUD]: <path d="M7.25 18.25h9.5a4 4 0 0 0 .6-7.95 5.75 5.75 0 0 0-11.05 1.1 3.45 3.45 0 0 0 .95 6.85Z" />,
  [GRC]: <><path d="M12 20.25H7a2 2 0 0 1-2-2V5.75a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2V13" /><path d="m14.25 17.75 2 2 3.5-3.5" /></>,
}

export function CategoryIcon({ category, className }: { category: string; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={cn("size-5 shrink-0", className)}>
      {paths[category]}
    </svg>
  )
}

export function CategoryTag({ category }: { category: string }) {
  return (
    <span className="flex h-5 items-center gap-0.5 rounded-[0.25rem] bg-[#f7f7f8] pr-1 pl-0.5 text-[0.8125rem] leading-4 whitespace-nowrap text-[#a2a4a8]">
      <CategoryIcon category={category} />
      {category}
    </span>
  )
}

export function CategoryList({ categories }: { categories: string[] }) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {categories.map((c) => (
        <span key={c} className="flex items-center gap-1">
          <CategoryIcon category={c} className="-my-0.5 text-muted-foreground" />
          {c}
        </span>
      ))}
    </span>
  )
}
