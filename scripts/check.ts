// Checks every docs section (a folder with a docs.json): its manifest, its pages, its links,
// and that each API example is a request the live API accepts.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Ajv2020 } from 'ajv/dist/2020.js'
import addFormatsModule from 'ajv-formats'

const OPENAPI_URL = process.env.OPENAPI_URL ?? 'https://platform.adapt.com/openapi.json'

type Manifest = { groups: string[]; pages: { slug: string; label: string; group: string }[] }
type Page = { section: string; slug: string; file: string; text: string }

const errors: string[] = []
const fail = (where: string, message: string) => errors.push(`${where}: ${message}`)

const sections = readdirSync('.', { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(entry.name, 'docs.json')))
  .map((entry) => entry.name)
const pages: Page[] = []

for (const section of sections) {
  const where = `${section}/docs.json`
  const manifest = JSON.parse(readFileSync(where, 'utf8')) as Manifest
  if (!manifest.groups?.length) fail(where, 'needs at least one group')
  if (!manifest.pages?.length) fail(where, 'needs at least one page')

  const listed = new Set<string>()
  for (const entry of manifest.pages ?? []) {
    if (!entry.slug || !entry.label || !entry.group) fail(where, `${JSON.stringify(entry)} needs slug, label and group`)
    if (!manifest.groups.includes(entry.group)) fail(where, `${entry.slug} is in "${entry.group}", which isn't in groups`)
    if (listed.has(entry.slug)) fail(where, `${entry.slug} is listed twice`)
    listed.add(entry.slug)
    const file = join(section, `${entry.slug}.md`)
    if (!existsSync(file)) fail(where, `${entry.slug} has no ${file}`)
    else pages.push({ section, slug: entry.slug, file, text: readFileSync(file, 'utf8') })
  }
  for (const file of readdirSync(section).filter((f) => f.endsWith('.md'))) {
    if (!listed.has(file.slice(0, -3))) fail(join(section, file), 'is not listed in docs.json, so it would never publish')
  }
}

/** The page's lines outside fenced code, which is where headings and links live. */
function proseLines(text: string) {
  let fenced = false
  return text.split('\n').filter((line) => {
    if (line.startsWith('```')) fenced = !fenced
    return !fenced && !line.startsWith('```')
  })
}

// adapt.com's heading ids (src/lib/docs/markdown.ts), so #anchors are checked the way they resolve.
function slugify(text: string) {
  return (
    text
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s_-]/gu, '')
      .trim()
      .replace(/\s+/g, '-') || 'section'
  )
}

