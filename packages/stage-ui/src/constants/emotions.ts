export enum Emotion {
  Happy = 'happy',
  Sad = 'sad',
  Angry = 'angry',
  Think = 'think',
  Surprise = 'surprised',
  Awkward = 'awkward',
  Question = 'question',
  Curious = 'curious',
  Neutral = 'neutral',
}

export const EMOTION_VALUES = Object.values(Emotion)

const EMOTION_TEXT_PATTERNS: ReadonlyArray<{ emotion: Emotion, pattern: RegExp }> = [
  { emotion: Emotion.Angry, pattern: /\b(?:angry|furious|hate|mad)\b|bực|ghét|giận|tức giận/iu },
  { emotion: Emotion.Sad, pattern: /\b(?:sad|sorry|unfortunately)\b|buồn|đáng tiếc|tiếc|xin lỗi/iu },
  { emotion: Emotion.Surprise, pattern: /\b(?:amazing|surprised|unbelievable|wow)\b|bất ngờ|không thể tin|ôi trời/iu },
  { emotion: Emotion.Happy, pattern: /\b(?:glad|great|happy|love|wonderful|yay)\b|hạnh phúc|tuyệt|vui|yêu/iu },
  { emotion: Emotion.Think, pattern: /\b(?:consider|perhaps|think)\b|có lẽ|để mình nghĩ|mình nghĩ/iu },
  { emotion: Emotion.Question, pattern: /[?？]/u },
]

/**
 * Infers a stage emotion from generated assistant text.
 *
 * Strong negative signals have priority because they should not be hidden by
 * positive words or punctuation later in the same sentence.
 */
export function inferEmotionFromText(text: string): Emotion | undefined {
  return EMOTION_TEXT_PATTERNS.find(({ pattern }) => pattern.test(text))?.emotion
}

export const EmotionHappyMotionName = 'Happy'
export const EmotionSadMotionName = 'Sad'
export const EmotionAngryMotionName = 'Angry'
export const EmotionAwkwardMotionName = 'Awkward'
export const EmotionThinkMotionName = 'Think'
export const EmotionSurpriseMotionName = 'Surprise'
export const EmotionQuestionMotionName = 'Question'
export const EmotionNeutralMotionName = 'Idle'
export const EmotionCuriousMotionName = 'Curious'

export const EMOTION_EmotionMotionName_value = {
  [Emotion.Happy]: EmotionHappyMotionName,
  [Emotion.Sad]: EmotionSadMotionName,
  [Emotion.Angry]: EmotionAngryMotionName,
  [Emotion.Think]: EmotionThinkMotionName,
  [Emotion.Surprise]: EmotionSurpriseMotionName,
  [Emotion.Awkward]: EmotionAwkwardMotionName,
  [Emotion.Question]: EmotionQuestionMotionName,
  [Emotion.Neutral]: EmotionNeutralMotionName,
  [Emotion.Curious]: EmotionCuriousMotionName,
}

export const EMOTION_VRMExpressionName_value = {
  [Emotion.Happy]: 'happy',
  [Emotion.Sad]: 'sad',
  [Emotion.Angry]: 'angry',
  [Emotion.Think]: 'think',
  [Emotion.Surprise]: 'surprised',
  [Emotion.Awkward]: 'neutral',
  [Emotion.Question]: 'think',
  [Emotion.Neutral]: 'neutral',
  [Emotion.Curious]: 'think',
} satisfies Record<Emotion, string | undefined>

export const EMOTION_SpineAnimationName_value = {
  [Emotion.Happy]: 'celebrate',
  [Emotion.Sad]: 'sad',
  [Emotion.Angry]: 'angry',
  [Emotion.Think]: 'think',
  [Emotion.Surprise]: 'surprise',
  [Emotion.Awkward]: 'awkward',
  [Emotion.Question]: 'question',
  [Emotion.Neutral]: 'idle',
  [Emotion.Curious]: 'curious',
} satisfies Record<Emotion, string>

export interface EmotionPayload {
  name: Emotion
  intensity: number
}
