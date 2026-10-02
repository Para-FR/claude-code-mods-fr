export type BlockedCount = number

declare module 'claude-code' {
  interface PluginState {
    'garde-du-corps': { blocked: BlockedCount }
  }
}
