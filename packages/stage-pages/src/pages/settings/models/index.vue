<script setup lang="ts">
import { ModelSettings } from '@proj-airi/stage-ui/components/scenarios/settings/model-settings'
import { Vibrant } from 'node-vibrant/browser'
import { ref } from 'vue'

const modelSettingsRef = ref<{ capturePreviewFrame: () => Promise<Blob | undefined> }>()
const palette = ref<string[]>([])

async function extractColorsFromModel() {
  const frame = await modelSettingsRef.value?.capturePreviewFrame()
  if (!frame) {
    console.error('No frame captured')
    return
  }

  const frameUrl = URL.createObjectURL(frame)
  try {
    const vibrant = new Vibrant(frameUrl)

    const paletteFromVibrant = await vibrant.getPalette()
    palette.value = Object.values(paletteFromVibrant).map(color => color?.hex).filter(it => typeof it === 'string')
  }
  finally {
    URL.revokeObjectURL(frameUrl)
  }
}
</script>

<template>
  <div class="model-settings-grid relative grid min-h-[36rem] gap-4 lg:grid-cols-[minmax(19rem,0.9fr)_minmax(22rem,1.15fr)]">
    <ModelSettings
      ref="modelSettingsRef"
      settings-class="model-settings-panel scrollbar-glass relative min-h-0 rounded-2xl glass-tier-1 lg:max-h-[calc(100dvh-10rem)]"
      live-2d-scene-class="model-preview-stage relative min-h-[28rem] overflow-hidden rounded-2xl glass-tier-1 lg:sticky lg:top-0 lg:h-[calc(100dvh-10rem)]"
      vrm-scene-class="model-preview-stage relative min-h-[28rem] overflow-hidden rounded-2xl glass-tier-1 lg:sticky lg:top-0 lg:h-[calc(100dvh-10rem)]"
      spine-scene-class="model-preview-stage relative min-h-[28rem] overflow-hidden rounded-2xl glass-tier-1 lg:sticky lg:top-0 lg:h-[calc(100dvh-10rem)]"
      tachie-scene-class="model-preview-stage relative min-h-[28rem] overflow-hidden rounded-2xl glass-tier-1 lg:sticky lg:top-0 lg:h-[calc(100dvh-10rem)]"
      mmd-scene-class="model-preview-stage relative min-h-[28rem] overflow-hidden rounded-2xl glass-tier-1 lg:sticky lg:top-0 lg:h-[calc(100dvh-10rem)]"
      :palette="palette"
      @extract-colors-from-model="extractColorsFromModel"
    />
  </div>

  <div
    v-motion
    text="neutral-200/50 dark:neutral-600/20" pointer-events-none
    fixed top="[calc(100dvh-15rem)]" bottom-0 right--5 z--1
    :initial="{ scale: 0.9, opacity: 0, y: 15 }"
    :enter="{ scale: 1, opacity: 1, y: 0 }"
    :duration="500"
    size-60
    flex items-center justify-center
  >
    <div text="60" i-solar:people-nearby-bold-duotone />
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.models.title
  subtitleKey: settings.title
  descriptionKey: settings.pages.models.description
  icon: i-solar:people-nearby-bold-duotone
  settingsEntry: true
  order: 4
  stageTransition:
    name: slide
    pageSpecificAvailable: true
</route>

<style scoped>
.model-settings-grid :deep(.model-settings-panel) {
  border-color: var(--color-glass-border-2);
}

.model-settings-grid :deep(.model-preview-stage) {
  background:
    radial-gradient(circle at 50% 40%, var(--color-glow-accent), transparent 60%),
    rgb(0 0 0 / 6%);
  isolation: isolate;
}
</style>
