export interface ContentLine {
  start: number
  end: number
  text: string
}

/**
 * Splits lesson content into typeable lines. Positions are code-point indices
 * matching the typing engine. Blank (whitespace-only) separator lines are
 * skipped, mirroring the engine's autoAdvanceBlankLines behavior.
 */
export function splitContentLines(content: string): ContentLine[] {
  const characters = Array.from(content)
  const lines: ContentLine[] = []
  let start = 0

  for (let index = 0; index < characters.length; index++) {
    if (characters[index] !== '\n') continue

    pushLine(lines, start, index, characters)
    start = index + 1
  }

  pushLine(lines, start, characters.length, characters)

  return lines.filter((line) => line.text.trim().length > 0)
}

function pushLine(
  lines: ContentLine[],
  start: number,
  end: number,
  characters: string[],
): void {
  if (end <= start) return

  lines.push({ start, end, text: characters.slice(start, end).join('') })
}

/**
 * Resolves the line a cursor position belongs to. A position on a line's
 * trailing newline (or inside skipped whitespace) belongs to the line it ends.
 */
export function resolveLineIndexAt(lines: ContentLine[], position: number): number {
  let resolved = 0

  for (let index = 0; index < lines.length; index++) {
    if (position >= lines[index]!.start) resolved = index
    if (position < lines[index]!.end) return resolved
  }

  return resolved
}
