import type { FingerId, KeyboardKeyDefinition, KeyboardTarget } from './types'

const L = {
  pinky: 'left-pinky',
  ring: 'left-ring',
  middle: 'left-middle',
  index: 'left-index',
  thumb: 'left-thumb',
} as const satisfies Record<string, FingerId>

const R = {
  thumb: 'right-thumb',
  index: 'right-index',
  middle: 'right-middle',
  ring: 'right-ring',
  pinky: 'right-pinky',
} as const satisfies Record<string, FingerId>

function key(
  code: string,
  label: string,
  finger: FingerId,
  shiftLabel?: string,
  width?: number,
): KeyboardKeyDefinition {
  return { code, label, finger, shiftLabel, width }
}

export const qwertyRows: KeyboardKeyDefinition[][] = [
  [
    key('Backquote', '`', L.pinky, '~'),
    key('Digit1', '1', L.pinky, '!'),
    key('Digit2', '2', L.ring, '@'),
    key('Digit3', '3', L.middle, '#'),
    key('Digit4', '4', L.index, '$'),
    key('Digit5', '5', L.index, '%'),
    key('Digit6', '6', R.index, '^'),
    key('Digit7', '7', R.index, '&'),
    key('Digit8', '8', R.middle, '*'),
    key('Digit9', '9', R.ring, '('),
    key('Digit0', '0', R.pinky, ')'),
    key('Minus', '-', R.pinky, '_'),
    key('Equal', '=', R.pinky, '+'),
    key('Backspace', 'Backspace', R.pinky, undefined, 2),
  ],
  [
    key('Tab', 'Tab', L.pinky, undefined, 1.5),
    key('KeyQ', 'Q', L.pinky),
    key('KeyW', 'W', L.ring),
    key('KeyE', 'E', L.middle),
    key('KeyR', 'R', L.index),
    key('KeyT', 'T', L.index),
    key('KeyY', 'Y', R.index),
    key('KeyU', 'U', R.index),
    key('KeyI', 'I', R.middle),
    key('KeyO', 'O', R.ring),
    key('KeyP', 'P', R.pinky),
    key('BracketLeft', '[', R.pinky, '{'),
    key('BracketRight', ']', R.pinky, '}'),
    key('Backslash', '\\', R.pinky, '|', 1.5),
  ],
  [
    key('CapsLock', 'Caps', L.pinky, undefined, 1.8),
    key('KeyA', 'A', L.pinky),
    key('KeyS', 'S', L.ring),
    key('KeyD', 'D', L.middle),
    key('KeyF', 'F', L.index),
    key('KeyG', 'G', L.index),
    key('KeyH', 'H', R.index),
    key('KeyJ', 'J', R.index),
    key('KeyK', 'K', R.middle),
    key('KeyL', 'L', R.ring),
    key('Semicolon', ';', R.pinky, ':'),
    key('Quote', "'", R.pinky, '"'),
    key('Enter', 'Enter', R.pinky, undefined, 2.2),
  ],
  [
    key('ShiftLeft', 'Shift', L.pinky, undefined, 2.3),
    key('KeyZ', 'Z', L.pinky),
    key('KeyX', 'X', L.ring),
    key('KeyC', 'C', L.middle),
    key('KeyV', 'V', L.index),
    key('KeyB', 'B', L.index),
    key('KeyN', 'N', R.index),
    key('KeyM', 'M', R.index),
    key('Comma', ',', R.middle, '<'),
    key('Period', '.', R.ring, '>'),
    key('Slash', '/', R.pinky, '?'),
    key('ShiftRight', 'Shift', R.pinky, undefined, 2.7),
  ],
  [
    key('Space', 'Space', R.thumb, undefined, 7),
  ],
]

export const qwertyKeys = qwertyRows.flat()

const characterTargets = new Map<string, Omit<KeyboardTarget, 'character'>>()

for (const definition of qwertyKeys) {
  const isLetter = definition.code.startsWith('Key')
  const baseCharacter = isLetter ? definition.label.toLowerCase() : definition.label

  if (baseCharacter.length === 1) {
    characterTargets.set(baseCharacter, {
      code: definition.code,
      finger: definition.finger,
      shiftCode: null,
      shiftFinger: null,
    })
  }

  const shiftedCharacter = isLetter ? definition.label : definition.shiftLabel
  if (shiftedCharacter?.length === 1) {
    const usesLeftHand = definition.finger.startsWith('left-')
    characterTargets.set(shiftedCharacter, {
      code: definition.code,
      finger: definition.finger,
      shiftCode: usesLeftHand ? 'ShiftRight' : 'ShiftLeft',
      shiftFinger: usesLeftHand ? R.pinky : L.pinky,
    })
  }
}

characterTargets.set(' ', {
  code: 'Space',
  finger: R.thumb,
  shiftCode: null,
  shiftFinger: null,
})
characterTargets.set('\n', {
  code: 'Enter',
  finger: R.pinky,
  shiftCode: null,
  shiftFinger: null,
})
characterTargets.set('\t', {
  code: 'Tab',
  finger: L.pinky,
  shiftCode: null,
  shiftFinger: null,
})

export function resolveKeyboardTarget(
  character: string | null,
  options: { useShiftForUppercase?: boolean } = {},
): KeyboardTarget | null {
  if (character === null) return null

  const lookupCharacter =
    options.useShiftForUppercase === false && /^[A-Z]$/.test(character)
      ? character.toLowerCase()
      : character
  const target = characterTargets.get(lookupCharacter)
  return target ? { character, ...target } : null
}

export function formatTrainingCharacter(character: string): string {
  return /^[a-z]$/.test(character) ? character.toUpperCase() : character
}

export function getFingerForCode(code: string): FingerId | null {
  return qwertyKeys.find((definition) => definition.code === code)?.finger ?? null
}

export const fingerLabels: Record<FingerId, string> = {
  'left-pinky': '左小指',
  'left-ring': '左无名指',
  'left-middle': '左中指',
  'left-index': '左食指',
  'left-thumb': '左拇指',
  'right-thumb': '右拇指',
  'right-index': '右食指',
  'right-middle': '右中指',
  'right-ring': '右无名指',
  'right-pinky': '右小指',
}

export type { FingerId, KeyboardKeyDefinition, KeyboardTarget } from './types'
