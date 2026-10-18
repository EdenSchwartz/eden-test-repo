export const timeAgo = (d: Date) => {
  const m = Math.round((Date.now() - d.getTime()) / 60_000)
  return m < 1 ? "now" : m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`
}
