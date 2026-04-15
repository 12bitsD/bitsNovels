import { existsSync, statSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const venvPython = resolve(projectRoot, '.venv/bin/python')
const pyprojectPath = resolve(projectRoot, 'pyproject.toml')
const readyMarkerPath = resolve(projectRoot, '.venv/.bitsnovels-python-dev-ready')
const requiredPythonMajor = 3
const requiredPythonMinor = 11

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
  for (const candidate of [
    'python3.11',
    '/opt/homebrew/opt/python@3.11/bin/python3.11',
    '/usr/local/opt/python@3.11/bin/python3.11',
    `${process.env.HOME ?? ''}/.pyenv/shims/python3.11`,
    'python3',
    'python',
  ]) {
    if (!candidate) {
      continue
    }

    const result = spawnSync(
      candidate,
      [
        '-c',
        'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")',
      ],
      {
        encoding: 'utf8',
      },
    )

    if (result.error || result.status !== 0) {
      continue
    }

    const version = result.stdout.trim()

    if (version === `${requiredPythonMajor}.${requiredPythonMinor}`) {
      return candidate
    }
  }

  throw new Error(
    `Python ${requiredPythonMajor}.${requiredPythonMinor} is required. Install it and ensure it is available as python3 or python.`,
  )
}

function readPythonVersion(command) {
  const result = spawnSync(
    command,
    [
      '-c',
      'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")',
    ],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    },
  )

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }

  const version = result.stdout.trim()

  if (version !== `${requiredPythonMajor}.${requiredPythonMinor}`) {
    throw new Error(
      `Project virtual environment must use Python ${requiredPythonMajor}.${requiredPythonMinor}, found ${version || 'unknown'}. Remove .venv and rerun after installing the required Python version.`,
    )
  }

  return version
}

function validateVenvPython() {
  if (!existsSync(venvPython)) {
    return
  }

  readPythonVersion(venvPython)
}

try {
  validateVenvPython()

  if (!existsSync(venvPython)) {
    const systemPython = findSystemPython()

    console.log(
      `Creating project Python virtual environment at .venv using Python ${requiredPythonMajor}.${requiredPythonMinor}`,
    )
    runOrExit(systemPython, ['-m', 'venv', '.venv'])
    validateVenvPython()
  }

  if (shouldInstallDependencies()) {
    console.log('Syncing project Python dependencies from pyproject.toml')
    runOrExit(venvPython, ['-m', 'ensurepip', '--upgrade'])
    runOrExit(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip'])
    runOrExit(venvPython, ['-m', 'pip', 'install', '-e', '.[dev]'])
    writeFileSync(readyMarkerPath, `${new Date().toISOString()}\n`)
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
}
function shouldInstallDependencies() {
  if (!existsSync(readyMarkerPath)) {
    return true
  }

  return statSync(readyMarkerPath).mtimeMs < statSync(pyprojectPath).mtimeMs
}
