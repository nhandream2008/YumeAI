<script setup lang="ts">
import type { SpeechProviderWithExtraOptions } from '@xsai-ext/providers/utils'
import type { UnElevenLabsOptions } from 'unspeech'

import {
  SpeechPlayground,
  SpeechProviderSettings,
} from '@proj-airi/stage-ui/components'
import { useSpeechStore } from '@proj-airi/stage-ui/stores/modules/speech'
import { useProviderConfigStore } from '@proj-airi/stage-ui/stores/providers/config'
import { useProviderStore } from '@proj-airi/stage-ui/stores/providers/provider'
import { FieldCheckbox, FieldCombobox, FieldRange } from '@proj-airi/ui'
import { watchDebounced } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const providerId = 'elevenlabs'
const defaultModel = 'eleven_flash_v2_5'

const languageOverrideModels = new Set([
  'eleven_v3',
  'eleven_v3_conversational',
  'eleven_flash_v2_5',
  'eleven_turbo_v2_5',
])

const elevenLabsModels = [
  {
    value: 'eleven_v3',
    label: 'Eleven v3',
    descriptionKey: 'v3',
  },
  {
    value: 'eleven_v3_conversational',
    label: 'Eleven v3 Conversational',
    descriptionKey: 'v3-conversational',
  },
  {
    value: 'eleven_flash_v2_5',
    label: 'Eleven Flash v2.5',
    descriptionKey: 'flash-v2-5',
  },
  {
    value: 'eleven_turbo_v2_5',
    label: 'Eleven Turbo v2.5',
    descriptionKey: 'turbo-v2-5',
  },
  {
    value: 'eleven_multilingual_v2',
    label: 'Eleven Multilingual v2',
    descriptionKey: 'multilingual-v2',
  },
  {
    value: 'eleven_turbo_v2',
    label: 'Eleven Turbo v2',
    descriptionKey: 'turbo-v2',
  },
  {
    value: 'eleven_flash_v2',
    label: 'Eleven Flash v2',
    descriptionKey: 'flash-v2',
  },
]

const languageOptions = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
  { value: 'bg', label: 'Български' },
  { value: 'zh', label: '中文' },
  { value: 'hr', label: 'Hrvatski' },
  { value: 'cs', label: 'Čeština' },
  { value: 'da', label: 'Dansk' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'fil', label: 'Filipino' },
  { value: 'fi', label: 'Suomi' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'el', label: 'Ελληνικά' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'hu', label: 'Magyar' },
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'it', label: 'Italiano' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'ms', label: 'Bahasa Melayu' },
  { value: 'no', label: 'Norsk' },
  { value: 'pl', label: 'Polski' },
  { value: 'pt', label: 'Português' },
  { value: 'ro', label: 'Română' },
  { value: 'ru', label: 'Русский' },
  { value: 'sk', label: 'Slovenčina' },
  { value: 'es', label: 'Español' },
  { value: 'sv', label: 'Svenska' },
  { value: 'ta', label: 'தமிழ்' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'uk', label: 'Українська' },
]

// Default voice settings specific to ElevenLabs
const defaultVoiceSettings = {
  similarityBoost: 0.75,
  stability: 0.5,
  speed: 1.0,
  style: 0,
  useSpeakerBoost: true,
}

interface ElevenLabsProviderConfig extends Record<string, unknown> {
  apiKey?: string
  baseUrl?: string
  languageCode?: string
  model?: string
  voiceSettings?: Record<string, unknown>
}

const speechStore = useSpeechStore()
const providersStore = useProviderStore()
const providerStore = useProviderConfigStore()
const { configs: providers } = storeToRefs(providerStore)
const { t } = useI18n()

const modelOptions = computed(() => elevenLabsModels.map(model => ({
  value: model.value,
  label: model.label,
  description: t(`settings.pages.providers.provider.elevenlabs.models.${model.descriptionKey}`),
})))

const config = computed(() => providers.value[providerId] as ElevenLabsProviderConfig | undefined)

function updateProviderConfig(patch: Partial<ElevenLabsProviderConfig>) {
  providerStore.patchProviderConfig(providerId, patch)
}

const model = computed({
  get: () => config.value?.model || defaultModel,
  set: value => updateProviderConfig({ model: value }),
})

const languageCode = computed({
  get: () => config.value?.languageCode || 'vi',
  set: value => updateProviderConfig({ languageCode: value }),
})

const supportsLanguageOverride = computed(() => languageOverrideModels.has(model.value))

// Check if API key is configured
const apiKeyConfigured = computed(() => {
  const apiKey = providers.value[providerId]?.apiKey
  return typeof apiKey === 'string' && apiKey.trim().length > 0
})

// Get available voices for ElevenLabs
const availableVoices = computed(() => {
  return speechStore.availableVoices[providerId] || []
})

