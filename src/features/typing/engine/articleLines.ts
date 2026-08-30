export type ArticleLineBreak = 'wrap' | 'newline' | 'end'

export interface ArticleLine {
  start: number
  displayEnd: number
  inputEnd: number
  text: string
  breakKind: ArticleLineBreak
}

function createLine(
  characters: string[],
  start: number,
  displayEnd: number,
  inputEnd: number,
  breakKind: ArticleLineBreak,
): ArticleLine {
  return {
    start,
    displayEnd,
    inputEnd,
    text: characters.slice(start, displayEnd).join(''),
    breakKind,
  }
}

export function wrapArticleContent(content: string, columnLimit: number): ArticleLine[] {
  const characters = Array.from(content)
  const safeLimit = Math.max(1, Math.trunc(columnLimit))
  const lines: ArticleLine[] = []
  let start = 0

  while (start < characters.length) {
    if (characters[start] === '\n') {
      lines.push(createLine(characters, start, start, start + 1, 'newline'))
      start += 1
      continue
    }

    const hardEnd = Math.min(start + safeLimit, characters.length)
    const newlineIndex = characters.indexOf('\n', start)

    if (newlineIndex >= start && newlineIndex < hardEnd) {
      lines.push(createLine(characters, start, newlineIndex, newlineIndex + 1, 'newline'))
      start = newlineIndex + 1
      continue
    }

    if (hardEnd === characters.length) {
      lines.push(createLine(characters, start, hardEnd, hardEnd, 'end'))
      break
    }

    if (characters[hardEnd] === '\n') {
      lines.push(createLine(characters, start, hardEnd, hardEnd + 1, 'newline'))
      start = hardEnd + 1
      continue
    }

    let wrapEnd = hardEnd
    for (let index = hardEnd - 1; index >= start; index -= 1) {
      if (characters[index] === ' ') {
        wrapEnd = index + 1
        break
      }
    }

    lines.push(createLine(characters, start, wrapEnd, wrapEnd, 'wrap'))
    start = wrapEnd
  }

  return lines
}

export function resolveArticleLineIndex(lines: readonly ArticleLine[], position: number): number {
  if (lines.length === 0) return 0
  const index = lines.findIndex((line) => position >= line.start && position < line.inputEnd)
  return index >= 0 ? index : lines.length - 1
}
