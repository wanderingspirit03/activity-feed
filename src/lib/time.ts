export function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp

  if (diffMs < 60_000) {
    return "just now"
  }

  if (diffMs < 3_600_000) {
    return `${Math.max(1, Math.floor(diffMs / 60_000))} min ago`
  }

  if (diffMs < 86_400_000) {
    return `${Math.max(1, Math.floor(diffMs / 3_600_000))} hr ago`
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp))
}

export function formatElapsedTime(startedAt: number, endedAt = Date.now()): string {
  const totalSeconds = Math.max(0, Math.floor((endedAt - startedAt) / 1000))

  if (totalSeconds < 60) {
    return `${totalSeconds}s`
  }

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes < 60) {
    return `${minutes}m ${seconds}s`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return `${hours}h ${remainingMinutes}m`
}
