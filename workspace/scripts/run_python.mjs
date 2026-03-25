import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const candidates = [resolve('.venv/bin/python'), 'python3', 'python']
const pythonCommand = candidates.find((candidate) =>
  candidate.startsWith('/') ? existsSync(candidate) : true,
)

if (!pythonCommand) {
  throw new Error('python runtime not found')
}

const result = spawnSync(pythonCommand, process.argv.slice(2), {
  stdio: 'inherit',
})

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}
