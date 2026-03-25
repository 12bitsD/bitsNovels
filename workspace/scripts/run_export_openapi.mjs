import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const venvPython = resolve('.venv/bin/python')
const pythonCommand = existsSync(venvPython) ? venvPython : 'python3'

const result = spawnSync(pythonCommand, ['scripts/export_openapi.py'], {
  stdio: 'inherit',
})

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}
