<script setup lang="ts">
import InteractiveArea from '@proj-airi/stage-layouts/components/Layouts/InteractiveArea.vue'
import MobileInteractiveArea from '@proj-airi/stage-layouts/components/Layouts/MobileInteractiveArea.vue'
import ChatActionButtons from '@proj-airi/stage-layouts/components/Widgets/ChatActionButtons.vue'
import workletUrl from '@proj-airi/stage-ui/workers/vad/process.worklet?worker&url'

import { BackgroundProvider } from '@proj-airi/stage-layouts/components/Backgrounds'
import { useBackgroundThemeColor } from '@proj-airi/stage-layouts/composables/theme-color'
import { useBackgroundStore } from '@proj-airi/stage-layouts/stores/background'
import { HoloCoupon } from '@proj-airi/stage-ui/components'
import {
  ViewControlSlider,
  WidgetStage,
} from '@proj-airi/stage-ui/components/scenes'
import { useAudioRecorder } from '@proj-airi/stage-ui/composables/audio/audio-recorder'
import { useVAD } from '@proj-airi/stage-ui/stores/ai/models/vad'
import { useChatStore } from '@proj-airi/stage-ui/stores/chat'
import { useChatSessionStore } from '@proj-airi/stage-ui/stores/chat/session-store'
import { useConsciousnessStore } from '@proj-airi/stage-ui/stores/modules/consciousness'
import { useHearingSpeechInputPipeline } from '@proj-airi/stage-ui/stores/modules/hearing'
import {
  useSettings,
  useSettingsAudioDevice,
} from '@proj-airi/stage-ui/stores/settings'
import { BasicButton } from '@proj-airi/ui'
import { breakpointsTailwind, throttleFilter, useBreakpoints, useMouse } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  useTemplateRef,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'

import YumeSidebar from '../components/neko-sidebar.vue'

const props = withDefaults(defineProps<{ overlayPaused?: boolean }>(), { overlayPaused: false })
const paused = shallowRef(false)
const sidebarOpen = shallowRef(true)
const yumeLogoUrl = '/yumeai-logo.png'
const { t } = useI18n()
const { activeSessionId, sessionMetas } = storeToRefs(useChatSessionStore())
const activeSessionTitle = computed(() => sessionMetas.value[activeSessionId.value]?.title || t('stage.chat.sessions.new'))

function handleSettingsOpen(open: boolean) {
  paused.value = open
}

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('md')
const stageViewport = shallowRef({ height: 0, offsetTop: 0 })
// NOTICE:
// Why: A fixed Stage follows Safari's input pan and moves Live2D with the keyboard.
// Root cause: Safari moves the Visual Viewport before the page receives the new offsetTop value.
// Source: https://bugs.webkit.org/show_bug.cgi?id=265578
// Removal condition: Safari keeps fixed content stable during the input pan.
const stageSurfaceStyle = computed(() =>
  isMobile.value
    ? {
        position: 'fixed' as const,
        inset: '0',
        height:
          stageViewport.value.height > 0
            ? `${stageViewport.value.height}px`
            : '100dvh',
        transform: `translate3d(0, ${stageViewport.value.offsetTop}px, 0)`,
        willChange: 'transform',
      }
    : undefined,
)

const backgroundStore = useBackgroundStore()
const { selectedOption, sampledColor } = storeToRefs(backgroundStore)
const backgroundSurface
  = useTemplateRef<InstanceType<typeof BackgroundProvider>>('backgroundSurface')
const { stageModelRenderer } = storeToRefs(useSettings())

const { syncBackgroundTheme } = useBackgroundThemeColor({
  backgroundSurface,
  selectedOption,
  sampledColor,
})
onMounted(() => syncBackgroundTheme())

// Audio + transcription pipeline (mirrors stage-tamagotchi)
const settingsAudioDeviceStore = useSettingsAudioDevice()
const { stream, enabled } = storeToRefs(settingsAudioDeviceStore)
const { discardRecord, startRecord, stopRecord, onStopRecord }
  = useAudioRecorder(stream)
