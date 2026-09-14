import { useExpressionStore, useSettingsLive2d } from '@proj-airi/stage-ui-live2d'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { EMOTION_EmotionMotionName_value, EMOTION_VALUES } from '../constants/emotions'
import { useLive2dParams } from '../stores/live2d'
import { useSettingsStageModel } from '../stores/settings/stage-model'

const RUNTIME_PROMPT_KEYS = [
  'base.prompt.emotion',
  'base.prompt.emoji',
  'base.prompt.suffix',
]

// Keep the runtime identity explicit so cards created with the previous AIRI
// prompt cannot make the assistant introduce itself with the old name.
export const YUME_IDENTITY_PROMPT = 'Identity: Your name is YumeAI. Always refer to yourself as YumeAI. Never call yourself AIRI, Ari, or NekoAI.'

/** Returns the localized emotion and emoji prompt for each model request. */
export function useAiriRuntimePrompt() {
  const { locale, t, te } = useI18n()
  const live2d = useLive2dParams()
  const stageModel = useSettingsStageModel()
  const expressionStore = useExpressionStore()
  const live2dSettings = useSettingsLive2d()

  return computed(() => {
    if (!RUNTIME_PROMPT_KEYS.every(key => te(key, locale.value)))
      return YUME_IDENTITY_PROMPT

    const promptParts = [
      YUME_IDENTITY_PROMPT,
      t('base.prompt.emotion'),
      EMOTION_VALUES
        .map(emotion => `- ${emotion} (Emotion for feeling ${EMOTION_EmotionMotionName_value[emotion]})`)
        .join('\n'),
    ]

    if (stageModel.stageModelRenderer === 'live2d' && te('base.prompt.motion', locale.value)) {
      const motionNames = [...new Set(
        live2d.availableMotions
          .map(motion => motion.motionName.trim())
          .filter(Boolean),
      )].slice(0, 64)

      if (motionNames.length > 0) {
        promptParts.push(t('base.prompt.motion', {
          motions: JSON.stringify(motionNames),
        }))
      }

      if (live2dSettings.live2dExpressionEnabled && te('base.prompt.expression', locale.value)) {
        const expressionNames = expressionStore.settingsSnapshot.groups
          .filter(group => expressionStore.isExposedToLlm(group.name))
          .map(group => group.name)
          .slice(0, 64)

        if (expressionNames.length > 0) {
          promptParts.push(t('base.prompt.expression', {
            expressions: JSON.stringify(expressionNames),
          }))
        }
      }
    }

    promptParts.push(t('base.prompt.suffix'), t('base.prompt.emoji'))
    return promptParts.join('\n\n')
  })
}
