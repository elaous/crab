/**
 * Safe arithmetic formula evaluator.
 *
 * Supported syntax:
 *   Numbers:   3.14, 1, .5
 *   Operators: + - * / ^ (power)
 *   Grouping:  (2 + 3) * 4
 *   Variables: wall_height, room_width   (named parameters)
 *   Constants: PI, E, TAU
 *   Functions: sqrt abs sin cos tan asin acos atan floor ceil round min max pow log exp
 */

const SAFE_PATTERN = /^[a-zA-Z0-9_.+\-*/^(),\s]+$/

const MATH_FUNCS: Record<string, (...args: number[]) => number> = {
  sqrt: Math.sqrt, abs: Math.abs,
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan, atan2: Math.atan2,
  floor: Math.floor, ceil: Math.ceil, round: Math.round,
  min: Math.min, max: Math.max, pow: Math.pow,
  log: Math.log, log2: Math.log2, log10: Math.log10, exp: Math.exp,
}

const MATH_CONSTS: Record<string, number> = {
  PI: Math.PI, E: Math.E, TAU: Math.PI * 2,
}

export function evaluateFormula(expr: string, params: Record<string, number> = {}): number {
  const trimmed = expr.trim()
  if (!trimmed) throw new Error('Empty expression')
  if (!SAFE_PATTERN.test(trimmed)) throw new Error(`Invalid characters in expression`)

  const safe = trimmed.replace(/\^/g, '**')
  const allVars = { ...MATH_CONSTS, ...params }
  const names = [...Object.keys(MATH_FUNCS), ...Object.keys(allVars)]
  const values = [...Object.values(MATH_FUNCS), ...Object.values(allVars)]

  // eslint-disable-next-line no-new-func
  const fn = new Function(...names, `"use strict"; return (${safe});`) as (...a: unknown[]) => unknown
  const result = fn(...values)

  if (typeof result !== 'number' || !isFinite(result) || isNaN(result)) {
    throw new Error('Result is not a finite number')
  }
  return result
}
