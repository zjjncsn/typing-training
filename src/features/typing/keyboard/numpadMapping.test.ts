import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getNumpadFingerForCode,
  numpadCodeToCharacter,
  resolveNumpadTarget,
} from './numpadLayout.ts'

test('maps numeric training characters to physical numpad keys', () => {
  assert.deepEqual(resolveNumpadTarget('4'), {
    character: '4',
    code: 'Numpad4',
    finger: 'right-index',
    shiftCode: null,
    shiftFinger: null,
  })
  assert.equal(resolveNumpadTarget('+')?.code, 'NumpadAdd')
  assert.equal(resolveNumpadTarget('A'), null)
})

test('reads characters from physical numpad codes independently of Num Lock', () => {
  assert.equal(numpadCodeToCharacter('Numpad1'), '1')
  assert.equal(numpadCodeToCharacter('NumpadDecimal'), '.')
  assert.equal(numpadCodeToCharacter('NumpadEnter'), '\n')
  assert.equal(numpadCodeToCharacter('Digit1'), null)
})

test('maps numeric keypad columns to right-hand fingers', () => {
  assert.equal(getNumpadFingerForCode('Numpad7'), 'right-index')
  assert.equal(getNumpadFingerForCode('Numpad8'), 'right-middle')
  assert.equal(getNumpadFingerForCode('Numpad9'), 'right-ring')
  assert.equal(getNumpadFingerForCode('NumpadAdd'), 'right-pinky')
  assert.equal(getNumpadFingerForCode('Numpad0'), 'right-thumb')
  assert.equal(getNumpadFingerForCode('Digit1'), null)
})
