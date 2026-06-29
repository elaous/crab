import { describe, it, expect } from 'vitest'
import { MATERIAL_PRESETS, MATERIAL_CATEGORIES, getPreset } from '../materialLibrary'

describe('materialLibrary', () => {
  it('exports a non-empty preset list', () => {
    expect(MATERIAL_PRESETS.length).toBeGreaterThan(0)
  })

  it('every preset has required fields', () => {
    for (const p of MATERIAL_PRESETS) {
      expect(p.id).toBeTruthy()
      expect(p.name).toBeTruthy()
      expect(p.category).toBeTruthy()
      expect(p.color).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(p.roughness).toBeGreaterThanOrEqual(0)
      expect(p.roughness).toBeLessThanOrEqual(1)
      expect(p.metalness).toBeGreaterThanOrEqual(0)
      expect(p.metalness).toBeLessThanOrEqual(1)
      expect(p.opacity).toBeGreaterThan(0)
      expect(p.opacity).toBeLessThanOrEqual(1)
    }
  })

  it('preset ids are unique', () => {
    const ids = MATERIAL_PRESETS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('MATERIAL_CATEGORIES matches preset categories', () => {
    const usedCats = new Set(MATERIAL_PRESETS.map(p => p.category))
    for (const cat of MATERIAL_CATEGORIES) {
      expect(usedCats.has(cat)).toBe(true)
    }
  })

  it('getPreset returns correct preset by id', () => {
    const first = MATERIAL_PRESETS[0]
    expect(getPreset(first.id)).toEqual(first)
  })

  it('getPreset returns undefined for unknown id', () => {
    expect(getPreset('nonexistent-id')).toBeUndefined()
  })
})
