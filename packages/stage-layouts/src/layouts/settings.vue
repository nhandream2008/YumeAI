<script setup lang="ts">
import { useProviderStore } from '@proj-airi/stage-ui/stores/providers/provider'
import { BasicButton, Input, useTheme } from '@proj-airi/ui'
import { computed, onMounted, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'

import { themeColorFromValue, useThemeColor } from '../composables/theme-color'

const route = useRoute()
const router = useRouter()
const { isDark: dark } = useTheme()
const { t } = useI18n()
const providersStore = useProviderStore()
const searchQuery = shallowRef('')

const routeMeta = computed(() => route.meta as {
  titleKey?: string
  subtitleKey?: string
  title?: string
  subtitle?: string
  disableBackButton?: boolean
})

const providerTitle = computed(() => {
  if (!route.path.startsWith('/settings/providers/'))
    return undefined

  const segments = route.path.split('/').filter(Boolean)
  const providerId = segments[3]
  if (!providerId)
    return undefined

  return providersStore.findProviderDefinition(providerId)?.nameLocalize({ t })
})

const routeHeaderMetadata = computed(() => {
  const { titleKey, subtitleKey, title, subtitle } = routeMeta.value
  const resolvedTitle = titleKey ? t(titleKey) : title
  const resolvedSubtitle = subtitleKey ? t(subtitleKey) : subtitle

  if (resolvedTitle || resolvedSubtitle) {
    return {
      title: resolvedTitle,
      subtitle: resolvedSubtitle,
    }
  }

  if (providerTitle.value) {
    return {
      title: providerTitle.value,
      subtitle: t('settings.title'),
    }
  }

  return {
    title: t('settings.title'),
    subtitle: t('settings.shell.subtitle'),
  }
})

const settingsNavigation = computed(() => [
  {
    label: t('settings.shell.navigation.general'),
    to: '/settings/general',
    icon: 'i-solar:settings-bold-duotone',
  },
  {
    label: t('settings.shell.navigation.card'),
    to: '/settings/airi-card',
    icon: 'i-solar:user-id-bold-duotone',
  },
  {
    label: t('settings.shell.navigation.modules'),
    to: '/settings/modules',
    icon: 'i-solar:box-bold-duotone',
  },
  {
    label: t('settings.shell.navigation.scenes'),
    to: '/settings/scene',
    icon: 'i-solar:gallery-wide-bold-duotone',
  },
  {
    label: t('settings.shell.navigation.models'),
    to: '/settings/models',
    icon: 'i-solar:cpu-bolt-bold-duotone',
  },
  {
    label: t('settings.shell.navigation.memory'),
    to: '/settings/memory',
    icon: 'i-solar:brain-bold-duotone',
  },
  {
    label: t('settings.shell.navigation.providers'),
    to: '/settings/providers',
    icon: 'i-solar:server-square-bold-duotone',
  },
  {
    label: t('settings.shell.navigation.data'),
    to: '/settings/data',
    icon: 'i-solar:folder-with-files-bold-duotone',
  },
  {
    label: t('settings.shell.navigation.connection'),
    to: '/settings/connection',
    icon: 'i-solar:link-circle-bold-duotone',
  },
  {
    label: t('settings.shell.navigation.system'),
    to: '/settings/system',
    icon: 'i-solar:monitor-smartphone-bold-duotone',
  },
])

const filteredNavigation = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  if (!query)
    return settingsNavigation.value

  return settingsNavigation.value.filter(item => item.label.toLocaleLowerCase().includes(query))
})

const contentWidthClass = computed(() => {
  if (route.path.startsWith('/settings/models'))
    return 'max-w-none'
  if (route.path.startsWith('/settings/providers'))
    return 'max-w-5xl'
  return 'max-w-3xl'
})

const currentNavigationItem = computed(() => [...settingsNavigation.value]
  .sort((a, b) => b.to.length - a.to.length)
  .find(item => route.path.startsWith(item.to)))

const { updateThemeColor } = useThemeColor(
  themeColorFromValue({ light: 'rgb(247 250 249)', dark: 'rgb(16 20 20)' }),
)

watch(dark, () => updateThemeColor(), { immediate: true })
watch(route, () => updateThemeColor(), { immediate: true })
onMounted(() => updateThemeColor())

function closeSettings() {
  void router.replace('/')
}
</script>

