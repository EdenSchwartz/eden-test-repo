import { useState } from "react"
import { ShieldAlert } from "lucide-react"
import { CveDrawer } from "@/components/chat/cve-drawer"
import { SeverityBadge } from "@/components/severity-badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { findings, severities, sources, type Finding, type FindingStatus, type SourceTool } from "@/data/findings"
import { timeAgo } from "@/lib/time"
import { cn } from "@/lib/utils"

const statusLabels: Record<FindingStatus, string> = { open: "Open", "in-progress": "In remediation", resolved: "Resolved", ignored: "Ignored" }
const statusDot: Record<FindingStatus, string> = { open: "bg-foreground", "in-progress": "bg-amber-500", resolved: "bg-emerald-500", ignored: "bg-muted-foreground/40" }

function Status({ status }: { status: FindingStatus }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className={cn("size-1.5 rounded-full", statusDot[status])} />
      {statusLabels[status]}
    </span>
  )
}

const SourceChip = ({ tool }: { tool: SourceTool }) => (
  <span className="inline-flex h-6 items-center rounded-md border bg-muted/40 px-2 text-xs font-medium">{sources[tool].name}</span>
)

function FindingDrawer({ finding, onClose }: { finding: Finding | null; onClose: () => void }) {
  const [cveOpen, setCveOpen] = useState(false)
  if (!finding) return null
  const f = finding
  const rows: [string, React.ReactNode][] = [
    ["Source", <span className="flex items-center gap-2"><SourceChip tool={f.source} /> <span className="text-muted-foreground">{sources[f.source].category}</span></span>],
    ["Status", <Status status={f.status} />],
    ["Asset", <span className="font-mono">{f.asset}</span>],
    ["Location", <span className="font-mono break-all">{f.location}</span>],
    ...(f.pkg ? [["Package", <span className="font-mono">{f.pkg.name} {f.pkg.installed}{f.pkg.fixed && <span className="text-muted-foreground"> → fixed in {f.pkg.fixed}</span>}</span>] as [string, React.ReactNode]] : []),
    [f.cve ? "CVE" : "Rule", <span className="font-mono break-all">{f.ref}</span>],
    ["First seen", `${timeAgo(f.firstSeen)} ago`],
    ["Last seen", `${timeAgo(f.lastSeen)} ago`],
  ]

  return (
    <>
      <Sheet open onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full gap-0 sm:max-w-lg">
          <SheetHeader className="border-b pr-12">
            <div className="flex items-center gap-2">
              <SeverityBadge severity={f.severity} />
              <span className="font-mono text-xs text-muted-foreground">{f.id}</span>
            </div>
            <SheetTitle>{f.title}</SheetTitle>
            <SheetDescription>{f.description}</SheetDescription>
          </SheetHeader>
          <dl className="grid flex-1 grid-cols-[7rem_1fr] content-start gap-x-4 gap-y-3 overflow-y-auto p-4 text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="min-w-0">{value}</dd>
              </div>
            ))}
          </dl>
          {f.cve && (
            <SheetFooter className="border-t">
              <Button variant="outline" onClick={() => setCveOpen(true)}><ShieldAlert /> View CVE details</Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
      <CveDrawer id={cveOpen ? f.cve! : null} onClose={() => setCveOpen(false)} />
    </>
  )
}

const tools = Object.keys(sources) as SourceTool[]

export default function FindingsPage() {
  const [tool, setTool] = useState<SourceTool | "all">("all")
  const [selected, setSelected] = useState<Finding | null>(null)
  const visible = findings.filter((f) => tool === "all" || f.source === tool)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border p-0.5">
          {(["all", ...tools] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTool(t)}
              className={cn(
                "cursor-pointer rounded-md px-3 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground",
                tool === t && "bg-accent text-foreground",
              )}
            >
              {t === "all" ? "All sources" : sources[t].name}
              <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">
                {t === "all" ? findings.length : findings.filter((f) => f.source === t).length}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {severities.map((s) => {
            const n = visible.filter((f) => f.severity === s && f.status !== "resolved").length
            return n > 0 && <span key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground"><SeverityBadge severity={s} /> {n}</span>
          })}
        </div>
      </div>

      <div className="rounded-lg border">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Severity</TableHead>
              <TableHead>Finding</TableHead>
              <TableHead className="w-44">Source</TableHead>
              <TableHead className="w-60">Asset</TableHead>
              <TableHead className="w-36">Status</TableHead>
              <TableHead className="w-24 text-right">Last seen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((f) => (
              <TableRow key={f.id} className="cursor-pointer" onClick={() => setSelected(f)}>
                <TableCell><SeverityBadge severity={f.severity} /></TableCell>
                <TableCell>
                  <span className="block truncate font-medium">{f.title}</span>
                  <span className="block truncate font-mono text-xs text-muted-foreground">{f.ref}</span>
                </TableCell>
                <TableCell>
                  <span className="block"><SourceChip tool={f.source} /></span>
                  <span className="mt-1 block text-xs text-muted-foreground">{sources[f.source].category}</span>
                </TableCell>
                <TableCell className="truncate font-mono text-xs">{f.asset}</TableCell>
                <TableCell><Status status={f.status} /></TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">{timeAgo(f.lastSeen)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <FindingDrawer key={selected?.id} finding={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
