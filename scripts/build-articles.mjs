import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.resolve(projectRoot, '..', 'jsdzt2006', 'Data', 'English', 'T_Article')
const outputRoot = path.join(projectRoot, 'public', 'data', 'articles')

const categories = [
  ['Adage', 'adage', '名言'],
  ['Essay', 'essay', '散文'],
  ['Joke', 'joke', '笑话'],
  ['Novel', 'novel', '小说'],
  ['Other', 'other', '其他'],
  ['Poesy', 'poesy', '诗歌'],
  ['Program', 'program', '程序'],
]

const utf8Decoder = new TextDecoder('utf-8', { fatal: true })
const gb18030Decoder = new TextDecoder('gb18030')

function decodeArticle(buffer) {
  try {
    return utf8Decoder.decode(buffer)
  } catch {
    return gb18030Decoder.decode(buffer)
  }
}

function normalizeContent(value) {
  return value
    .replace(/^\uFEFF/u, '')
    .replace(/\r\n?/gu, '\n')
    .replace(/\t/gu, '    ')
    .replace(/[ \t]+$/gmu, '')
    .replace(/^\n+/u, '')
    .replace(/\n+$/u, '')
}

function compareNumericNames(left, right) {
  return Number.parseInt(left, 10) - Number.parseInt(right, 10)
}

async function main() {
  const manifest = {
    schemaVersion: 1,
    defaultArticleId: 'adage-1',
    categories: [],
    articles: [],
  }

  for (const [sourceDirectory, category, categoryName] of categories) {
    const sourcePath = path.join(sourceRoot, sourceDirectory)
    const filenames = (await readdir(sourcePath))
      .filter((filename) => filename.toLocaleLowerCase('en').endsWith('.txt'))
      .sort(compareNumericNames)

    manifest.categories.push({ id: category, name: categoryName })

    for (const filename of filenames) {
      const number = path.basename(filename, path.extname(filename))
      const id = `${category}-${number}`
      const outputFile = `${category}/${number}.json`
      const content = normalizeContent(
        decodeArticle(await readFile(path.join(sourcePath, filename))),
      )
      if (!content) throw new Error(`Article ${sourceDirectory}/${filename} is empty`)

      const article = {
        schemaVersion: 1,
        id,
        title: `${categoryName} ${number}`,
        category,
        sourceName: `${sourceDirectory}: ${filename}`,
        content,
      }
      const serialized = `${JSON.stringify(article)}\n`
      const destination = path.join(outputRoot, ...outputFile.split('/'))

      await mkdir(path.dirname(destination), { recursive: true })
      await writeFile(destination, serialized, 'utf8')

      manifest.articles.push({
        id,
        title: article.title,
        category,
        sourceName: article.sourceName,
        file: outputFile,
        characterCount: Array.from(content).length,
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

  const totalBytes = manifest.articles.reduce((sum, article) => sum + article.byteSize, 0)
  console.log(
    `Generated ${manifest.articles.length} articles (${totalBytes} bytes) in ${outputRoot}`,
  )
}

await main()