// Generate speech with ElevenLabs-specific parameters
async function handleGenerateSpeech(input: string, voiceId: string, _useSSML: boolean) {
  const providerConfig = providerStore.getProviderConfig(providerId)
  if (!providerConfig)
    throw new Error(t('settings.pages.providers.provider.elevenlabs.playground.validation.error-missing-api-key'))

  const apiKey = typeof providerConfig.apiKey === 'string' ? providerConfig.apiKey.trim() : ''
  if (!apiKey)
    throw new Error(t('settings.pages.providers.provider.elevenlabs.playground.validation.error-missing-api-key'))

  const normalizedProviderConfig: ElevenLabsProviderConfig = { ...providerConfig, apiKey }
  providerStore.patchProviderConfig(providerId, normalizedProviderConfig)
  await providersStore.disposeProviderInstance(providerId)
  const provider = await providersStore.getProviderInstance(providerId) as SpeechProviderWithExtraOptions<string, UnElevenLabsOptions>
  if (!provider) {
    throw new Error(t('settings.pages.providers.provider.elevenlabs.playground.validation.error-unknown'))
  }

  const selectedModel = normalizedProviderConfig.model || defaultModel
  const savedVoiceSettings = normalizedProviderConfig.voiceSettings
  const voiceSettings = savedVoiceSettings && typeof savedVoiceSettings === 'object' && !Array.isArray(savedVoiceSettings)
    ? savedVoiceSettings as Record<string, unknown>
    : {}

  const speechOptions: UnElevenLabsOptions = {
    voiceSettings: {
      similarityBoost: typeof voiceSettings.similarityBoost === 'number'
        ? voiceSettings.similarityBoost
        : defaultVoiceSettings.similarityBoost,
      stability: typeof voiceSettings.stability === 'number'
        ? voiceSettings.stability
        : defaultVoiceSettings.stability,
      speed: typeof voiceSettings.speed === 'number'
        ? voiceSettings.speed
        : defaultVoiceSettings.speed,
      style: typeof voiceSettings.style === 'number'
        ? voiceSettings.style
        : defaultVoiceSettings.style,
      useSpeakerBoost: typeof voiceSettings.useSpeakerBoost === 'boolean'
        ? voiceSettings.useSpeakerBoost
        : defaultVoiceSettings.useSpeakerBoost,
    },
  }

  if (languageOverrideModels.has(selectedModel))
    speechOptions.languageCode = normalizedProviderConfig.languageCode || 'vi'

  return await speechStore.speech(
    provider,
    selectedModel,
    input,
    voiceId,
    speechOptions,
  )
}

watchDebounced(() => [
  providers.value[providerId]?.apiKey,
  providers.value[providerId]?.baseUrl,
], async () => {
  const providerConfig = providerStore.getProviderConfig(providerId)
  if (!providerConfig)
    return

  if ((await providersStore.validateProviderConfig(providerId, providerConfig)).valid) {
    await speechStore.loadVoicesForProvider(providerId)
  }
}, {
  debounce: 800,
  immediate: true,
})
</script>

<template>
  <SpeechProviderSettings
    :provider-id="providerId"
    :default-model="defaultModel"
    :additional-settings="defaultVoiceSettings"
  >
    <template #basic-settings>
      <FieldCombobox
        v-model="model"
        :label="t('settings.pages.providers.provider.elevenlabs.fields.field.model.label')"
        :description="t('settings.pages.providers.provider.elevenlabs.fields.field.model.description')"
        :options="modelOptions"
      />
      <FieldCombobox
        v-model="languageCode"
        :disabled="!supportsLanguageOverride"
        :label="t('settings.pages.providers.provider.elevenlabs.fields.field.language.label')"
        :description="t(supportsLanguageOverride
          ? 'settings.pages.providers.provider.elevenlabs.fields.field.language.description'
          : 'settings.pages.providers.provider.elevenlabs.fields.field.language.unavailable-description')"
        :options="languageOptions"
      />
    </template>

    <template #voice-settings="{ voiceSettings }">
      <div flex="~ col gap-4">
        <FieldRange
          v-model="voiceSettings.speed"
          :label="t('settings.pages.providers.provider.elevenlabs.fields.field.speed.label')"
          :description="t('settings.pages.providers.provider.elevenlabs.fields.field.speed.description')"
          :min="0.7"
          :max="1.2" :step="0.01"
        />

        <FieldRange
          v-model="voiceSettings.style"
          :label="t('settings.pages.providers.provider.elevenlabs.fields.field.style.label')"
          :description="t('settings.pages.providers.provider.elevenlabs.fields.field.style.description')"
          :min="0"
          :max="1" :step="0.01"
        />

        <FieldRange
          v-model="voiceSettings.stability"
          :label="t('settings.pages.providers.provider.elevenlabs.fields.field.stability.label')"
          :description="t('settings.pages.providers.provider.elevenlabs.fields.field.stability.description')"
          :min="0"
          :max="1" :step="0.01"
        />

        <FieldRange
          v-model="voiceSettings.similarityBoost"
          :label="t('settings.pages.providers.provider.elevenlabs.fields.field.simularity-boost.label')"
          :description="t('settings.pages.providers.provider.elevenlabs.fields.field.simularity-boost.description')"
          :min="0"
          :max="1" :step="0.01"
        />

        <FieldCheckbox
          v-model="voiceSettings.useSpeakerBoost"
          :label="t('settings.pages.providers.provider.elevenlabs.fields.field.speaker-boost.label')"
          :description="t('settings.pages.providers.provider.elevenlabs.fields.field.speaker-boost.description')"
        />
      </div>
    </template>

    <template #playground>
      <SpeechPlayground
        :available-voices="availableVoices"
        :generate-speech="handleGenerateSpeech"
        :api-key-configured="apiKeyConfigured"
        :default-text="t('settings.pages.providers.provider.elevenlabs.playground.default-text')"
      />
    </template>
  </SpeechProviderSettings>
</template>

<route lang="yaml">
  meta:
    layout: settings
    stageTransition:
      name: slide
  </route>
