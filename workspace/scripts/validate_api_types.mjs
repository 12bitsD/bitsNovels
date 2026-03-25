import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const generatedPath = resolve('packages/api-types/src/generated.ts')
const generated = readFileSync(generatedPath, 'utf8')

if (!generated.includes('"/api/health"')) {
  throw new Error('expected generated API types to include /api/health')
}

if (!generated.includes('HealthResponse')) {
  throw new Error('expected generated API types to include HealthResponse')
}
