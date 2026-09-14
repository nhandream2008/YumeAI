import { describe, expect, it } from 'vitest'

import { Emotion, inferEmotionFromText } from './emotions'

describe('inferEmotionFromText', () => {
  it('recognizes Vietnamese and English emotion signals', () => {
    expect(inferEmotionFromText('Tuyệt quá, mình rất vui!')).toBe(Emotion.Happy)
    expect(inferEmotionFromText('I am sorry. That is unfortunate.')).toBe(Emotion.Sad)
    expect(inferEmotionFromText('Bạn muốn thử cách này không?')).toBe(Emotion.Question)
  })

  it('gives strong negative signals priority over later positive words', () => {
    expect(inferEmotionFromText('I am angry, but I still love this idea.')).toBe(Emotion.Angry)
  })

  it('does not invent an emotion without a useful signal', () => {
    expect(inferEmotionFromText('Here are the requested steps.')).toBeUndefined()
  })
})
