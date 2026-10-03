import { describe, expect, it } from 'vitest'
import { countMastered, getMasteredProgress, isMastered, type ProficiencyLevel } from './proficiency'

describe('mastery', () => {
  it('counts L3 and L4 as mastered, nothing below', () => {
    const levels: ProficiencyLevel[] = ['notStarted', 'absent', 'level0', 'level1', 'level2', 'level3', 'level4']
    expect(levels.filter(isMastered)).toEqual(['level3', 'level4'])
  })

  it('counts L3 chapters in the mastered count and progress', () => {
    const levels: ProficiencyLevel[] = ['level3', 'level4', 'level2', 'level1']
    expect(countMastered(levels)).toBe(2)
    expect(getMasteredProgress(levels)).toBe(50)
  })
})
