import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.join(projectRoot, 'docs', 'ksearch-dictionaries')
const outputRoot = path.join(projectRoot, 'public', 'data', 'dictionaries')

const identityBySourceId = {
  'dictionary/4W': ['dictionary-4w', 'dictionary/4w.json', '4W 英汉词典'],
  'dictionary/6W': ['dictionary-6w', 'dictionary/6w.json', '6W 英汉词典'],
  'dictionary/GMAT': ['dictionary-gmat', 'dictionary/gmat.json', 'GMAT 词汇'],
  'dictionary/Grade': ['dictionary-grade', 'dictionary/grade.json', '分级词汇'],
  'dictionary/GRE': ['dictionary-gre', 'dictionary/gre.json', 'GRE 词汇'],
  'dictionary/High': ['dictionary-high', 'dictionary/high.json', '高中英语'],
  'dictionary/Middle': ['dictionary-middle', 'dictionary/middle.json', '初中英语'],
  'dictionary/TOEFL': ['dictionary-toefl', 'dictionary/toefl.json', 'TOEFL 词汇'],
  'general/常用单词1000': ['general-common-1000', 'general/common-1000.json', '常用单词 1000'],
  'professional/地理EN': ['professional-geography', 'professional/geography.json', '地理英语'],
  'professional/电子EN': ['professional-electronics', 'professional/electronics.json', '电子英语'],
  'professional/化学EN': ['professional-chemistry', 'professional/chemistry.json', '化学英语'],
  'professional/计算机EN': ['professional-computer', 'professional/computer.json', '计算机英语'],
  'professional/建筑EN': [
    'professional-architecture',
    'professional/architecture.json',
    '建筑英语',
  ],
  'professional/农学EN': ['professional-agriculture', 'professional/agriculture.json', '农学英语'],
  'professional/石油EN': ['professional-petroleum', 'professional/petroleum.json', '石油英语'],
  'professional/数学EN': ['professional-mathematics', 'professional/mathematics.json', '数学英语'],
  'professional/物理EN': ['professional-physics', 'professional/physics.json', '物理英语'],
  'professional/心理学EN': [
    'professional-psychology',
    'professional/psychology.json',
    '心理学英语',
  ],
  'professional/医学EN': ['professional-medicine', 'professional/medicine.json', '医学英语'],
}

const lineKinds = {
  '%': 'part-of-speech',
  '\\': 'definition',
  '#': 'sense',
  '*': 'example',
  '|': 'translation',
}

function parseExplanation(rawExplanation) {
  const parsed = { lines: [] }

  for (const rawLine of String(rawExplanation ?? '').split(/\r?\n/u)) {
    const line = rawLine.trim()
    if (!line) continue

    const marker = line[0]
    const text = line.slice(1).trim()

    if (marker === '&') {
      if (text && text !== '1') parsed.phonetic = text
      continue
    }

    const kind = lineKinds[marker]
    if (kind && text) {
      parsed.lines.push({ kind, text })
    } else {
      parsed.lines.push({ kind: 'text', text: line })
    }
  }

  return parsed
}

function hasUsefulExplanation(explanation) {
  return Boolean(explanation.phonetic || explanation.lines.length > 0)
}

function findFallbackExplanation(word, fallbackIndexes) {
  for (const index of fallbackIndexes) {
    const exact = index.exact.get(word)
    if (exact && hasUsefulExplanation(exact)) return exact

    const folded = index.folded.get(word.toLocaleLowerCase('en'))
    if (folded && hasUsefulExplanation(folded)) return folded
  }

  return null
}

function createExplanationIndex(results) {
  const exact = new Map()
  const folded = new Map()

  for (const result of results) {
    const word = String(result.Entry ?? result.SearchWord ?? '').trim()
    if (!word) continue

    const explanation = parseExplanation(result.Explanation)
    if (!hasUsefulExplanation(explanation)) continue

    exact.set(word, explanation)
    const foldedWord = word.toLocaleLowerCase('en')
    if (!folded.has(foldedWord)) folded.set(foldedWord, explanation)
  }

  return { exact, folded }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

async function main() {
  const sourceManifest = await readJson(path.join(sourceRoot, 'manifest.json'))
  const rawById = new Map()

  for (const dictionary of sourceManifest.dictionaries) {
    const rawPath = path.join(projectRoot, dictionary.output.replaceAll('/', path.sep))
    rawById.set(dictionary.id, await readJson(rawPath))
  }

  const fallbackIndexes = ['dictionary/Middle', 'dictionary/4W']
    .map((id) => rawById.get(id))
    .filter(Boolean)
    .map((raw) => createExplanationIndex(raw.Results))

  const outputManifest = {
    schemaVersion: 1,
    defaultDictionaryId: 'general-common-1000',
    dictionaries: [],
  }

  for (const sourceDictionary of sourceManifest.dictionaries) {
    const identity = identityBySourceId[sourceDictionary.id]
    if (!identity) throw new Error(`Missing public identity for ${sourceDictionary.id}`)

    const [id, outputFile, name] = identity
    const rawDictionary = rawById.get(sourceDictionary.id)
    const entries = rawDictionary.Results.flatMap((result) => {
      const word = String(result.Entry ?? result.SearchWord ?? '').trim()
      if (!word) return []

      const ownExplanation = parseExplanation(result.Explanation)
      const explanation = hasUsefulExplanation(ownExplanation)
        ? ownExplanation
        : findFallbackExplanation(word, fallbackIndexes)

      return [
        {
          word,
          ...(explanation?.phonetic ? { phonetic: explanation.phonetic } : {}),
          ...(explanation?.lines.length ? { explanation: explanation.lines } : {}),
        },
      ]
    })

    const publicDictionary = {
      schemaVersion: 1,
      id,
      name,
      category: sourceDictionary.category,
      entries,
    }
    const serialized = `${JSON.stringify(publicDictionary)}\n`
    const destination = path.join(outputRoot, outputFile.replaceAll('/', path.sep))

    await mkdir(path.dirname(destination), { recursive: true })
    await writeFile(destination, serialized, 'utf8')

    outputManifest.dictionaries.push({
      id,
      name,
      category: sourceDictionary.category,
      entryCount: entries.length,
      file: outputFile,
      byteSize: Buffer.byteLength(serialized),
    })
  }

  await mkdir(outputRoot, { recursive: true })
  await writeFile(
    path.join(outputRoot, 'manifest.json'),
    `${JSON.stringify(outputManifest, null, 2)}\n`,
    'utf8',
  )

  const totalBytes = outputManifest.dictionaries.reduce(
    (sum, dictionary) => sum + dictionary.byteSize,
    0,
  )
  console.log(
    `Generated ${outputManifest.dictionaries.length} dictionaries (${totalBytes} bytes) in ${outputRoot}`,
  )
}

await main()
