import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.resolve(projectRoot, '..', 'jsdzt2006', 'Data', 'Chinese', 'T_Character')
const outputRoot = path.join(projectRoot, 'public', 'data', 'chinese', 'syllables')

const categories = [
  ['连音词和异读词', 'liaison', '连音词和异读词'],
  ['模糊音和地区方言', 'regional', '模糊音和地区方言'],
  ['HSK_汉语水平考试', 'hsk', 'HSK 汉语水平考试'],
]

const gb18030Decoder = new TextDecoder('gb18030')

function compareNumericNames(left, right) {
  return left.localeCompare(right, 'zh-CN', { numeric: true, sensitivity: 'base' })
}

function normalizeLine(value) {
  return value.replace(/^\uFEFF/u, '').trim()
}

function normalizeInput(value) {
  return value
    .replace(/’/gu, "'")
    .replace(/\s+/gu, '')
    .toLocaleLowerCase('en-US')
}

function parseLesson(buffer, sourceName) {
  const lines = gb18030Decoder.decode(buffer).replace(/\r\n?/gu, '\n').split('\n')
  const title = lines.map(normalizeLine).find(Boolean)
  if (!title) throw new Error(`Syllable lesson ${sourceName} has no title`)

  const entries = []
  for (const line of lines) {
    const normalized = normalizeLine(line)
    const parts = normalized.split('@').map((part) => part.trim())
    if (parts.length < 3) continue

    const [displayPinyin, characters, rawInput] = parts
    const input = normalizeInput(rawInput)
    if (!displayPinyin || !characters || !input) continue
    entries.push({ displayPinyin, characters, input })
  }

  if (entries.length === 0) throw new Error(`Syllable lesson ${sourceName} has no entries`)
  return { title, entries }
}

async function main() {
  const manifest = {
    schemaVersion: 1,
    defaultLessonId: 'liaison-1',
    categories: [],
    lessons: [],
  }

  for (const [sourceDirectory, category, categoryName] of categories) {
    const sourcePath = path.join(sourceRoot, sourceDirectory)
    const filenames = (await readdir(sourcePath))
      .filter((filename) => filename.toLocaleLowerCase('en').endsWith('.txt'))
      .sort(compareNumericNames)

    manifest.categories.push({ id: category, name: categoryName })

    for (const filename of filenames) {
      const basename = path.basename(filename, path.extname(filename))
      const number = basename.replace(/^HSK_W/iu, '')
      const id = `${category}-${number.toLocaleLowerCase('en-US')}`
      const file = `${category}/${basename}.json`
      const sourceName = `${sourceDirectory}: ${filename}`
      const parsed = parseLesson(await readFile(path.join(sourcePath, filename)), sourceName)
      const lesson = {
        schemaVersion: 1,
        id,
        title: parsed.title,
        category,
        sourceName,
        entries: parsed.entries,
      }
      const serialized = `${JSON.stringify(lesson)}\n`
      const destination = path.join(outputRoot, ...file.split('/'))

      await mkdir(path.dirname(destination), { recursive: true })
      await writeFile(destination, serialized, 'utf8')

      manifest.lessons.push({
        id,
        title: lesson.title,
        category,
        sourceName,
        file,
        entryCount: lesson.entries.length,
        characterCount: lesson.entries.reduce(
          (sum, entry) => sum + Array.from(entry.input).length,
          0,
        ),
        byteSize: Buffer.byteLength(serialized),
      })
    }
  }

  await mkdir(outputRoot, { recursive: true })
  await writeFile(
    path.join(outputRoot, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  )

  console.log(`Generated ${manifest.lessons.length} syllable lessons in ${outputRoot}`)
}

await main()
