import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.resolve(projectRoot, '..', 'jsdzt2006', 'Data', 'Chinese', 'T_Word')
const outputRoot = path.join(projectRoot, 'public', 'data', 'chinese', 'words')

const categories = [
  ['常用词汇', 'general', '常用词汇'],
  ['HSK词汇', 'hsk', 'HSK 词汇'],
  ['专业词汇', 'professional', '专业词汇'],
]

const professionalSlugs = new Map([
  ['地理', 'geography'],
  ['电子', 'electronics'],
  ['化学', 'chemistry'],
  ['计算机', 'computer'],
  ['建筑', 'architecture'],
  ['农学', 'agriculture'],
  ['石油', 'petroleum'],
  ['数学', 'mathematics'],
  ['物理', 'physics'],
  ['心理学', 'psychology'],
  ['医学', 'medicine'],
])

const gb18030Decoder = new TextDecoder('gb18030')

function compareNumericNames(left, right) {
  return left.localeCompare(right, 'zh-CN', { numeric: true, sensitivity: 'base' })
}

function lessonSlug(filename, category) {
  const basename = path.basename(filename, path.extname(filename))
  if (category === 'general') return 'common'
  if (category === 'hsk') return basename.replace(/^HSK_/iu, '').toLocaleLowerCase('en-US')

  const subject = basename.replace(/CN$/iu, '')
  const slug = professionalSlugs.get(subject)
  if (!slug) throw new Error(`No slug configured for professional lesson ${filename}`)
  return slug
}

function parseLesson(buffer, sourceName) {
  const lines = gb18030Decoder
    .decode(buffer)
    .replace(/^\uFEFF/u, '')
    .replace(/\r\n?/gu, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const [title, ...words] = lines
  if (!title) throw new Error(`Chinese word lesson ${sourceName} has no title`)
  if (words.length === 0) throw new Error(`Chinese word lesson ${sourceName} has no words`)
  return { title, words }
}

async function main() {
  await rm(outputRoot, { recursive: true, force: true })

  const manifest = {
    schemaVersion: 1,
    defaultLessonId: 'general-common',
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
      const slug = lessonSlug(filename, category)
      const id = `${category}-${slug}`
      const file = `${category}/${slug}.json`
      const sourceName = `${sourceDirectory}: ${filename}`
      const parsed = parseLesson(await readFile(path.join(sourcePath, filename)), sourceName)
      const lesson = {
        schemaVersion: 1,
        id,
        title: parsed.title,
        category,
        sourceName,
        words: parsed.words,
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
        wordCount: lesson.words.length,
        characterCount: lesson.words.reduce((sum, word) => sum + Array.from(word).length, 0),
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
  console.log(`Generated ${manifest.lessons.length} Chinese word lessons in ${outputRoot}`)
}

await main()
