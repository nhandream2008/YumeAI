<script setup lang="ts">
import type { StageViewMode } from './stage-view-mode-tabs.vue'

import { useThreeViewControl } from '@proj-airi/stage-ui-three'
import { useAuthStore } from '@proj-airi/stage-ui/stores/auth'
import { useChatSessionStore } from '@proj-airi/stage-ui/stores/chat/session-store'
import { useL2dViewControl } from '@proj-airi/stage-ui/stores/live2d'
import { useSettingsStageModel } from '@proj-airi/stage-ui/stores/settings/stage-model'
import { BasicButton, useTheme } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import {
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
} from 'reka-ui'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import ActionAbout from '../Layouts/InteractiveArea/Actions/About.vue'
import StageViewModeTabs from './stage-view-mode-tabs.vue'

import { useStopSpeakingButton } from '../../composables/useStopSpeakingButton'
import { BackgroundDialogPicker } from '../Backgrounds'

const router = useRouter()
const { t } = useI18n()
const { isDark, toggleDark } = useTheme()
const { speechMuted, toggleSpeechMuted } = useStopSpeakingButton()
const authStore = useAuthStore()
const chatSessionStore = useChatSessionStore()
const { isAuthenticated } = storeToRefs(authStore)
const { activeSessionId } = storeToRefs(chatSessionStore)
const { stageModelRenderer } = storeToRefs(useSettingsStageModel())
const {
  viewControlsEnabled: l2dViewControlsEnabled,
  viewControlMode: l2dViewControlMode,
} = useL2dViewControl()
const {
  viewControlsEnabled: threeViewControlsEnabled,
  viewControlMode: threeViewControlMode,
} = useThreeViewControl()

const backgroundDialogOpen = shallowRef(false)
const aboutDialogOpen = shallowRef(false)
const controlsOpen = shallowRef(false)
const viewControlsAvailable = computed(() => stageModelRenderer.value === 'live2d' || stageModelRenderer.value === 'vrm')

const viewControlsEnabled = computed({
  get() {
    if (stageModelRenderer.value === 'live2d')
      return l2dViewControlsEnabled.value
    if (stageModelRenderer.value === 'vrm')
      return threeViewControlsEnabled.value
    return false
  },
  set(enabled: boolean) {
    if (stageModelRenderer.value === 'live2d')
      l2dViewControlsEnabled.value = enabled
    if (stageModelRenderer.value === 'vrm')
      threeViewControlsEnabled.value = enabled
  },
})

const activeViewMode = computed<StageViewMode>(() => {
  if (stageModelRenderer.value === 'live2d')
    return l2dViewControlMode.value

  if (stageModelRenderer.value === 'vrm') {
    if (threeViewControlMode.value === 'x' || threeViewControlMode.value === 'y')
      return threeViewControlMode.value
    return 'scale'
  }

  return 'scale'
})

const viewModeLabels = computed<Record<StageViewMode, string>>(() => ({
  x: 'X',
  y: 'Y',
  scale: t('settings.live2d.scale-and-position.scale'),
}))

const controlButtonClass = 'glass-focus-ring h-16 min-w-0 flex flex-col items-center justify-center gap-1.5 rounded-xl px-1 outline-none transition-[background-color,color,transform] duration-150 active:scale-[0.98] motion-reduce:transform-none'
const rowButtonClass = 'glass-focus-ring min-h-10 w-full flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-sm text-[#e1e0e8] outline-none transition-colors hover:bg-white/6'

function closeControls() {
  controlsOpen.value = false
}

function openAccount() {
  closeControls()
  if (isAuthenticated.value) {
    void router.push('/settings/account')
    return
  }

  authStore.needsLogin = true
}

function openSettings() {
  closeControls()
  void router.push('/settings')
}

function openBackgroundPicker() {
  closeControls()
  backgroundDialogOpen.value = true
}

function openAboutDialog() {
  closeControls()
  aboutDialogOpen.value = true
}

function clearConversation() {
  chatSessionStore.cleanupMessages(activeSessionId.value)
  closeControls()
}

function selectViewMode(mode: StageViewMode) {
  if (!viewControlsAvailable.value)
    return

  viewControlsEnabled.value = true

  if (stageModelRenderer.value === 'live2d') {
    l2dViewControlMode.value = mode
    return
  }

  threeViewControlMode.value = mode === 'scale' ? 'cameraDistance' : mode
}
</script>

