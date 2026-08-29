export type FingerId =
  | 'left-pinky'
  | 'left-ring'
  | 'left-middle'
  | 'left-index'
  | 'left-thumb'
  | 'right-thumb'
  | 'right-index'
  | 'right-middle'
  | 'right-ring'
  | 'right-pinky'

export interface KeyboardKeyDefinition {
  code: string
  label: string
  shiftLabel?: string
  finger: FingerId
  width?: number
}

export interface KeyboardTarget {
  character: string
  code: string
  finger: FingerId
  shiftCode: 'ShiftLeft' | 'ShiftRight' | null
  shiftFinger: FingerId | null
}

export type KeyFeedback = 'correct' | 'incorrect'
