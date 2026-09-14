<script setup lang="ts">
import type { OnboardingStep } from './types'

import { useResizeObserver, useScreenSafeArea } from '@vueuse/core'
import { DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle, VisuallyHidden } from 'reka-ui'
import { DrawerContent, DrawerHandle, DrawerOverlay, DrawerPortal, DrawerRoot } from 'vaul-vue'
import { onMounted, shallowRef } from 'vue'

import Onboarding from './onboarding.vue'

import { useBreakpoints } from '../../../../composables/use-breakpoints'

const props = defineProps<{
  extraSteps?: OnboardingStep[]
}>()

const emit = defineEmits<{
  (e: 'configured'): void
  (e: 'skipped'): void
}>()

const showDialog = defineModel({ type: Boolean, default: false, required: false })
const isWelcomeStep = shallowRef(true)

const { isDesktop } = useBreakpoints()
const screenSafeArea = useScreenSafeArea()

useResizeObserver(document.documentElement, () => screenSafeArea.update())
onMounted(() => screenSafeArea.update())
</script>

<template>
  <DialogRoot v-if="isDesktop" :open="showDialog" @update:open="value => showDialog = value">
    <DialogPortal>
      <DialogOverlay
        :class="[
          'fixed inset-0 z-9999 overscroll-contain',
          'bg-black/55 backdrop-blur-[6px]',
          'data-[state=closed]:animate-fadeOut data-[state=open]:animate-fadeIn motion-reduce:animate-none',
        ]"
      />
      <DialogContent
        :class="[
          'fixed left-1/2 top-1/2 z-9999 w-[92dvw] max-h-[calc(100dvh-1.5rem)]',
          'border border-white/5 bg-[#151515] shadow-[0_24px_80px_rgba(0,0,0,0.48)]',
          isWelcomeStep ? 'h-[17rem] max-w-[48rem]' : 'h-[min(100dvh,48rem)] max-w-2xl',
          'flex flex-col overflow-hidden rounded-[18px] p-6 outline-none scrollbar-none -translate-x-1/2 -translate-y-1/2',
          'data-[state=closed]:animate-contentHide data-[state=open]:animate-contentShow motion-reduce:animate-none',
        ]"
      >
        <VisuallyHidden>
          <DialogTitle>Onboarding</DialogTitle>
          <DialogDescription>{{ $t('settings.dialogs.onboarding.description') }}</DialogDescription>
        </VisuallyHidden>
        <div class="min-h-0 min-w-0 w-full flex flex-1 flex-col">
          <Onboarding
            :extra-steps="props.extraSteps"
            @configured="emit('configured')"
            @skipped="emit('skipped')"
            @step-change="stepId => isWelcomeStep = stepId === 'welcome'"
          />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
  <DrawerRoot v-else :open="showDialog" should-scale-background @update:open="value => showDialog = value">
    <DrawerPortal>
      <DrawerOverlay
        :class="[
          'fixed inset-0 z-900 overscroll-contain',
          'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0',
          'bg-[var(--color-scrim)]/45 backdrop-blur-sm',
        ]"
      />
      <DrawerContent
        :class="[
          'fixed bottom-0 left-0 right-0 z-1000',
          'mt-20 px-4 pt-4',
          'flex flex-col',
          'h-full max-h-[90%]',
          'glass-tier-3 rounded-t-[32px] bg-[#111117]! outline-none',
        ]"
        :style="{ paddingBottom: `${Math.max(Number.parseFloat(screenSafeArea.bottom.value.replace('px', '')), 24)}px` }"
      >
        <DrawerHandle
          :class="[
            '[div&]:bg-[var(--color-outline)]',
          ]"
        />
        <div class="min-h-0 min-w-0 w-full flex flex-1 flex-col">
          <Onboarding
            :extra-steps="props.extraSteps"
            @configured="emit('configured')"
            @skipped="emit('skipped')"
            @step-change="stepId => isWelcomeStep = stepId === 'welcome'"
          />
        </div>
      </DrawerContent>
    </DrawerPortal>
  </DrawerRoot>
</template>
