import type { FingerId, KeyboardTarget } from './types'

export interface NumpadKeyDefinition {
  code: string
  label: string
  character: string | null
  finger: FingerId
  column: number
  row: number
  columnSpan?: number
  rowSpan?: number
}

const R = {
  thumb: 'right-thumb',
  index: 'right-index',
  middle: 'right-middle',
  ring: 'right-ring',
  pinky: 'right-pinky',
} as const satisfies Record<string, FingerId>

export const numpadKeys: NumpadKeyDefinition[] = [
  { code: 'NumLock', label: 'Num', character: null, finger: R.index, column: 1, row: 1 },
  { code: 'NumpadDivide', label: '/', character: '/', finger: R.middle, column: 2, row: 1 },
  { code: 'NumpadMultiply', label: '*', character: '*', finger: R.ring, column: 3, row: 1 },
  { code: 'NumpadSubtract', label: '−', character: '-', finger: R.pinky, column: 4, row: 1 },
  { code: 'Numpad7', label: '7', character: '7', finger: R.index, column: 1, row: 2 },
  { code: 'Numpad8', label: '8', character: '8', finger: R.middle, column: 2, row: 2 },
  { code: 'Numpad9', label: '9', character: '9', finger: R.ring, column: 3, row: 2 },
  { code: 'NumpadAdd', label: '+', character: '+', finger: R.pinky, column: 4, row: 2, rowSpan: 2 },
  { code: 'Numpad4', label: '4', character: '4', finger: R.index, column: 1, row: 3 },
  { code: 'Numpad5', label: '5', character: '5', finger: R.middle, column: 2, row: 3 },
  { code: 'Numpad6', label: '6', character: '6', finger: R.ring, column: 3, row: 3 },
  { code: 'Numpad1', label: '1', character: '1', finger: R.index, column: 1, row: 4 },
  { code: 'Numpad2', label: '2', character: '2', finger: R.middle, column: 2, row: 4 },
  { code: 'Numpad3', label: '3', character: '3', finger: R.ring, column: 3, row: 4 },
  { code: 'NumpadEnter', label: 'Enter', character: '\n', finger: R.pinky, column: 4, row: 4, rowSpan: 2 },
  { code: 'Numpad0', label: '0', character: '0', finger: R.thumb, column: 1, row: 5, columnSpan: 2 },
  { code: 'NumpadDecimal', label: '.', character: '.', finger: R.ring, column: 3, row: 5 },
]

const targetByCharacter = new Map(
  numpadKeys
    .filter((definition) => definition.character !== null)
    .map((definition) => [definition.character, definition] as const),
)
const keyByCode = new Map(numpadKeys.map((definition) => [definition.code, definition]))

export function resolveNumpadTarget(character: string | null): KeyboardTarget | null {
  if (character === null) return null

  const definition = targetByCharacter.get(character)
  if (!definition) return null

  return {
    character,
    code: definition.code,
    finger: definition.finger,
    shiftCode: null,
    shiftFinger: null,
  }
}

export function numpadCodeToCharacter(code: string): string | null {
  return keyByCode.get(code)?.character ?? null
}

export function getNumpadFingerForCode(code: string): FingerId | null {
  return keyByCode.get(code)?.finger ?? null
}
