import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { CockpitLive } from '../types'

import {
  EDIT_TOOLS,
  bar,
  emptyStats,
  formatDuration,
  formatModel,
  formatTokens,
  formatUsd,
  shortPath,
  topTools,
  withFile,
  withToolCall,
  withTokens,
  withTurn,
} from './stats'

const PANE = 'cockpit'
const stats = atom({ plugin: 'cockpit', key: 'stats' } as const, emptyStats())
const cwd = atom({ plugin: 'cockpit', key: 'cwd' } as const, '')
const live = atom({ plugin: 'cockpit', key: 'live' } as const, {
  model: '',
  contextTokens: null,
  contextWindow: 0,
  contextPercent: null,
  costUsd: null,
} as CockpitLive)

// Modèle, remplissage du contexte et coût, tels que la status line les voit.
// Ne lève jamais : un chiffre manquant ne doit pas faire échouer l'appel d'outil en cours.
const refreshLive = async ($: EngineInterface) => {
  try {
    const [model, usage] = await Promise.all([$.session.model(), $.session.usage()])
    const snapshot: CockpitLive = {
      model,
      contextTokens: usage.context.tokens ?? null,
      contextWindow: usage.context.window,
      contextPercent: usage.context.percent ?? null,
      costUsd: usage.cost?.usd ?? null,
    }
    await update($, live, () => snapshot)
  } catch {
    // Les chiffres précédents restent affichés.
  }
}

const SHOWN_TOOLS = 8
const SHOWN_TURNS = 10
const SHOWN_FILES = 8

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await update($, cwd, () => e.cwd)
    await $.command.register({
      name: 'cockpit',
      description: 'Ouvre le cockpit : statistiques live de la session',
    })
    const started = await next(e)
    await refreshLive($)

    return started
  })

  on('classic.PostModelSwitch', async ($, e, next) => {
    const switched = await next(e)
    await refreshLive($)

    return switched
  })

  on('command.run', { command: 'cockpit' }, async $ => {
    await refreshLive($)
    await $.ui.open({ id: PANE, title: 'Cockpit', columns: 52 })

    return { text: 'Cockpit ouvert.' }
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)

    if (ran.deny !== undefined) {
      return ran
    }

    await update($, stats, s => withToolCall(s, e.tool))
    await refreshLive($)

    if (ran.isError !== true && EDIT_TOOLS.has(e.tool)) {
      const path = e.tool === 'NotebookEdit' ? e.notebook_path : 'file_path' in e ? e.file_path : undefined

      if (typeof path === 'string') {
        await update($, stats, s => withFile(s, path))
      }
    }

    return ran
  })

  on('turn.complete', async ($, e, next) => {
    const { usage } = e

    // Les tokens comptent aussi ceux des sous-agents ; les tours, la boucle principale seule.
    if (usage !== undefined) {
      const input = usage.input_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens
      await update($, stats, s => withTokens(s, input, usage.output_tokens))
    }

    if (e.agentId === undefined) {
      await update($, stats, s => withTurn(s, e.durationMs))
    }

    const done = await next(e)
    await refreshLive($)

    return done
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const s = await read($, stats)
    const root = await read($, cwd)
    const now = await read($, live)
    const percent = now.contextPercent ?? 0
    const gaugeColor = percent >= 80 ? 'red' : percent >= 50 ? 'yellow' : 'green'
    const barWidth = Math.max(6, Math.min(24, (e.viewport?.columns ?? 52) - 26))

    const tools = topTools(s, SHOWN_TOOLS)
    const toolMax = tools[0]?.[1] ?? 0
    const labelWidth = Math.max(4, ...tools.map(([name]) => Math.min(name.length, 14)))

    const firstTurn = Math.max(0, s.durations.length - SHOWN_TURNS)
    const turns = s.durations.slice(firstTurn)
    const turnMax = Math.max(0, ...turns)
    const turnOffset = s.turns - s.durations.length + firstTurn

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text>
            <Text bold>Modèle </Text>
            <Text color="cyan">{formatModel(now.model)}</Text>
            <Text dimColor> · </Text>
            <Text bold>Coût </Text>
            <Text color="yellow">{now.costUsd === null ? '—' : formatUsd(now.costUsd)}</Text>
          </Text>
          <Text wrap="truncate">
            <Text bold>Contexte </Text>
            <Text color={gaugeColor}>{bar(percent, 100, barWidth).padEnd(barWidth, '░')}</Text>{' '}
            {now.contextPercent === null ? '—' : `${now.contextPercent} %`}
          </Text>
          <Text dimColor>
            {now.contextTokens === null
              ? `fenêtre ${formatTokens(now.contextWindow)}`
              : `${formatTokens(now.contextTokens)} / ${formatTokens(now.contextWindow)} tokens`}
          </Text>
        </Box>

        <Box flexDirection="column">
          <Text>
            <Text bold>Tours </Text>
            {s.turns}
            <Text dimColor> · </Text>
            <Text bold>Outils </Text>
            {s.toolCalls}
            <Text dimColor> · </Text>
            <Text bold>Tokens </Text>
            {formatTokens(s.tokensIn + s.tokensOut)}
          </Text>
          <Text dimColor>
            entrée {formatTokens(s.tokensIn)} · sortie {formatTokens(s.tokensOut)}
          </Text>
        </Box>

        <Box flexDirection="column">
          <Text bold>Outils les plus utilisés</Text>
          {tools.length === 0 && <Text dimColor>Aucun appel pour l'instant.</Text>}
          {tools.map(([name, count]) => (
            <Text key={`tool-${name}`} wrap="truncate">
              {name.slice(0, 14).padEnd(labelWidth)} <Text color="cyan">{bar(count, toolMax, barWidth)}</Text> {count}
            </Text>
          ))}
        </Box>

        <Box flexDirection="column">
          <Text bold>Durée des tours</Text>
          {turns.length === 0 && <Text dimColor>Aucun tour terminé.</Text>}
          {turns.map((ms, i) => (
            <Text key={`turn-${turnOffset + i}`} wrap="truncate">
              {`#${turnOffset + i + 1}`.padEnd(5)} <Text color="magenta">{bar(ms, turnMax, barWidth)}</Text>{' '}
              {formatDuration(ms)}
            </Text>
          ))}
        </Box>

        <Box flexDirection="column">
          <Text bold>Derniers fichiers modifiés</Text>
          {s.files.length === 0 && <Text dimColor>Aucun fichier modifié.</Text>}
          {s.files.slice(0, SHOWN_FILES).map(file => (
            <Text key={`file-${file}`} color="green" wrap="truncate-start">
              {shortPath(file, root)}
            </Text>
          ))}
        </Box>
      </Box>
    )
  })
}
