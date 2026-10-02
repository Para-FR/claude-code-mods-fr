import { describe, expect, test } from 'claude-code/testing'

import { checkCommand, checkPath } from './rules'

describe('règles', () => {
  test('fichiers .env protégés', async () => {
    expect(checkPath('/app/.env')).toBe('accès au fichier .env')
    expect(checkPath('/app/.env.local')).toBe('accès au fichier .env.local')
    expect(checkPath('/app/.env.production')).toBe('accès au fichier .env.production')
    expect(checkPath('/app/.env.example')).toBe(undefined)
    expect(checkPath('/app/.envrc')).toBe(undefined)
    expect(checkPath('/app/src/env.ts')).toBe(undefined)
  })

  test('commandes dangereuses', async () => {
    expect(checkCommand('rm -rf node_modules')).toBe('rm -rf')
    expect(checkCommand('sudo rm -fr /tmp/x')).toBe('rm -rf')
    expect(checkCommand('rm -r -f build')).toBe('rm -rf')
    expect(checkCommand('rm --recursive --force build')).toBe('rm -rf')
    expect(checkCommand('git push --force origin main')).toBe('git push --force')
    expect(checkCommand('git push -f')).toBe('git push --force')
    expect(checkCommand('git push --force-with-lease')).toBe('git push --force')
    expect(checkCommand('git reset --hard HEAD~1')).toBe('git reset --hard')
    expect(checkCommand('psql -c "drop table users;"')).toBe('DROP TABLE')
    expect(checkCommand('cat .env')).toBe('accès au fichier .env via Bash')
    expect(checkCommand('source ./config/.env.local && npm start')).toBe('accès au fichier .env.local via Bash')
  })

  test('commandes autorisées', async () => {
    expect(checkCommand('rm file.txt')).toBe(undefined)
    expect(checkCommand('rm -r build')).toBe(undefined)
    expect(checkCommand('git push -u origin main')).toBe(undefined)
    expect(checkCommand('git reset --soft HEAD~1')).toBe(undefined)
    expect(checkCommand('cp .env.example .env.sample')).toBe(undefined)
    expect(checkCommand('node -e "console.log(process.env.HOME)"')).toBe(undefined)
    expect(checkCommand('ls -la && git status')).toBe(undefined)
  })
})

test('bloque, affiche un toast et compte dans la status line', async ($, on) => {
  const toasts: string[] = []
  const statuses: (string | undefined)[] = []

  on('ui.toast', ($, e, next) => {
    toasts.push(e.text)

    return next(e)
  })
  on('ui.status', ($, e, next) => {
    statuses.push(e.text)

    return next(e)
  })
  on('tool.call', () => ({ result: 'ok' }))

  const denied = await $.tool.call({ tool: 'Bash', command: 'rm -rf /' })
  expect(denied.deny).toContain('garde-du-corps')

  await $.tool.call({ tool: 'Read', file_path: '/app/.env' })
  const allowed = await $.tool.call({ tool: 'Bash', command: 'ls' })
  expect(allowed.deny).toBe(undefined)

  expect(toasts.length).toBe(2)
  expect(toasts[0]).toContain('rm -rf')
  expect(statuses[statuses.length - 1]).toBe('🛡️ 2 actions bloquées')
})
