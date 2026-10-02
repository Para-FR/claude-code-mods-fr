import type { CockpitStats } from '../types'

const MAX_DURATIONS = 50
const MAX_FILES = 20

export const EDIT_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit'])

export const emptyStats = (): CockpitStats => ({
  turns: 0,
  toolCalls: 0,
  tokensIn: 0,
  tokensOut: 0,
  tools: {},
  durations: [],
  files: [],
})

export const withToolCall = (stats: CockpitStats, tool: string): CockpitStats => ({
  ...stats,
  toolCalls: stats.toolCalls + 1,
  tools: { ...stats.tools, [tool]: (stats.tools[tool] ?? 0) + 1 },
})

// Le plus récent en tête, sans doublon.
export const withFile = (stats: CockpitStats, path: string): CockpitStats => ({
  ...stats,
  files: [path, ...stats.files.filter(f => f !== path)].slice(0, MAX_FILES),
})

export const withTokens = (stats: CockpitStats, input: number, output: number): CockpitStats => ({
  ...stats,
  tokensIn: stats.tokensIn + input,
  tokensOut: stats.tokensOut + output,
})

export const withTurn = (stats: CockpitStats, durationMs: number): CockpitStats => ({
  ...stats,
  turns: stats.turns + 1,
  durations: [...stats.durations, durationMs].slice(-MAX_DURATIONS),
})

export const topTools = (stats: CockpitStats, count: number): [string, number][] =>
  Object.entries(stats.tools)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)

export const formatTokens = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : `${n}`

export const formatDuration = (ms: number): string => {
  const seconds = Math.round(ms / 1000)

  return seconds >= 60 ? `${Math.floor(seconds / 60)}m${String(seconds % 60).padStart(2, '0')}s` : `${seconds}s`
}

// Une barre d'au moins un bloc pour toute valeur non nulle.
export const bar = (value: number, max: number, width: number): string =>
  max <= 0 || value <= 0 ? '' : '█'.repeat(Math.max(1, Math.round((value / max) * width)))

export const shortPath = (path: string, cwd: string): string =>
  cwd !== '' && path.startsWith(`${cwd}/`) ? path.slice(cwd.length + 1) : path

// claude-opus-5-5 → Opus 5.5, claude-sonnet-5-5[1m] → Sonnet 5.5 [1m]
export const formatModel = (id: string): string => {
  const match = /^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?!\d)(?:-\d{8})?(\[.+\])?$/.exec(id)

  if (match === null) {
    return id === '' ? '—' : id
  }

  const [, family = '', major, minor, suffix] = match
  const name = family.charAt(0).toUpperCase() + family.slice(1)

  return `${name} ${major}${minor !== undefined ? `.${minor}` : ''}${suffix !== undefined ? ` ${suffix}` : ''}`
}

export const formatUsd = (usd: number): string => (usd < 10 ? `$${usd.toFixed(3)}` : `$${usd.toFixed(2)}`)
