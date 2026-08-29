import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveKeyFeedback } from './keyboardFeedback.ts'
import {
  formatTrainingCharacter,
  getFingerForCode,
  resolveKeyboardTarget,
} from './qwertyLayout.ts'

test('maps lowercase keys to their physical key and finger', () => {
  assert.deepEqual(resolveKeyboardTarget('f'), {
    character: 'f',
    code: 'KeyF',
    finger: 'left-index',
    shiftCode: null,
    shiftFinger: null,
  })
})

test('adds the opposite Shift key for uppercase letters', () => {
  assert.deepEqual(resolveKeyboardTarget('F'), {
    character: 'F',
    code: 'KeyF',
    finger: 'left-index',
    shiftCode: 'ShiftRight',
    shiftFinger: 'right-pinky',
  })

  assert.equal(resolveKeyboardTarget('J')?.shiftCode, 'ShiftLeft')
})

test('can map uppercase lessons directly without requiring Shift', () => {
  assert.deepEqual(resolveKeyboardTarget('F', { useShiftForUppercase: false }), {
    character: 'F',
    code: 'KeyF',
    finger: 'left-index',
    shiftCode: null,
    shiftFinger: null,
  })
})

test('formats lowercase training letters as uppercase without changing punctuation', () => {
  assert.equal(formatTrainingCharacter('a'), 'A')
  assert.equal(formatTrainingCharacter('Z'), 'Z')
  assert.equal(formatTrainingCharacter(';'), ';')
  assert.equal(formatTrainingCharacter('?'), '?')
})

test('maps shifted punctuation and whitespace', () => {
  assert.equal(resolveKeyboardTarget('?')?.code, 'Slash')
  assert.equal(resolveKeyboardTarget('?')?.shiftCode, 'ShiftLeft')
  assert.equal(resolveKeyboardTarget(' ')?.finger, 'right-thumb')
  assert.equal(resolveKeyboardTarget('\n')?.code, 'Enter')
})

test('returns null for unsupported characters and finds fingers by code', () => {
  assert.equal(resolveKeyboardTarget('你'), null)
  assert.equal(getFingerForCode('KeyK'), 'right-middle')
  assert.equal(getFingerForCode('Unknown'), null)
})

test('marks typed keys and required modifiers as correct or incorrect', () => {
  const uppercaseTarget = resolveKeyboardTarget('A')

  assert.equal(resolveKeyFeedback('KeyA', 'A', 'A', uppercaseTarget), 'correct')
  assert.equal(resolveKeyFeedback('KeyS', 's', 'A', uppercaseTarget), 'incorrect')
  assert.equal(resolveKeyFeedback('ShiftRight', null, 'A', uppercaseTarget), 'correct')
  assert.equal(resolveKeyFeedback('ShiftLeft', null, 'A', uppercaseTarget), 'incorrect')
  assert.equal(resolveKeyFeedback('KeyA', 'a', 'A', uppercaseTarget, false), 'correct')
})
