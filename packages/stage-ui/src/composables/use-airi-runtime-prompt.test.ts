import { describe, expect, it, vi } from 'vitest'

import { useAiriRuntimePrompt } from './use-airi-runtime-prompt'

const i18nMock = vi.hoisted(() => ({
  hasTranslation: vi.fn<(key: string, locale: string) => boolean>(),
  locale: { value: 'en' },
}))

const live2dMock = vi.hoisted(() => ({
  availableMotions: [] as Array<{ motionName: string }>,
}))

const live2dSettingsMock = vi.hoisted(() => ({
  live2dExpressionEnabled: true,
}))

const expressionStoreMock = vi.hoisted(() => ({
  settingsSnapshot: {
    groups: [] as Array<{ name: string }>,
  },
  isExposedToLlm: vi.fn<(name: string) => boolean>(() => true),
}))

const stageModelMock = vi.hoisted(() => ({
  stageModelRenderer: 'live2d' as string | undefined,
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    locale: i18nMock.locale,
    t: (key: string, values?: Record<string, unknown>) => {
      const interpolation = values?.motions ?? values?.expressions
      return interpolation ? `${key}\n${interpolation}` : key
    },
    te: (key: string, currentLocale: string) => i18nMock.hasTranslation(key, currentLocale),
  }),
}))

vi.mock('../stores/live2d', () => ({
  useLive2dParams: () => live2dMock,
}))

vi.mock('../stores/settings/stage-model', () => ({
  useSettingsStageModel: () => stageModelMock,
}))

vi.mock('@proj-airi/stage-ui-live2d', () => ({
  useExpressionStore: () => expressionStoreMock,
  useSettingsLive2d: () => live2dSettingsMock,
}))

describe('useAiriRuntimePrompt', () => {
  it('keeps the YumeAI identity for a locale without split runtime prompts', () => {
    i18nMock.hasTranslation.mockReturnValue(false)

    expect(useAiriRuntimePrompt().value).toContain('Your name is YumeAI')
  })

  it('assembles the emotion and emoji prompt for a split locale', () => {
    i18nMock.hasTranslation.mockReturnValue(true)

    const prompt = useAiriRuntimePrompt().value

    expect(prompt).toContain('Your name is YumeAI')
    expect(prompt).toContain('Never call yourself AIRI, Ari, or NekoAI')
    expect(prompt).toContain('base.prompt.emotion')
    expect(prompt).toContain('base.prompt.suffix')
    expect(prompt).toContain('base.prompt.emoji')
  })

  it('includes exact motion groups exposed by the active Live2D model', () => {
    i18nMock.hasTranslation.mockReturnValue(true)
    live2dMock.availableMotions = [
      { motionName: 'haoqi' },
      { motionName: 'yaotou' },
      { motionName: 'haoqi' },
    ]
    stageModelMock.stageModelRenderer = 'live2d'

    const prompt = useAiriRuntimePrompt().value

    expect(prompt).toContain('base.prompt.motion')
    expect(prompt).toContain('["haoqi","yaotou"]')
  })

  it('includes exact Live2D expressions exposed to the selected model', () => {
    i18nMock.hasTranslation.mockReturnValue(true)
    expressionStoreMock.settingsSnapshot.groups = [
      { name: 'cry' },
      { name: 'white eyes' },
      { name: 'hidden' },
    ]
    expressionStoreMock.isExposedToLlm.mockImplementation(name => name !== 'hidden')
    stageModelMock.stageModelRenderer = 'live2d'

    const prompt = useAiriRuntimePrompt().value

    expect(prompt).toContain('base.prompt.expression')
    expect(prompt).toContain('["cry","white eyes"]')
  })
})
