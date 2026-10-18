import { findings, severities } from "@/data/findings"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function OverviewPage() {
  const open = findings.filter((f) => f.status !== "resolved" && f.status !== "ignored")
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {severities.map((s) => (
        <Card key={s}>
          <CardHeader>
            <CardDescription className="capitalize">Open {s} findings</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{open.filter((f) => f.severity === s).length}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
