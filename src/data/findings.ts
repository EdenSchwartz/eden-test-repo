import { faker } from "@faker-js/faker"
import { minutesAgo } from "@/data/conversations"

// Vulnerabilities ingested from scanners. Each tool reports a different kind of finding, so the
// generators below mirror what that tool actually emits. Seeded: same data on every reload.
faker.seed(7)

export const severities = ["critical", "high", "medium", "low"] as const
export type Severity = (typeof severities)[number]

export const sources = {
  trivy: { name: "Trivy", category: "Container image" },
  wiz: { name: "Wiz", category: "Cloud" },
  semgrep: { name: "Semgrep", category: "Code (SAST)" },
  snyk: { name: "Snyk", category: "Dependency" },
  dependabot: { name: "Dependabot", category: "Dependency" },
} as const
export type SourceTool = keyof typeof sources

export type FindingStatus = "open" | "in-progress" | "resolved" | "ignored"

export type Finding = {
  id: string
  title: string
  severity: Severity
  source: SourceTool
  ref: string // CVE, rule ID or check ID, as the tool reports it
  cve?: string
  asset: string
  location: string // file:line, package path or resource ARN
  pkg?: { name: string; installed: string; fixed?: string }
  description: string
  status: FindingStatus
  firstSeen: Date
  lastSeen: Date
}

const images = ["acme/storefront-web:1.42.0", "acme/checkout-api:3.8.1", "acme/auth-edge:2.0.4", "acme/internal-search:0.9.2", "acme/billing-worker:5.1.0"]
const repos = ["storefront-web", "checkout-api", "auth-service", "internal-search", "billing-worker"]

const osPackages = [
  ["openssl", "3.0.13", "3.0.15", "Buffer over-read in X.509 certificate verification"],
  ["glibc", "2.36", "2.36-9+deb12u7", "Stack overflow in iconv() charset conversion"],
  ["curl", "8.4.0", "8.9.1", "Heap overflow in SOCKS5 proxy handshake"],
  ["zlib", "1.2.13", "1.3.1", "Integer overflow in inflate window handling"],
  ["libxml2", "2.10.3", "2.11.7", "Use-after-free in XML reader"],
  ["busybox", "1.35.0", "1.36.1", "Out-of-bounds write in awk"],
] as const
const libPackages = [
  ["lodash", "4.17.20", "4.17.21", "Prototype pollution in zipObjectDeep"],
  ["axios", "1.6.0", "1.7.4", "Server-side request forgery via absolute URLs"],
  ["express", "4.18.2", "4.20.0", "Open redirect in res.location()"],
  ["jsonwebtoken", "8.5.1", "9.0.0", "Signature verification bypass with insecure key types"],
  ["semver", "7.5.1", "7.5.2", "Regular expression denial of service"],
  ["ws", "8.13.0", "8.17.1", "Denial of service via many HTTP headers"],
  ["pyyaml", "5.3.1", "5.4", "Arbitrary code execution in full_load"],
] as const
const sastRules = [
  ["javascript.express.security.audit.xss.direct-response-write", "Cross-site scripting: user input written to response", "high"],
  ["javascript.lang.security.audit.sqli.node-postgres-sqli", "SQL injection: query built from request parameters", "critical"],
  ["generic.secrets.security.detected-aws-access-key", "Hardcoded AWS access key", "critical"],
  ["javascript.jsonwebtoken.security.jwt-none-alg", "JWT verified without restricting algorithms", "high"],
  ["python.lang.security.audit.subprocess-shell-true", "Command injection: subprocess with shell=True", "high"],
  ["javascript.lang.security.audit.path-traversal", "Path traversal: file path built from user input", "medium"],
  ["generic.ci.security.github-actions-script-injection", "Script injection in GitHub Actions workflow", "medium"],
] as const
// [title, severity, description, service, assets the check can apply to]
const cloudChecks = [
  ["Security group allows SSH from 0.0.0.0/0", "high", "Port 22 is open to the internet on this instance's security group.", "ec2", ["storefront-prod-1", "auth-edge-2", "bastion-1"]],
  ["S3 bucket allows public read", "critical", "Bucket policy grants s3:GetObject to Principal \"*\".", "s3", ["acme-exports", "acme-static-assets", "acme-logs-archive"]],
  ["RDS instance not encrypted at rest", "medium", "Storage encryption is disabled for this database instance.", "rds", ["billing-prod", "orders-replica"]],
  ["IAM role has AdministratorAccess", "high", "A CI role has full administrative permissions; scope it to what deploys need.", "iam", ["role/ci-deployer", "role/legacy-admin"]],
  ["EKS API server endpoint is public", "medium", "The Kubernetes API is reachable from the internet.", "eks", ["prod-cluster", "staging-cluster"]],
  ["CloudTrail logging disabled in region", "low", "No trail is recording management events in eu-west-1.", "cloudtrail", ["eu-west-1"]],
] as const

