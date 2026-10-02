import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ToolCallInput } from 'claude-code'

import { checkCommand, checkPath } from './rules'

const blocked = atom({ plugin: 'garde-du-corps', key: 'blocked' } as const, 0)

const showCount = ($: EngineInterface, count: number) =>
  $.ui.status(`🛡️ ${count} action${count > 1 ? 's' : ''} bloquée${count > 1 ? 's' : ''}`)

const reasonFor = (e: ToolCallInput): string | undefined => {
  switch (e.tool) {
    case 'Read':
    case 'Edit':
    case 'Write':
      return checkPath(e.file_path)
    case 'NotebookEdit':
      return checkPath(e.notebook_path)
    case 'Bash':
      return checkCommand(e.command)
    default:
      return undefined
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    showCount($, await read($, blocked))

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const reason = reasonFor(e)

    if (reason === undefined) {
      return next(e)
    }

    showCount($, await update($, blocked, n => n + 1))
    $.ui.toast(`🛡️ Garde-du-corps : ${reason} bloqué`)

    return {
      deny: `Bloqué par le garde-du-corps (${reason}). Cette action est interdite dans cette session : ne cherche pas à la contourner, demande à l'utilisateur de la faire lui-même si elle est vraiment nécessaire.`,
    }
  })
}
