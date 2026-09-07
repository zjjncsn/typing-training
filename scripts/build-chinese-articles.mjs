import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.resolve(projectRoot, '..', 'jsdzt2006', 'Data', 'Chinese', 'T_Article')
const outputRoot = path.join(projectRoot, 'public', 'data', 'chinese', 'articles')

const categories = [
  ['格言', 'adage', '格言'],
  ['散文', 'essay', '散文'],
  ['诗歌', 'poetry', '诗歌'],
  ['小说', 'novel', '小说'],
  ['笑话', 'joke', '笑话'],
  ['杂项', 'other', '杂项'],
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
    .split(String.fromCharCode(0x1a))
    .join('')
    .replace(/\uFFFD$/u, '')
    .replace(/\r\n?/gu, '\n')
    .replace(/\t/gu, '    ')
    .replace(/[ \t]+$/gmu, '')
    .replace(/^\n+/u, '')
    .replace(/\n+$/u, '')
}

function compareNumericNames(left, right) {
  return left.localeCompare(right, 'zh-CN', { numeric: true, sensitivity: 'base' })
}

function createExcerpt(content, limit = 64) {
  const normalized = content.replace(/\s+/gu, ' ').trim()
  const characters = Array.from(normalized)
  return characters.length <= limit ? normalized : `${characters.slice(0, limit).join('')}…`
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
      .filter((filename) => filename.toLocaleLowerCase('zh-CN').endsWith('.txt'))
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
        excerpt: createExcerpt(content),
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
    `Generated ${manifest.articles.length} Chinese articles (${totalBytes} bytes) in ${outputRoot}`,
  )
}

await main()
