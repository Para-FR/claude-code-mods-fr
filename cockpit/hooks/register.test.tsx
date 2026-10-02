import { expect, test } from 'claude-code/testing'

import { bar, formatDuration, formatModel, formatTokens, formatUsd } from './stats'

test('formatage', async () => {
  expect(formatTokens(950)).toBe('950')
  expect(formatTokens(12_345)).toBe('12.3k')
  expect(formatTokens(2_500_000)).toBe('2.5M')
  expect(formatDuration(8_400)).toBe('8s')
  expect(formatDuration(72_000)).toBe('1m12s')
  expect(bar(10, 10, 20)).toBe('█'.repeat(20))
  expect(bar(1, 100, 20)).toBe('█')
  expect(bar(0, 10, 20)).toBe('')
  expect(formatModel('claude-opus-5-5')).toBe('Opus 5.5')
  expect(formatModel('claude-sonnet-5-5[1m]')).toBe('Sonnet 5.5 [1m]')
  expect(formatModel('claude-haiku-4-5-20251001')).toBe('Haiku 4.5')
  expect(formatModel('autre-modele')).toBe('autre-modele')
  expect(formatUsd(0.4567)).toBe('$0.457')
  expect(formatUsd(12.345)).toBe('$12.35')
})

test('le panneau affiche tours, outils, tokens, durées et fichiers', async ($, on) => {
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { tokens: 50_000, window: 200_000, percent: 25 }, rateLimits: [], cost: { usd: 1.2345 } },
  }))
  on('tool.call', () => ({ result: 'ok' }))
  on('turn.complete', () => ({ text: '' }))

  await $.session.start({ cwd: '/projet', surface: 'terminal' } as never)
  await $.tool.call({ tool: 'Bash', command: 'ls' })
  await $.tool.call({ tool: 'Bash', command: 'pwd' })
  await $.tool.call({ tool: 'Edit', file_path: '/projet/src/app.ts', old_string: 'a', new_string: 'b' })
  await $.turn.complete({
    answer: 'fini',
    durationMs: 12_000,
    isAborted: false,
    turnId: 't1',
    reason: 'answer',
    usage: {
      model: 'claude-opus-5-5',
      input_tokens: 1_000,
      output_tokens: 500,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
    },
  } as never)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'cockpit',
      surface,
      component: 'Pane',
      requestId: 'cockpit',
      props: { title: 'Cockpit' } as never,
    })

    expect(await ui.find({ text: /Tours 1 · Outils 3 · Tokens 1\.5k/ })).not.toBe(undefined)
    expect(await ui.find({ text: /Bash\s+█+ 2/ })).not.toBe(undefined)
    expect(await ui.find({ text: /#1\s+█+ 12s/ })).not.toBe(undefined)
    expect(await ui.find({ text: 'src/app.ts' })).not.toBe(undefined)
    expect(await ui.find({ text: /Tours 2/ })).toBe(undefined)
    expect(await ui.find({ text: /Modèle Opus 5\.5 · Coût \$1\.234/ })).not.toBe(undefined)
    expect(await ui.find({ text: /Contexte █+░+ 25 %/ })).not.toBe(undefined)
    expect(await ui.find({ text: '50.0k / 200.0k tokens' })).not.toBe(undefined)
  }
})
