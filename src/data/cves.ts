import type { Severity } from "@/data/findings"

export type Cve = {
  id: string
  title: string
  severity: Severity
  cvss: number
  epss: number // probability of exploitation in the next 30 days
  exploited: boolean
  published: string
  description: string
  package: string
  affected: string
  fixed: string
  assets: { id: string; cloud: string; owner: string }[]
}

export const cves: Record<string, Cve> = {
  "CVE-2026-94545": {
    id: "CVE-2026-94545",
    title: "Remote code execution in imgproc image decoder",
    severity: "critical",
    cvss: 9.8,
    epss: 0.94,
    exploited: true,
    published: "Sep 30, 2026",
    description:
      "A heap overflow in imgproc's TIFF decoder lets an unauthenticated attacker execute arbitrary code by uploading a crafted image. Public exploit code is available.",
    package: "imgproc",
    affected: "< 4.2.1",
    fixed: "4.2.1",
    assets: [{ id: "storefront-prod-1", cloud: "AWS", owner: "web-platform" }],
  },
}

// ponytail: unknown IDs get a generic placeholder so any @CVE-… mention still opens something
export const getCve = (id: string): Cve =>
  cves[id] ?? {
    ...cves["CVE-2026-94545"],
    id,
    title: "Vulnerability details",
    severity: "medium",
    cvss: 5.4,
    epss: 0.12,
    exploited: false,
    assets: [],
  }
