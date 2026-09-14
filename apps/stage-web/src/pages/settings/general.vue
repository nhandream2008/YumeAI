<script setup lang="ts">
import GeneralSettings from '@proj-airi/stage-pages/pages/settings/system/general.vue'
</script>

<template>
  <GeneralSettings />
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.system.general.title
  subtitleKey: settings.pages.system.general.description
  stageTransition:
    name: slide
</route>
