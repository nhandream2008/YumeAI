<script setup lang="ts">
import { BasicButton } from '@proj-airi/ui'

export type StageViewMode = 'x' | 'y' | 'scale'

interface Props {
  activeMode: StageViewMode
  disabled?: boolean
  enabled: boolean
  labels: Record<StageViewMode, string>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [mode: StageViewMode]
}>()

const modes: readonly StageViewMode[] = ['x', 'y', 'scale']
</script>

<template>
  <div :class="['grid grid-cols-3 gap-1']">
    <BasicButton
      v-for="mode in modes"
      :key="mode"
      size="unset"
      :disabled="props.disabled"
      :aria-pressed="props.enabled && props.activeMode === mode"
      :class="[
        'glass-focus-ring h-6 min-w-0 rounded-lg px-2 text-xs outline-none',
        'transition-[background-color,color] duration-150',
        props.enabled && props.activeMode === mode
          ? 'bg-primary-500/18 text-primary-500'
          : 'bg-white/4 text-[#aaa9b5] hover:bg-white/7 hover:text-[#e8e7ef]',
        props.disabled && 'cursor-not-allowed opacity-45',
      ]"
      @click="emit('select', mode)"
    >
      {{ props.labels[mode] }}
    </BasicButton>
  </div>
</template>
