import { existsSync, statSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const venvPython = resolve(projectRoot, '.venv/bin/python')
const pyprojectPath = resolve(projectRoot, 'pyproject.toml')
const readyMarkerPath = resolve(projectRoot, '.venv/.bitsnovels-python-dev-ready')

function runOrExit(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function findSystemPython() {
  for (const candidate of ['python3', 'python']) {
    const result = spawnSync(candidate, ['--version'], {
      stdio: 'ignore',
    })

    if (!result.error && result.status === 0) {
      return candidate
    }
  }

  throw new Error('python runtime not found')
}

function shouldInstallDependencies() {
  if (!existsSync(readyMarkerPath)) {
    return true
  }

  return statSync(readyMarkerPath).mtimeMs < statSync(pyprojectPath).mtimeMs
}

if (!existsSync(venvPython)) {
  const systemPython = findSystemPython()

  console.log('Creating project Python virtual environment at .venv')
  runOrExit(systemPython, ['-m', 'venv', '.venv'])
}

if (shouldInstallDependencies()) {
  console.log('Syncing project Python dependencies from pyproject.toml')
  runOrExit(venvPython, ['-m', 'ensurepip', '--upgrade'])
  runOrExit(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip'])
  runOrExit(venvPython, ['-m', 'pip', 'install', '-e', '.[dev]'])
  writeFileSync(readyMarkerPath, `${new Date().toISOString()}\n`)
}
