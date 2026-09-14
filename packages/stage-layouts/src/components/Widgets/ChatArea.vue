<script setup lang="ts">
import type { ChatComposerController } from '@proj-airi/stage-ui/components/scenarios/chat'

import { isStageTamagotchi } from '@proj-airi/stage-shared'
import { ChatReplyPreview } from '@proj-airi/stage-ui/components/scenarios/chat'
import { HearingConfig } from '@proj-airi/stage-ui/components/scenarios/dialogs/audio-input/index'
import { useAudioAnalyzer } from '@proj-airi/stage-ui/composables'
import { useAudioContext } from '@proj-airi/stage-ui/stores/audio'
import { useAiriCardStore } from '@proj-airi/stage-ui/stores/modules/airi-card'
import { useConsciousnessStore } from '@proj-airi/stage-ui/stores/modules/consciousness'
import { useWebSearchStore } from '@proj-airi/stage-ui/stores/modules/web-search'
import { useProviderStore } from '@proj-airi/stage-ui/stores/providers/provider'
import { useSettingsAudioDevice } from '@proj-airi/stage-ui/stores/settings'
import { BasicButton, BasicTextarea } from '@proj-airi/ui'
import { useLocalStorage } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
} from 'reka-ui'
import {
  computed,
  nextTick,
  onUnmounted,
  shallowRef,
  useTemplateRef,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'

import IndicatorMicVolume from './IndicatorMicVolume.vue'

import { useTranscriptions } from '../../composables/use-transcriptions'
import { useStopSpeakingButton } from '../../composables/useStopSpeakingButton'

const props = defineProps<{
  composer: ChatComposerController<never>
}>()

const composerRoot = useTemplateRef<HTMLDivElement>('composer')

const messageInput = props.composer.draft
const hearingPopoverOpen = shallowRef(false)
const modelPopoverOpen = shallowRef(false)
const isComposing = props.composer.isComposing
const DOUBLE_ENTER_INTERVAL_MS = 300
const TRAILING_NEWLINES_REGEX = /[\r\n]+$/
const SEND_MODES = ['enter', 'ctrl-enter', 'double-enter'] as const
type SendMode = (typeof SEND_MODES)[number]
const sendMode = useLocalStorage<SendMode>(
  'ui/chat/settings/send-mode',
  'enter',
)
const lastEnterTime = shallowRef(0)

const { askPermission } = useSettingsAudioDevice()
const { enabled, stream } = storeToRefs(useSettingsAudioDevice())
const replyTarget = props.composer.replyTarget
const { audioContext } = useAudioContext()
const { t } = useI18n()
const airiCardStore = useAiriCardStore()
const consciousnessStore = useConsciousnessStore()
const providerStore = useProviderStore()
const { moduleChatProvidersMetadata } = storeToRefs(providerStore)
const {
  activeModel,
  activeProvider,
  isLoadingActiveProviderModels,
  providerModels,
} = storeToRefs(consciousnessStore)
const { enabled: webSearchEnabled } = storeToRefs(useWebSearchStore())
const activeModelLabel = computed(() => {
  const selectedModel = providerModels.value.find(model => model.id === activeModel.value)
  return selectedModel?.name || activeModel.value || t('stage.neko.noModel')
})
const sendModeLabels = computed<Record<SendMode, string>>(() => ({
  'enter': t('stage.send-mode.enter'),
  'ctrl-enter': t('stage.send-mode.ctrl-enter'),
  'double-enter': t('stage.send-mode.double-enter'),
}))

const {
  isListening,
  startStreamingTranscription,
  stopStreamingTranscription,
  autoSendEnabled,
} = useTranscriptions({
  messageInputRef: messageInput,
  sendMessage: handleSend,
  isStageTamagotchi,
})
const { showStopSpeakingButton, stopSpeakingFromChat } = useStopSpeakingButton()

async function handleSend() {
  await props.composer.submit()
}

async function handleCancelReply() {
  props.composer.clearReply()
  await nextTick()
  composerRoot.value?.querySelector('textarea')?.focus()
}

function sendFromKeyboard() {
  messageInput.value = messageInput.value.replace(TRAILING_NEWLINES_REGEX, '')
  void handleSend()
}

function handleMessageInputKeydown(event: KeyboardEvent) {
  if (isComposing.value || event.key !== 'Enter')
    return

  const hasControl = event.ctrlKey || event.metaKey
  const hasShift = event.shiftKey

  switch (sendMode.value) {
    case 'enter':
      if (!hasShift && !hasControl) {
        event.preventDefault()
        sendFromKeyboard()
      }
      return
    case 'ctrl-enter':
      if (hasControl) {
        event.preventDefault()
        sendFromKeyboard()
      }
      return
    case 'double-enter':
      if (!hasShift && !hasControl) {
        const now = Date.now()
        if (now - lastEnterTime.value < DOUBLE_ENTER_INTERVAL_MS) {
          event.preventDefault()
          sendFromKeyboard()
          lastEnterTime.value = 0
        }
        else {
          lastEnterTime.value = now
        }
      }
  }
}

async function selectProvider(providerId: string) {
  activeProvider.value = providerId
  await consciousnessStore.loadModelsForProvider(providerId)
}

async function selectModel(modelId: string) {
  if (!activeProvider.value)
    return

  activeModel.value = modelId
  await airiCardStore.updateActiveCardConsciousness({
    provider: activeProvider.value,
    model: modelId,
  })
  modelPopoverOpen.value = false
}

watch(hearingPopoverOpen, async (value) => {
  if (value) {
    await askPermission()
  }
})

const { startAnalyzer, stopAnalyzer } = useAudioAnalyzer()
let analyzerSource: MediaStreamAudioSourceNode | undefined

function teardownAnalyzer() {
  try {
    analyzerSource?.disconnect()
  }
  catch {}
  analyzerSource = undefined
  stopAnalyzer()
}

async function setupAnalyzer() {
  teardownAnalyzer()
  if (!hearingPopoverOpen.value || !enabled.value || !stream.value)
    return
  if (audioContext.state === 'suspended')
    await audioContext.resume()
  const analyser = startAnalyzer(audioContext)
  if (!analyser)
    return
  analyzerSource = audioContext.createMediaStreamSource(stream.value)
  analyzerSource.connect(analyser)
}

watch(
  [enabled],
  () => {
    setupAnalyzer()
  },
  { immediate: true },
)

onUnmounted(() => {
  teardownAnalyzer()
})

watch(sendMode, () => {
  lastEnterTime.value = 0
})

watch(replyTarget, async (target) => {
  if (!target)
    return

  await nextTick()
  composerRoot.value?.querySelector('textarea')?.focus()
})

/** Focuses the message field after a prompt is selected. */
function focus() {
  composerRoot.value?.querySelector('textarea')?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div ref="composer" class="ph-no-capture pointer-events-auto w-full flex flex-col gap-1 glass-tier-2 rounded-2xl px-2 py-1.5">
    <ChatReplyPreview v-if="replyTarget" :target="replyTarget" @cancel="handleCancelReply" />
    <BasicTextarea
      v-model="messageInput"
      :submit-on-enter="false"
      :placeholder="t('stage.message')"
      default-height="56px"
      :class="[
        'scrollbar-glass max-h-36 min-h-14 w-full resize-none overflow-y-auto px-2 py-1',
        'bg-transparent text-base text-glass-primary outline-none',
        'placeholder:text-glass-muted',
        'transition-[height] duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none',
      ]"
      bg="transparent"
      @keydown="handleMessageInputKeydown"
      @compositionstart="isComposing = true"
      @compositionend="isComposing = false"
    />

    <div class="flex items-center gap-1">
      <div class="flex items-center gap-1">
        <BasicButton
          size="unset"
          :class="[
            'glass-focus-ring size-8 flex items-center justify-center rounded-lg no-underline',
            webSearchEnabled
              ? 'bg-primary-500/15 text-primary-500'
              : 'text-glass-muted hover:bg-primary-500/10 hover:text-primary-500',
          ]"
          :title="t('stage.neko.webSearch')"
          :aria-pressed="webSearchEnabled"
          @click="webSearchEnabled = !webSearchEnabled"
        >
          <span class="i-solar:global-bold-duotone size-4" />
        </BasicButton>

        <DropdownMenuRoot>
          <DropdownMenuTrigger as-child>
            <BasicButton
              size="unset"
              :class="[
                'glass-focus-ring size-8 rounded-lg text-glass-muted',
                'hover:bg-[var(--color-glass-highlight)] hover:text-[var(--color-accent)]',
              ]"
              :title="t('stage.send-mode.title')"
            >
              <span class="i-solar:keyboard-bold-duotone size-4" />
            </BasicButton>
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent
              side="top"
              align="start"
              :side-offset="8"
              :class="[
                'glass-tier-3 z-80 min-w-48 flex flex-col gap-1 rounded-xl p-1',
                'text-glass-primary',
              ]"
            >
              <DropdownMenuItem
                v-for="mode in SEND_MODES"
                :key="mode"
                :class="[
                  'glass-focus-ring flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs',
                  'hover:bg-[var(--color-glass-highlight)]',
                  sendMode === mode && 'bg-[var(--color-accent-surface)] text-[var(--color-on-accent-surface)]',
                ]"
                @select="sendMode = mode"
              >
                <span :class="[sendMode === mode && 'i-ph:check-bold', 'size-3.5']" />
                {{ sendModeLabels[mode] }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenuRoot>

        <PopoverRoot v-model:open="hearingPopoverOpen">
          <PopoverTrigger as-child>
            <BasicButton
              size="unset"
              :class="[
                'glass-focus-ring size-8 rounded-lg text-glass-muted',
                'hover:bg-[var(--color-glass-highlight)] hover:text-[var(--color-accent)]',
              ]"
              :title="t('settings.pages.modules.hearing.title')"
            >
              <Transition name="fade" mode="out-in">
                <IndicatorMicVolume
                  v-if="enabled"
                  class="size-4"
                  :color-class="isListening ? undefined : 'text-glass-muted'"
                />
                <span v-else class="i-ph:microphone-slash size-4" />
              </Transition>
            </BasicButton>
          </PopoverTrigger>
          <PopoverPortal>
            <PopoverContent
              side="top"
              align="start"
              :side-offset="8"
              :collision-padding="12"
              :class="[
                'glass-tier-3 z-[10010] w-[min(18rem,calc(100vw-1.5rem))] flex flex-col gap-3 rounded-2xl p-4 outline-none origin-bottom-left',
                'text-glass-primary motion-reduce:animate-none data-[state=closed]:animate-glassSink data-[state=open]:animate-glassRise',
              ]"
            >
              <HearingConfig
                v-model:auto-send="autoSendEnabled"
                :transcription="isListening"
                :granted="true"
                @toggle-transcription="() => isListening ? stopStreamingTranscription() : startStreamingTranscription()"
              />
            </PopoverContent>
          </PopoverPortal>
        </PopoverRoot>
      </div>

      <div class="flex-1" />

      <BasicButton
        v-if="showStopSpeakingButton"
        size="unset"
        :class="[
          'glass-focus-ring size-8 rounded-lg text-glass-muted',
          'hover:bg-[var(--color-glass-highlight)] hover:text-[var(--color-accent)]',
        ]"
        :title="t('stage.neko.stopSpeaking')"
        :aria-label="t('stage.neko.stopSpeaking')"
        @click="stopSpeakingFromChat"
      >
        <span class="i-solar:stop-circle-bold-duotone size-4" />
      </BasicButton>

      <PopoverRoot v-model:open="modelPopoverOpen">
        <PopoverTrigger as-child>
          <BasicButton
            size="unset"
            :class="[
              'glass-focus-ring h-8 min-w-0 max-w-[min(32rem,calc(100vw-10rem))] flex shrink items-center gap-1 rounded-lg px-2 outline-none',
              'text-glass-secondary transition-colors hover:bg-primary-500/10 hover:text-primary-500',
            ]"
          >
            <span aria-hidden="true" class="i-solar:cpu-bolt-bold-duotone size-3.5 shrink-0" />
            <span class="min-w-0 truncate">{{ activeModelLabel }}</span>
            <span aria-hidden="true" class="i-solar:alt-arrow-up-linear size-3 shrink-0" />
          </BasicButton>
        </PopoverTrigger>

        <PopoverPortal>
          <PopoverContent
            side="top"
            align="end"
            :side-offset="8"
            :collision-padding="12"
            :class="[
              'z-80 w-[min(46rem,calc(100vw-1.5rem))] grid grid-cols-[minmax(10rem,0.8fr)_minmax(0,1.4fr)]',
              'overflow-x-hidden rounded-2xl p-0 text-glass-primary outline-none glass-tier-3 origin-bottom-right',
              'motion-reduce:animate-none data-[state=closed]:animate-glassSink data-[state=open]:animate-glassRise',
            ]"
          >
            <section class="min-w-0 border-r border-[var(--color-glass-border-2)] p-2">
              <p class="mb-1.5 mt-0 px-2 text-[0.625rem] text-glass-muted font-medium tracking-wide uppercase">
                {{ t('stage.neko.providers') }}
              </p>
              <div class="scrollbar-glass grid max-h-56 gap-1 overflow-x-hidden overflow-y-auto">
                <BasicButton
                  v-for="provider in moduleChatProvidersMetadata"
                  :key="provider.id"
                  size="unset"
                  :class="[
                    'glass-focus-ring min-h-9 w-full justify-start gap-2 rounded-xl px-2.5 text-left text-xs transition-colors',
                    activeProvider === provider.id
                      ? 'bg-primary-500/15 text-primary-500'
                      : 'text-glass-secondary hover:bg-primary-500/10 hover:text-primary-500',
                  ]"
                  @click="selectProvider(provider.id)"
                >
                  <span :class="[provider.icon || 'i-solar:server-square-bold-duotone', 'size-4 shrink-0']" />
                  <span class="truncate">{{ provider.localizedName }}</span>
                  <span v-if="activeProvider === provider.id" class="i-ph:check-bold ml-auto size-3.5" />
                </BasicButton>

                <RouterLink
                  v-if="moduleChatProvidersMetadata.length === 0"
                  to="/settings/providers"
                  class="rounded-xl px-2.5 py-2 text-xs text-primary-500 no-underline glass-focus-ring hover:bg-primary-500/10"
                >
                  {{ t('stage.neko.configureProviders') }}
                </RouterLink>
              </div>
            </section>

            <section class="min-w-0 p-2">
              <p class="mb-1.5 mt-0 px-2 text-[0.625rem] text-glass-muted font-medium tracking-wide uppercase">
                {{ t('stage.neko.models') }}
              </p>
              <div class="scrollbar-glass grid max-h-56 gap-1 overflow-x-hidden overflow-y-auto">
                <span
                  v-if="isLoadingActiveProviderModels"
                  class="i-svg-spinners:3-dots-move mx-auto my-3 size-5 text-primary-500"
                />
                <template v-else>
                  <BasicButton
                    v-for="model in providerModels"
                    :key="model.id"
                    size="unset"
                    :class="[
                      'glass-focus-ring min-h-9 w-full justify-start gap-2 rounded-xl px-2.5 text-left text-xs transition-colors',
                      activeModel === model.id
                        ? 'bg-primary-500/15 text-primary-500'
                        : 'text-glass-secondary hover:bg-primary-500/10 hover:text-primary-500',
                    ]"
                    @click="selectModel(model.id)"
                  >
                    <span aria-hidden="true" class="i-solar:cpu-bolt-bold-duotone mt-0.5 size-4 shrink-0 self-start" />
                    <span class="min-w-0 flex-1 whitespace-normal break-words leading-snug">{{ model.name || model.id }}</span>
                    <span v-if="activeModel === model.id" aria-hidden="true" class="i-ph:check-bold ml-auto mt-0.5 size-3.5 shrink-0 self-start" />
                  </BasicButton>
                </template>
                <p
                  v-if="!isLoadingActiveProviderModels && providerModels.length === 0"
                  class="m-0 px-2.5 py-2 text-xs text-glass-muted"
                >
                  {{ activeProvider ? t('stage.neko.noModels') : t('stage.neko.chooseProvider') }}
                </p>
              </div>
            </section>
          </PopoverContent>
        </PopoverPortal>
      </PopoverRoot>

      <BasicButton
        size="unset"
        :disabled="!messageInput.trim()"
        :class="[
          'glass-focus-ring size-8 flex shrink-0 items-center justify-center rounded-lg outline-none transition-all duration-200',
          messageInput.trim()
            ? 'bg-primary-500/85 text-white hover:bg-primary-500 active:scale-95'
            : 'cursor-not-allowed bg-primary-500/12 text-glass-muted',
          'motion-reduce:transform-none',
        ]"
        :aria-label="t('stage.chat.actions.send')"
        @click="handleSend"
      >
        <span class="i-solar:arrow-up-linear size-4" />
      </BasicButton>
    </div>
  </div>
</template>
