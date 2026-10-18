import { Badge } from "@/components/ui/badge"
import type { Severity } from "@/data/findings"

const severityStyle: Record<Severity, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  low: "bg-sky-500/15 text-sky-400 border-sky-500/30",
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge variant="outline" className={`capitalize ${severityStyle[severity]}`}>{severity}</Badge>
}
