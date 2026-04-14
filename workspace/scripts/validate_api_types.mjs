import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const generatedPath = resolve('packages/api-types/src/generated.ts')
const openapiPath = resolve('server/openapi.json')

const generated = readFileSync(generatedPath, 'utf8')
const openapi = JSON.parse(readFileSync(openapiPath, 'utf8'))

const pathEntries = Object.keys(openapi.paths ?? {})
const schemaEntries = Object.keys(openapi.components?.schemas ?? {})

if (pathEntries.length === 0) {
  throw new Error('expected OpenAPI spec to contain at least one path')
}

if (schemaEntries.length === 0) {
  throw new Error('expected OpenAPI spec to contain at least one schema')
}

const missingPaths = pathEntries.filter((path) => !generated.includes(`"${path}"`))
if (missingPaths.length > 0) {
  throw new Error(
    `generated API types are missing ${missingPaths.length} OpenAPI path(s): ${missingPaths.join(', ')}`,
  )
}

const missingSchemas = schemaEntries.filter(
  (schemaName) => !generated.includes(`${schemaName}:`) && !generated.includes(`${schemaName}?:`),
)
if (missingSchemas.length > 0) {
  throw new Error(
    `generated API types are missing ${missingSchemas.length} OpenAPI schema(s): ${missingSchemas.join(', ')}`,
  )
}

const generatedPathCount = (generated.match(/^    "\/api\//gm) ?? []).length
if (generatedPathCount < pathEntries.length) {
  throw new Error(
    `generated API types expose only ${generatedPathCount} path entries, expected at least ${pathEntries.length}`,
  )
}