const cve = () => `CVE-${faker.helpers.arrayElement([2024, 2025, 2026])}-${faker.string.numeric(5)}`
const sev = () => faker.helpers.weightedArrayElement<Severity>([
  { value: "critical", weight: 1 }, { value: "high", weight: 3 }, { value: "medium", weight: 4 }, { value: "low", weight: 2 },
])
const status = () => faker.helpers.weightedArrayElement<FindingStatus>([
  { value: "open", weight: 6 }, { value: "in-progress", weight: 2 }, { value: "resolved", weight: 2 }, { value: "ignored", weight: 1 },
])

function generate(source: SourceTool): Omit<Finding, "id" | "status" | "firstSeen" | "lastSeen"> {
  switch (source) {
    case "trivy": {
      const [name, installed, fixed, desc] = faker.helpers.arrayElement(osPackages)
      const id = cve()
      return { source, title: `${name}: ${desc.toLowerCase()}`, severity: sev(), ref: id, cve: id, asset: faker.helpers.arrayElement(images), location: `usr/lib/${name} (debian 12)`, pkg: { name, installed, fixed }, description: `${desc}. Found in the OS layer of the image.` }
    }
    case "snyk":
    case "dependabot": {
      const [name, installed, fixed, desc] = faker.helpers.arrayElement(libPackages)
      const id = cve()
      const repo = faker.helpers.arrayElement(repos)
      return { source, title: `${name}: ${desc.toLowerCase()}`, severity: sev(), ref: id, cve: id, asset: repo, location: name === "pyyaml" ? "requirements.txt" : "package-lock.json", pkg: { name, installed, fixed }, description: `${desc}. Pulled in as a ${faker.helpers.arrayElement(["direct", "transitive"])} dependency.` }
    }
    case "semgrep": {
      const [rule, title, severity] = faker.helpers.arrayElement(sastRules)
      const repo = faker.helpers.arrayElement(repos)
      return { source, title, severity, ref: rule, asset: repo, location: `src/${faker.helpers.arrayElement(["routes", "handlers", "lib", "api"])}/${faker.helpers.arrayElement(["upload", "search", "users", "orders", "auth"])}.ts:${faker.number.int({ min: 12, max: 340 })}`, description: `${title}. Flagged by rule ${rule}.` }
    }
    case "wiz": {
      const [title, severity, desc, service, assets] = faker.helpers.arrayElement(cloudChecks)
      const asset = faker.helpers.arrayElement(assets)
      return { source, title, severity, ref: `wiz-${faker.string.alphanumeric(8).toLowerCase()}`, asset, location: `arn:aws:${service}:us-east-1:4471:${asset}`, description: desc }
    }
  }
}

// The CVE from the conversations, reported by two tools (cloud runtime + image scan)
const pinned: Finding[] = [
  {
    id: "FND-10421", source: "wiz", severity: "critical", status: "in-progress",
    title: "imgproc: remote code execution in TIFF decoder", ref: "CVE-2026-94545", cve: "CVE-2026-94545",
    asset: "storefront-prod-1", location: "arn:aws:ec2:us-east-1:4471:instance/storefront-prod-1",
    pkg: { name: "imgproc", installed: "4.1.7", fixed: "4.2.1" },
    description: "Heap overflow in imgproc's TIFF decoder lets an unauthenticated attacker execute code by uploading a crafted image. Running on an internet-facing instance.",
    firstSeen: minutesAgo(60 * 30), lastSeen: minutesAgo(8),
  },
  {
    id: "FND-10422", source: "trivy", severity: "critical", status: "in-progress",
    title: "imgproc: remote code execution in TIFF decoder", ref: "CVE-2026-94545", cve: "CVE-2026-94545",
    asset: "acme/storefront-web:1.42.0", location: "app/node_modules/imgproc (npm)",
    pkg: { name: "imgproc", installed: "4.1.7", fixed: "4.2.1" },
    description: "Heap overflow in imgproc's TIFF decoder. Found in the application layer of the image.",
    firstSeen: minutesAgo(60 * 31), lastSeen: minutesAgo(60 * 2),
  },
]

const toolWeights: { value: SourceTool; weight: number }[] = [
  { value: "trivy", weight: 5 }, { value: "wiz", weight: 3 }, { value: "semgrep", weight: 3 }, { value: "snyk", weight: 2 }, { value: "dependabot", weight: 2 },
]

export const findings: Finding[] = [
  ...pinned,
  ...Array.from({ length: 68 }, (_, i) => {
    const firstSeen = faker.date.recent({ days: 45 })
    return {
      id: `FND-${10423 + i}`,
      ...generate(faker.helpers.weightedArrayElement(toolWeights)),
      status: status(),
      firstSeen,
      lastSeen: faker.date.between({ from: firstSeen, to: new Date() }),
    }
  }),
].sort((a, b) => severities.indexOf(a.severity) - severities.indexOf(b.severity) || b.lastSeen.getTime() - a.lastSeen.getTime())
