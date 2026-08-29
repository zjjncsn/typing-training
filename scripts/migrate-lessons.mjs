import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const legacyRoot = resolve(projectRoot, '..', 'jsdzt2006')

const migrations = [
  {
    sourceDirectory: resolve(legacyRoot, 'Data', 'English', 'T_Character', 'Standard'),
    outputFile: resolve(projectRoot, 'src', 'content', 'lessons', 'english-key-standard.json'),
    course: {
      schemaVersion: 1,
      id: 'english-key-standard',
      title: '英文基础键位',
      language: 'en',
      inputMode: 'physical-keyboard',
      layout: 'qwerty',
    },
    sourcePrefix: 'Data/English/T_Character/Standard',
  },
]

function parseLegacyLesson(buffer, filename, order, courseId, sourcePrefix) {
  const decoded = new TextDecoder('gbk').decode(buffer)
  const normalized = decoded.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  const lines = normalized.split('\n')
  const titleIndex = lines.findIndex((line) => line.trim().length > 0)

  if (titleIndex === -1) {
    throw new Error(`Lesson ${filename} is empty`)
  }

  const title = lines[titleIndex].trim()
  const content = lines
    .slice(titleIndex + 1)
    .join('\n')
    .trim()

  if (!content) {
    throw new Error(`Lesson ${filename} has no training content`)
  }

  const sourceId = filename.replace(/\.txt$/i, '')

  return {
    id: `${courseId}-${sourceId.padStart(2, '0')}`,
    order,
    title,
    content,
    source: `${sourcePrefix}/${filename}`,
  }
}

async function migrateCourse(migration) {
  const entries = await readdir(migration.sourceDirectory, { withFileTypes: true })
  const filenames = entries
    .filter((entry) => entry.isFile() && /\.txt$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'en', { numeric: true }))

  if (filenames.length === 0) {
    throw new Error(`No lesson files found in ${migration.sourceDirectory}`)
  }

  const lessons = await Promise.all(
    filenames.map(async (filename, index) => {
      const buffer = await readFile(resolve(migration.sourceDirectory, filename))
      return parseLegacyLesson(
        buffer,
        filename,
        index + 1,
        migration.course.id,
        migration.sourcePrefix,
      )
    }),
  )

  const output = {
    ...migration.course,
    lessons,
  }

  await mkdir(dirname(migration.outputFile), { recursive: true })
  await writeFile(migration.outputFile, `${JSON.stringify(output, null, 2)}\n`, 'utf8')

  console.log(`Migrated ${lessons.length} lessons to ${migration.outputFile}`)
}

for (const migration of migrations) {
  await migrateCourse(migration)
}