<template>
  <div
    class="fixed inset-0 z-100 flex items-center justify-center p-6 text-glass-primary <md:p-0"
  >
    <div class="settings-scrim absolute inset-0 animate-fadeIn motion-reduce:animate-none" @click.self="closeSettings" />

    <section
      class="settings-shell relative max-h-[calc(100dvh-3rem)] max-w-6xl min-h-0 w-full flex animate-glassRise overflow-hidden rounded-3xl <md:h-100dvh <md:max-h-none md:h-[min(50rem,calc(100dvh-3rem))] motion-reduce:animate-none <md:rounded-none"
      role="dialog"
      aria-modal="true"
      :aria-label="t('settings.title')"
    >
      <aside
        class="settings-sidebar h-full w-64 flex shrink-0 flex-col gap-4 overflow-hidden border-r border-[var(--color-glass-border-2)] p-4 <md:hidden"
      >
        <header class="flex shrink-0 items-center gap-3">
          <span class="size-9 flex shrink-0 items-center justify-center rounded-xl bg-primary-500/12 text-primary-500">
            <span class="i-solar:settings-bold-duotone size-4.5" />
          </span>
          <span class="min-w-0">
            <strong class="block truncate text-sm font-semibold">{{ t('settings.title') }}</strong>
            <small class="block truncate text-[0.6875rem] text-glass-muted">YumeAI</small>
          </span>
        </header>

        <label class="relative block">
          <span class="i-solar:magnifer-linear pointer-events-none absolute left-3 top-1/2 z-1 size-4 text-glass-muted -translate-y-1/2" />
          <Input
            v-model="searchQuery"
            type="search"
            variant="primary-dimmed"
            :class="[
              'h-8 rounded-lg! border-neutral-900! pl-9! text-sm!',
              'bg-neutral-950! text-glass-primary!',
            ]"
            :placeholder="t('settings.shell.search')"
            :aria-label="t('settings.shell.search')"
          />
        </label>

        <nav class="scrollbar-glass min-h-0 flex flex-1 flex-col gap-0.5 overflow-y-auto" :aria-label="t('settings.shell.navigationLabel')">
          <RouterLink
            v-for="item in filteredNavigation"
            :key="item.to"
            :to="item.to"
            :class="[
              'glass-focus-ring group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm no-underline outline-none',
              'text-glass-secondary transition-all duration-200 ease-out hover:bg-neutral-500/8 hover:text-glass-primary motion-reduce:transition-none',
            ]"
            active-class="bg-primary-500/12! text-primary-500! shadow-sm"
          >
            <span :class="[item.icon, 'size-4.5 shrink-0']" />
            {{ item.label }}
          </RouterLink>

          <p v-if="filteredNavigation.length === 0" class="px-3 py-5 text-center text-xs text-glass-muted">
            {{ t('settings.shell.noResults') }}
          </p>
        </nav>
      </aside>

      <div class="h-full min-w-0 flex flex-1 flex-col overflow-hidden">
        <header
          class="flex shrink-0 items-center gap-3 border-b border-neutral-200/60 px-6 py-4 dark:border-neutral-800/60 <md:px-4"
        >
          <span class="size-10 flex shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500">
            <span :class="[currentNavigationItem?.icon || 'i-solar:settings-bold-duotone', 'size-5']" />
          </span>
          <span class="min-w-0 flex-1">
            <h1 class="m-0 truncate text-lg font-semibold tracking-tight">
              {{ routeHeaderMetadata.title }}
            </h1>
            <p v-if="routeHeaderMetadata.subtitle" class="m-0 truncate text-xs text-glass-muted">
              {{ routeHeaderMetadata.subtitle }}
            </p>
          </span>
          <BasicButton
            size="unset"
            :class="[
              'glass-focus-ring size-8 shrink-0 rounded-lg text-glass-muted',
              'transition-colors hover:bg-neutral-500/8 hover:text-glass-primary',
            ]"
            :aria-label="t('settings.shell.close')"
            @click="closeSettings"
          >
            <span class="i-solar:close-circle-linear size-4.5" />
          </BasicButton>
        </header>

        <main
          id="settings-scroll-container"
          class="settings-content scrollbar-glass min-h-0 flex-1 overflow-y-auto px-6 py-6 <md:px-4 <md:py-5"
        >
          <div :class="['mx-auto w-full', contentWidthClass]">
            <RouterView />
          </div>
        </main>
      </div>
    </section>
  </div>
</template>

<style scoped>
.settings-scrim {
  background: rgb(0 0 0 / 40%);
  backdrop-filter: blur(2px);
}

.settings-shell {
  border: 1px solid rgb(245 245 255 / 20%);
  background: rgb(33 33 44 / 75%);
  backdrop-filter: blur(30px);
  box-shadow: 0 12px 50px rgb(0 0 0 / 50%);
}

.settings-sidebar {
  background: rgb(115 115 115 / 2.4%);
}

.settings-content {
  background: linear-gradient(to right bottom, transparent, oklch(0.62 0.149556 220.44 / 2.5%));
}

@media (prefers-reduced-transparency: reduce) {
  .settings-scrim { backdrop-filter: none; }
  .settings-shell { background: var(--color-space-surface); }
}
</style>
