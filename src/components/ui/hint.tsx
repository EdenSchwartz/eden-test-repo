import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

// A small name-on-hover for an icon or logo that has no visible label (context logos, short capability names).
// Shows under the element by default.
export function Hint({ label, side = "bottom", children }: { label: string; side?: "top" | "bottom" | "left" | "right"; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  )
}