const hearingPipeline = useHearingSpeechInputPipeline()
const {
  removeStreamingTranscriptionConsumer,
  stopStreamingTranscription,
  transcribeForMediaStream,
  transcribeForRecording,
} = hearingPipeline
const { supportsStreamInput } = storeToRefs(hearingPipeline)
const consciousnessStore = useConsciousnessStore()
const {
  activeProvider: activeChatProvider,
  activeModel: activeChatModel,
  activeTemperature,
  activeTopP,
} = storeToRefs(consciousnessStore)
const chatStore = useChatStore()

/** Identifies this page in the shared streaming transcription session. */
const transcriptionConsumerId = 'stage-web:voice-input'

const shouldUseStreamInput = computed(
  () => supportsStreamInput.value && !!stream.value,
)

const {
  init: initVAD,
  dispose: disposeVAD,
  start: startVAD,
  loaded: vadLoaded,
} = useVAD(workletUrl, {
  threshold: ref(0.6),
  onSpeechStart: () => handleSpeechStart(),
  onSpeechEnd: () => handleSpeechEnd(),
  onSpeechCancel: () => handleSpeechCancel(),
})

let stopOnStopRecord: (() => void) | undefined

async function sendVoiceInputTextToChat(text: string | undefined) {
  if (!text?.trim())
    return

  try {
    const providerId = activeChatProvider.value
    const model = activeChatModel.value
    if (!providerId || !model)
      return

    const provider
      = await consciousnessStore.getChatProviderInstance(providerId)

    await chatStore.ingest(text, {
      model,
      chatProvider: provider,
      temperature: activeTemperature.value,
      topP: activeTopP.value,
    })
  }
  catch (error) {
    console.error('Failed to send chat from voice:', error)
  }
}

async function startAudioInteraction() {
  try {
    await initVAD()
    if (stream.value)
      await startVAD(stream.value)

    if (shouldUseStreamInput.value && stream.value) {
      await transcribeForMediaStream(stream.value, {
        consumerId: transcriptionConsumerId,
        onSentenceEnd: text => void sendVoiceInputTextToChat(text),
      })
      return
    }

    // Hook once
    stopOnStopRecord = onStopRecord(async (recording) => {
      const text = await transcribeForRecording(recording)
      await sendVoiceInputTextToChat(text)
    })
  }
  catch (e) {
    console.error('Audio interaction init failed:', e)
  }
}

async function handleSpeechStart() {
  // For streaming providers, ChatArea component handles transcription manually
  // The main page should not start automatic transcription to avoid duplicate sessions
  if (shouldUseStreamInput.value) {
    return
  }

  startRecord()
}

async function handleSpeechEnd() {
  if (shouldUseStreamInput.value) {
    // Keep streaming session alive; idle timer in pipeline will handle teardown.
    return
  }

  stopRecord()
}

async function handleSpeechCancel() {
  if (!shouldUseStreamInput.value)
    await discardRecord()
}

function stopAudioInteraction() {
  try {
    removeStreamingTranscriptionConsumer(transcriptionConsumerId)
    stopOnStopRecord?.()
    stopOnStopRecord = undefined
    void stopStreamingTranscription(true)
    disposeVAD()
  }
  catch {}
}

