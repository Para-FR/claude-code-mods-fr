export type CockpitStats = {
  turns: number
  toolCalls: number
  tokensIn: number
  tokensOut: number
  tools: Record<string, number>
  durations: number[]
  files: string[]
}

export type CockpitLive = {
  model: string
  contextTokens: number | null
  contextWindow: number
  contextPercent: number | null
  costUsd: number | null
}

declare module 'claude-code' {
  interface PluginState {
    cockpit: { stats: CockpitStats; cwd: string; live: CockpitLive }
  }
}