function headingIds(text: string) {
  const ids = new Set<string>()
  for (const line of proseLines(text)) {
    const heading = line.match(/^#{1,6}\s+(.+?)\s*#*$/)?.[1]
    if (!heading) continue
    const base = slugify(heading.replace(/[`*_]|\[([^\]]*)\]\([^)]*\)/g, '$1'))
    let id = base
    for (let n = 1; ids.has(id); n++) id = `${base}-${n}`
    ids.add(id)
  }
  return ids
}

const anchors = new Map(pages.map((p) => [`${p.section}/${p.slug}`, headingIds(p.text)]))

for (const page of pages) {
  const lines = proseLines(page.text)
  const titles = lines.filter((line) => /^# /.test(line))
  if (titles.length !== 1) fail(page.file, `needs exactly one # title, has ${titles.length}`)
  const lead = lines.slice(lines.findIndex((line) => /^# /.test(line)) + 1).find((line) => line.trim())
  if (!lead || /^[#|>-]/.test(lead)) fail(page.file, 'needs a lead paragraph under its title')

  for (const [, slug, hash] of page.text.matchAll(/\]\(\/docs\/([^)#\s]+)(?:#([^)\s]+))?\)/g)) {
    const ids = anchors.get(`${page.section}/${slug}`)
    if (!ids) fail(page.file, `links to /docs/${slug}, which isn't a ${page.section} page`)
    else if (hash && !ids.has(hash)) fail(page.file, `links to /docs/${slug}#${hash}, which has no such heading`)
  }
}

// Changelog entries: the frontmatter adapt.com/changelog requires, and images that exist here.
for (const file of existsSync('changelog') ? readdirSync('changelog').filter((f) => f.endsWith('.mdx')) : []) {
  const where = join('changelog', file)
  const text = readFileSync(where, 'utf8')
  const front = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? ''
  if (!/^title: .+/m.test(front)) fail(where, 'needs a title in its frontmatter')
  const date = front.match(/^date: "?([^"\n]+)"?/m)?.[1]
  if (!date || Number.isNaN(Date.parse(date))) fail(where, 'needs a valid date in its frontmatter')
  for (const [, image] of text.matchAll(/https:\/\/adapt\.com\/docs\/(images\/changelog\/[^)"\s]+)/g)) {
    if (!existsSync(image)) fail(where, `shows ${image}, which isn't in this repo`)
  }
}

// API examples: the curl blocks that call $PLATFORM_URL/v1/…, checked against the published OpenAPI spec.
type Parameter = { name: string; in: string; required?: boolean }
type Operation = {
  parameters?: Parameter[]
  requestBody?: { content?: Record<string, { schema?: object }> }
}
type Spec = { paths: Record<string, Record<string, Operation>> }

const spec = toJsonSchema((await (await fetch(OPENAPI_URL)).json()) as Spec)

/** The spec says 3.1 but still writes some schemas the 3.0 way; rewrite those so a 2020-12 validator reads them. */
function toJsonSchema<T>(node: T): T {
  if (Array.isArray(node)) return node.map(toJsonSchema) as T
  if (!node || typeof node !== 'object') return node
  const out = Object.fromEntries(Object.entries(node).map(([k, v]) => [k, toJsonSchema(v)]))
  if (out.exclusiveMinimum === true) {
    out.exclusiveMinimum = out.minimum
    delete out.minimum
  }
  if (out.exclusiveMaximum === true) {
    out.exclusiveMaximum = out.maximum
    delete out.maximum
  }
  // A regex serialized with its flags (`^…$/i`): carry them as an inline modifier group.
  const flagged = typeof out.pattern === 'string' && out.pattern.match(/^\^(.*)\$\/([ims]+)$/)
  if (flagged) out.pattern = `^(?${flagged[2]}:${flagged[1]})$`
  if (out.nullable === true) {
    if (typeof out.type === 'string') out.type = [out.type, 'null']
    delete out.nullable
  }
  return out as T
}
const addFormats = addFormatsModule as unknown as (ajv: Ajv2020) => void
const ajv = new Ajv2020({ strict: false, allErrors: true, coerceTypes: true })
addFormats(ajv)
ajv.addSchema(spec, 'openapi')

/** Example variables stand for real values; these give the schemas something of the right shape. */
function substitute(text: string) {
  const id = '11111111-1111-4111-8111-111111111111'
  return text.replace(/\$([A-Z_]+)/g, (_, name: string) => {
    if (name === 'VARIABLE_SET_VERSION' || name === 'EVENT_CURSOR') return '1'
    if (name.endsWith('_ID') || name === 'IDEMPOTENCY_KEY' || name === 'NEXT_CURSOR') return id
    if (name === 'PLATFORM_API_KEY') return 'example-api-key'
    if (name === 'ADAPT_TOKEN') return 'example-identity-session-token'
    throw new Error(`Unknown example variable $${name}: add it to substitute() in scripts/check.ts`)
  })
}

/** The spec's path for a docs path, where a `{param}` segment matches a `$VARIABLE` one. */
function findPath(path: string) {
  const segments = path.split('/')
  return Object.keys(spec.paths).find((template) => {
    const parts = template.split('/')
    return (
      parts.length === segments.length &&
      parts.every((part, i) => (part.startsWith('{') ? segments[i]?.startsWith('$') : part === segments[i]))
    )
  })
}

/** A JSON pointer into the spec, so a schema's own `#/components/…` refs resolve against it. */
const pointer = (...parts: (string | number)[]) =>
  parts.map((p) => `/${String(p).replaceAll('~', '~0').replaceAll('/', '~1')}`).join('')

function validate(where: string, label: string, at: string, value: unknown) {
  const check = ajv.compile({ $ref: `openapi#${at}` })
  if (!check(value)) fail(where, `${label}: ${ajv.errorsText(check.errors)}`)
}

let checked = 0
for (const page of pages) {
  for (const [, block = ''] of page.text.matchAll(/```sh(?: tab="API")?\n([\s\S]*?)\n```/g)) {
    const url = block.match(/"\$PLATFORM_URL(\/v1\/[^"\s]+)"/)?.[1]
    if (!url) continue // MCP, client setup, OpenAPI download, and public URLs.
    const method = (block.match(/-X (\w+)/)?.[1] ?? 'GET').toLowerCase()
    const [path = '', query = ''] = url.split('?')
    const where = `${page.file} ${method.toUpperCase()} ${url}`
    const template = findPath(path)
    const operation = template ? spec.paths[template]?.[method] : undefined
    if (!template || !operation) {
      fail(where, 'no such operation in the API')
      continue
    }

    const params = operation.parameters ?? []
    const search = new URLSearchParams(substitute(query))
    for (const [, field = ''] of block.matchAll(/--data-urlencode "([^"]+)"/g)) {
      const at = field.indexOf('=')
      search.set(field.slice(0, at), substitute(field.slice(at + 1)))
    }
    for (const [name, value] of search) {
      const i = params.findIndex((p) => p.in === 'query' && p.name === name)
      if (i === -1) fail(where, `query parameter ${name} isn't in the API`)
      else validate(where, `query ${name}`, pointer('paths', template, method, 'parameters', i, 'schema'), value)
    }

    const headers = new Map(
      Array.from(block.matchAll(/-H "([^:"]+): ([^"]+)"/g), ([, name = '', value = '']) => [
        name.toLowerCase(),
        substitute(value),
      ])
    )
    params.forEach((param, i) => {
      if (param.in !== 'header') return
      const value = headers.get(param.name.toLowerCase())
      if (value === undefined) {
        if (param.required) fail(where, `missing required header ${param.name}`)
      } else validate(where, `header ${param.name}`, pointer('paths', template, method, 'parameters', i, 'schema'), value)
    })

    const body = operation.requestBody?.content?.['application/json']?.schema
    if (body) {
      const json =
        block.match(/--data '([^']*)'/)?.[1] ?? block.match(/--data @- <<EOF_JSON\n([\s\S]*?)\nEOF_JSON/)?.[1]
      if (json === undefined) fail(where, 'the API takes a JSON body, but the example sends none')
      else {
        const at = pointer('paths', template, method, 'requestBody', 'content', 'application/json', 'schema')
        validate(where, 'body', at, JSON.parse(substitute(json)))
      }
    }
    checked++
  }
}
if (checked === 0) fail('API examples', 'found none to check; did the curl format change?')

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'))
  console.error(`\n${errors.length} problem${errors.length === 1 ? '' : 's'}`)
  process.exit(1)
}
console.log(`✓ ${sections.length} section(s), ${pages.length} pages, the changelog, and ${checked} API examples checked against ${OPENAPI_URL}`)