watch(
  enabled,
  async (val) => {
    if (val) {
      await startAudioInteraction()
    }
    else {
      stopAudioInteraction()
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  stopAudioInteraction()
})

watch([stream, () => vadLoaded.value], async ([s, loaded]) => {
  if (enabled.value && loaded && s) {
    try {
      await startVAD(s)
    }
    catch (e) {
      console.error('Failed to start VAD with stream:', e)
    }
  }
})

// Cursor movement reaches the active renderer. Sampling prevents hundreds of
// reactive scene updates per second while retaining smooth character tracking.
const CURSOR_TRACKING_SAMPLE_MS = 30
const { x: mouseX, y: mouseY } = useMouse({
  eventFilter: throttleFilter(CURSOR_TRACKING_SAMPLE_MS, true),
})
const cursorPosition = computed(() => ({
  x: mouseX.value,
  y: mouseY.value,
}))
</script>

<template>
  <BackgroundProvider
    ref="backgroundSurface"
    class="widgets top-widgets"
    :background="selectedOption"
    :style="stageSurfaceStyle"
    :top-color="sampledColor"
  >
    <div data-testid="mobile-stage-content" class="relative z-2 h-100dvh w-100vw flex overflow-hidden">
      <YumeSidebar v-if="!isMobile && sidebarOpen" @collapse="sidebarOpen = false" />

      <div v-if="!isMobile && !sidebarOpen" class="absolute left-3 top-3 z-30 flex items-center gap-1">
        <BasicButton
          size="unset"
          class="size-9 shrink-0 glass-tier-2 rounded-xl text-glass-secondary glass-focus-ring transition-all duration-200 active:scale-95 motion-reduce:transform-none hover:text-primary-500"
          :aria-label="t('stage.neko.openSidebar')"
          @click="sidebarOpen = true"
        >
          <span class="i-solar:sidebar-minimalistic-bold-duotone size-5" />
        </BasicButton>
        <RouterLink class="flex items-center gap-2 rounded-xl text-glass-primary no-underline glass-focus-ring" to="/">
          <img :src="yumeLogoUrl" alt="YumeAI" class="size-8 object-contain">
          <span class="text-xl font-700 tracking-tight">YumeAI</span>
        </RouterLink>
      </div>

      <main class="relative h-full min-w-0 flex-1">
        <section class="absolute inset-0 overflow-hidden">
          <div
            :class="[
              'absolute z-15 transition-[left] duration-300 motion-reduce:transition-none',
              sidebarOpen ? 'left-[18.25rem]' : 'left-1',
              stageModelRenderer === 'live2d'
                ? 'top-0 h-full py-[20vh] px-2'
                : 'top-1/2 px-2 -translate-y-1/2',
            ]"
          >
            <ViewControlSlider />
          </div>
          <WidgetStage
            class="absolute inset-0 size-full"
            :cursor-position="cursorPosition"
            :enable-orbit-controls="!isMobile"
            :paused="paused || props.overlayPaused"
          />
        </section>

        <header
          v-if="!isMobile"
          :class="[
            'pointer-events-none absolute top-17 z-20 min-w-0 max-w-[45%] flex flex-col',
            'transition-[left,transform,opacity] duration-500 ease-out-expo motion-reduce:transition-none',
            sidebarOpen
              ? 'left-[19rem] -translate-x-8 opacity-0'
              : 'left-4 translate-x-0 opacity-100',
          ]"
        >
          <div class="min-w-0 flex items-center gap-2">
            <span class="i-solar:chat-line-bold-duotone size-4 text-glass-muted" />
            <h2 class="m-0 truncate text-sm text-glass-muted font-medium">
              {{ activeSessionTitle }}
            </h2>
          </div>
        </header>

        <div
          v-if="!isMobile"
          :class="[
            'absolute right-4 top-[calc(50%+2rem)] z-20 h-[85dvh] max-h-[52rem]',
            'w-[min(31.25rem,calc(100vw-2rem))] -translate-y-1/2',
          ]"
        >
          <InteractiveArea class="size-full" />
        </div>
        <ChatActionButtons v-if="!isMobile" />
        <HoloCoupon />
      </main>
    </div>
    <Teleport to="body">
      <MobileInteractiveArea
        v-if="isMobile"
        @settings-open="handleSettingsOpen"
        @stage-viewport-change="stageViewport = $event"
      />
    </Teleport>
  </BackgroundProvider>
</template>

<route lang="yaml">
name: IndexScenePage
meta:
  layout: stage
  stageTransition:
    name: bubble-wave-out
</route>