<template>
  <BackgroundDialogPicker v-model="backgroundDialogOpen" />
  <ActionAbout v-model="aboutDialogOpen" hide-trigger />

  <div class="absolute right-3 top-3 z-30">
    <PopoverRoot v-model:open="controlsOpen">
      <PopoverTrigger as-child>
        <BasicButton
          size="unset"
          :class="[
            'glass-focus-ring size-9 rounded-xl text-glass-secondary glass-tier-2',
            'transition-all duration-200 hover:text-primary-500 active:scale-95',
            'motion-reduce:transform-none',
          ]"
          :aria-label="t('stage.neko.controls')"
        >
          <span class="i-solar:widget-5-bold-duotone size-5" />
        </BasicButton>
      </PopoverTrigger>

      <PopoverPortal>
        <PopoverContent
          side="bottom"
          align="end"
          :side-offset="4"
          :class="[
            'z-[10010] w-72 flex flex-col gap-1 rounded-2xl border border-[#43414f] bg-[#1d1c24] p-1.5 outline-none origin-top-right',
            'text-[#e1e0e8] shadow-[0_18px_48px_rgba(0,0,0,0.45)]',
            'motion-reduce:animate-none data-[state=closed]:animate-glassSink data-[state=open]:animate-glassRise',
          ]"
        >
          <BasicButton
            size="unset"
            :class="[
              'glass-focus-ring h-10 w-full flex items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium outline-none',
              'bg-primary-500/15 text-primary-500 transition-[background-color,transform] duration-150',
              'hover:bg-primary-500/22 active:scale-[0.98] motion-reduce:transform-none',
            ]"
            @click="openAccount"
          >
            <span aria-hidden="true" class="i-solar:login-3-bold-duotone size-4.5" />
            {{ isAuthenticated ? t('stage.neko.account') : t('stage.neko.signIn') }}
          </BasicButton>

          <div class="grid grid-cols-3 gap-1">
            <BasicButton
              size="unset"
              :class="[
                controlButtonClass,
                !speechMuted
                  ? 'bg-primary-500/15 text-primary-500'
                  : 'bg-neutral-500/8 text-glass-secondary hover:bg-primary-500/10 hover:text-primary-500',
              ]"
              :aria-pressed="!speechMuted"
              @click="toggleSpeechMuted"
            >
              <span aria-hidden="true" :class="[speechMuted ? 'i-solar:volume-cross-bold-duotone' : 'i-solar:volume-loud-bold-duotone', 'size-5']" />
              <span class="text-xs">{{ t('stage.neko.voice') }}</span>
            </BasicButton>

            <BasicButton
              size="unset"
              :class="[
                controlButtonClass,
                isDark
                  ? 'bg-primary-500/15 text-primary-500'
                  : 'bg-neutral-500/8 text-glass-secondary hover:bg-primary-500/10 hover:text-primary-500',
              ]"
              :aria-pressed="isDark"
              @click="toggleDark()"
            >
              <span aria-hidden="true" :class="[isDark ? 'i-solar:moon-bold' : 'i-solar:sun-2-bold', 'size-5']" />
              <span class="text-xs">{{ t('stage.neko.dark') }}</span>
            </BasicButton>

            <BasicButton
              size="unset"
              :class="[
                controlButtonClass,
                viewControlsEnabled
                  ? 'bg-primary-500/15 text-primary-500'
                  : 'bg-neutral-500/8 text-glass-secondary hover:bg-primary-500/10 hover:text-primary-500',
                !viewControlsAvailable && 'cursor-not-allowed opacity-45',
              ]"
              :disabled="!viewControlsAvailable"
              :aria-pressed="viewControlsEnabled"
              @click="viewControlsEnabled = !viewControlsEnabled"
            >
              <span aria-hidden="true" class="i-solar:slider-vertical-bold-duotone size-5" />
              <span class="text-xs">{{ t('stage.neko.view') }}</span>
            </BasicButton>
          </div>

          <Transition
            enter-active-class="transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none"
            enter-from-class="-translate-y-1 opacity-0 motion-reduce:transform-none"
            leave-active-class="transition-[opacity,transform] duration-150 ease-in motion-reduce:transition-none"
            leave-to-class="-translate-y-1 opacity-0 motion-reduce:transform-none"
          >
            <StageViewModeTabs
              v-if="viewControlsEnabled"
              :active-mode="activeViewMode"
              :enabled="viewControlsEnabled"
              :disabled="!viewControlsAvailable"
              :labels="viewModeLabels"
              @select="selectViewMode"
            />
          </Transition>

          <div aria-hidden="true" class="my-0.5 border-t border-[#3b3946]" />

          <BasicButton size="unset" :class="rowButtonClass" @click="openBackgroundPicker">
            <span aria-hidden="true" class="size-7 flex shrink-0 items-center justify-center rounded-lg bg-white/5 text-[#aaa9b5]">
              <span class="i-solar:gallery-wide-bold-duotone size-4.5" />
            </span>
            {{ t('stage.neko.background') }}
          </BasicButton>
          <BasicButton size="unset" :class="rowButtonClass" @click="openSettings">
            <span aria-hidden="true" class="size-7 flex shrink-0 items-center justify-center rounded-lg bg-white/5 text-[#aaa9b5]">
              <span class="i-solar:settings-bold-duotone size-4.5" />
            </span>
            {{ t('stage.neko.settings') }}
          </BasicButton>
          <BasicButton size="unset" :class="rowButtonClass" @click="openAboutDialog">
            <span aria-hidden="true" class="size-7 flex shrink-0 items-center justify-center rounded-lg bg-white/5 text-[#aaa9b5]">
              <span class="i-solar:info-circle-bold-duotone size-4.5" />
            </span>
            {{ t('stage.neko.about') }}
          </BasicButton>

          <div class="mt-0.5 border-t border-[#3b3946] pt-0.5">
            <BasicButton
              size="unset"
              :class="[
                rowButtonClass,
                'hover:bg-red-500/10',
              ]"
              @click="clearConversation"
            >
              <span aria-hidden="true" class="size-7 flex shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
                <span class="i-solar:trash-bin-trash-bold-duotone size-4.5" />
              </span>
              {{ t('stage.neko.clearConversation') }}
            </BasicButton>
          </div>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
  </div>
</template>
