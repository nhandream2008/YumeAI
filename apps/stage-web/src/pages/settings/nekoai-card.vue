<script setup lang="ts">
import YumeAiCardSettings from '@proj-airi/stage-pages/pages/settings/airi-card/index.vue'
</script>

<template>
  <YumeAiCardSettings />
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.card.title
  subtitleKey: settings.pages.card.description
  descriptionKey: settings.pages.card.description
  icon: i-solar:emoji-funny-square-bold-duotone
  stageTransition:
    name: slide
</route>
