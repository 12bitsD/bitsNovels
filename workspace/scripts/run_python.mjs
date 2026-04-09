import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const candidates = [resolve(projectRoot, '.venv/bin/python'), 'python3', 'python']
const pythonCommand = candidates.find((candidate) => {
  if (candidate.startsWith('/')) {
    return existsSync(candidate)
  }

  const result = spawnSync(candidate, ['--version'], {
    stdio: 'ignore',
  })

  return !result.error && result.status === 0
})

if (!pythonCommand) {
  throw new Error('python runtime not found')
}

const result = spawnSync(pythonCommand, process.argv.slice(2), {
  cwd: projectRoot,
  stdio: 'inherit',
})

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}
