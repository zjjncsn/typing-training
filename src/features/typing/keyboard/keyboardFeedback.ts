import type { KeyboardTarget, KeyFeedback } from './types'

export function resolveKeyFeedback(
  code: string,
  character: string | null,
  expectedCharacter: string | null,
  target: KeyboardTarget | null,
  caseSensitive = true,
): KeyFeedback {
  if (character !== null) {
    const correct = caseSensitive
      ? character === expectedCharacter
      : character.toLocaleLowerCase() === expectedCharacter?.toLocaleLowerCase()
    return correct ? 'correct' : 'incorrect'
  }

  return target?.shiftCode === code ? 'correct' : 'incorrect'
}
