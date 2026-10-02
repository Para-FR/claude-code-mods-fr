// Règles pures du garde-du-corps : chaque fonction renvoie la raison du
// blocage, ou undefined quand l'action est autorisée.

// Modèles de fichiers sans secret, laissés accessibles.
const ALLOWED_SUFFIXES = new Set(['.example', '.sample', '.template', '.dist'])

const isProtectedEnvName = (name: string): boolean => {
  const match = /^\.env(\.[\w.-]+)?$/.exec(name)

  return match !== null && !ALLOWED_SUFFIXES.has(match[1] ?? '')
}

export const checkPath = (path: string): string | undefined => {
  const name = path.split(/[\\/]/).pop() ?? ''

  return isProtectedEnvName(name) ? `accès au fichier ${name}` : undefined
}

// `.env` ou `.env.xxx` cité comme mot dans une commande (cat .env,
// source ./config/.env.local, cp .env.production /tmp…).
const ENV_IN_COMMAND = /(?:^|[\s'"`=<>|;&(:\/])(\.env(?:\.[\w.-]+)?)(?=$|[\s'"`|;&)<>])/g

const splitSegments = (command: string): string[] =>
  command.split(/&&|\|\||[;|&\n]/).map(s => s.trim())

const hasRmRecursiveForce = (segment: string): boolean => {
  const tokens = segment.split(/\s+/)
  const at = tokens.findIndex(t => t === 'rm' || t.endsWith('/rm'))

  if (at === -1) {
    return false
  }

  const flags = tokens.slice(at + 1).filter(t => t.startsWith('-'))
  const short = flags.filter(f => !f.startsWith('--')).join('')
  const isRecursive = /[rR]/.test(short) || flags.includes('--recursive')
  const isForced = short.includes('f') || flags.includes('--force')

  return isRecursive && isForced
}

const hasForcePush = (segment: string): boolean =>
  /\bgit\b.*\bpush\b/.test(segment) &&
  segment
    .split(/\s+/)
    .some(t => /^--force(-with-lease|-if-includes)?(=.*)?$/.test(t) || /^-[a-zA-Z]*f[a-zA-Z]*$/.test(t))

const hasHardReset = (segment: string): boolean => /\bgit\b.*\breset\b.*(^|\s)--hard\b/.test(segment)

export const checkCommand = (command: string): string | undefined => {
  if (/\bdrop\s+table\b/i.test(command)) {
    return 'DROP TABLE'
  }

  const segments = splitSegments(command)

  if (segments.some(hasRmRecursiveForce)) {
    return 'rm -rf'
  }

  if (segments.some(hasForcePush)) {
    return 'git push --force'
  }

  if (segments.some(hasHardReset)) {
    return 'git reset --hard'
  }

  for (const [, name = ''] of command.matchAll(ENV_IN_COMMAND)) {
    if (isProtectedEnvName(name)) {
      return `accès au fichier ${name} via Bash`
    }
  }

  return undefined
}
