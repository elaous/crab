import { describe, it, expect } from 'vitest'
import { evaluateFormula } from '../evaluator'

describe('evaluateFormula', () => {
  it('evaluates plain numbers', () => {
    expect(evaluateFormula('3.14')).toBeCloseTo(3.14)
    expect(evaluateFormula('0')).toBe(0)
  })

  it('evaluates arithmetic', () => {
    expect(evaluateFormula('2 + 3')).toBe(5)
    expect(evaluateFormula('10 - 4')).toBe(6)
    expect(evaluateFormula('3 * 4')).toBe(12)
    expect(evaluateFormula('10 / 4')).toBe(2.5)
  })

  it('evaluates power with ^', () => {
    expect(evaluateFormula('2^10')).toBe(1024)
    expect(evaluateFormula('3^2')).toBe(9)
  })

  it('evaluates parentheses', () => {
    expect(evaluateFormula('(2 + 3) * 4')).toBe(20)
    expect(evaluateFormula('2 * (3 + 4)')).toBe(14)
  })

  it('substitutes named parameters', () => {
    expect(evaluateFormula('wall_height * 2', { wall_height: 3 })).toBe(6)
    expect(evaluateFormula('a + b', { a: 1, b: 2 })).toBe(3)
    expect(evaluateFormula('room_w / 2 + 0.5', { room_w: 5 })).toBe(3)
  })

  it('uses built-in constants', () => {
    expect(evaluateFormula('PI')).toBeCloseTo(Math.PI)
    expect(evaluateFormula('TAU')).toBeCloseTo(Math.PI * 2)
    expect(evaluateFormula('E')).toBeCloseTo(Math.E)
  })

  it('uses math functions', () => {
    expect(evaluateFormula('sqrt(4)')).toBe(2)
    expect(evaluateFormula('abs(-5)')).toBe(5)
    expect(evaluateFormula('floor(3.9)')).toBe(3)
    expect(evaluateFormula('ceil(3.1)')).toBe(4)
    expect(evaluateFormula('round(3.5)')).toBe(4)
    expect(evaluateFormula('min(2, 5)')).toBe(2)
    expect(evaluateFormula('max(2, 5)')).toBe(5)
    expect(evaluateFormula('pow(2, 8)')).toBe(256)
  })

  it('throws on empty expression', () => {
    expect(() => evaluateFormula('')).toThrow()
  })

  it('throws on invalid characters', () => {
    expect(() => evaluateFormula('alert("xss")')).toThrow()
    expect(() => evaluateFormula('1; 2')).toThrow()
  })

  it('throws on undefined variable', () => {
    expect(() => evaluateFormula('unknown_var')).toThrow()
  })

  it('throws when result is not finite', () => {
    expect(() => evaluateFormula('1/0')).toThrow()
  })
})
