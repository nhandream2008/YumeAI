<script setup lang="ts">
import type { ChatSessionMeta } from '@proj-airi/stage-ui/types/chat-session'

import { extractMessageText } from '@proj-airi/stage-ui/libs/chat-sync'
import { useAuthStore } from '@proj-airi/stage-ui/stores/auth'
import { useChatStore } from '@proj-airi/stage-ui/stores/chat'
import { useChatSessionStore } from '@proj-airi/stage-ui/stores/chat/session-store'
import { useAiriCardStore } from '@proj-airi/stage-ui/stores/modules/airi-card'
import { BasicButton } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { computed, nextTick, shallowRef, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

defineEmits<{
  collapse: []
}>()

const { locale, t } = useI18n()
const sessionsStore = useChatSessionStore()
const chatStore = useChatStore()
const { sessionMetas, sessionMessages, activeSessionId } = storeToRefs(sessionsStore)
const { activeCardId } = storeToRefs(useAiriCardStore())
const { userId } = storeToRefs(useAuthStore())
const searchOpen = shallowRef(false)
const searchQuery = shallowRef('')
const creating = shallowRef(false)
const searchInput = useTemplateRef<HTMLInputElement>('searchInput')
const yumeLogoUrl = '/yumeai-logo.png'

const navigation = computed(() => [
  {
    label: t('stage.neko.navigation.characters'),
    to: '/settings/nekoai-card',
    icon: 'i-solar:user-heart-rounded-bold-duotone',
  },
  {
    label: t('stage.neko.navigation.memory'),
    to: '/settings/memory',
    icon: 'i-solar:notes-bold-duotone',
  },
  {
    label: t('stage.neko.navigation.modules'),
    to: '/settings/modules',
    icon: 'i-solar:box-minimalistic-bold-duotone',
  },
  {
    label: t('stage.neko.navigation.scene'),
    to: '/settings/scene',
    icon: 'i-solar:gallery-wide-bold-duotone',
  },
])

function titleFor(meta: ChatSessionMeta) {
  if (meta.title)
    return meta.title

  for (const message of sessionMessages.value[meta.sessionId] ?? []) {
    if (message.role === 'system')
      continue

    const text = extractMessageText(message).replace(/\s+/g, ' ').trim()
    if (text)
      return text.length > 42 ? `${text.slice(0, 42)}…` : text
  }

  return t('stage.chat.sessions.new-chat-fallback')
}

function relativeTime(timestamp: number) {
  const delta = timestamp - Date.now()
  const formatter = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' })

  for (const [unit, milliseconds] of [
    ['day', 86_400_000],
    ['hour', 3_600_000],
    ['minute', 60_000],
  ] as const) {
    if (Math.abs(delta) >= milliseconds)
      return formatter.format(Math.round(delta / milliseconds), unit)
  }

  return formatter.format(0, 'second')
}

const sessions = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()

  return Object.values(sessionMetas.value)
    .filter(meta => meta.userId === (userId.value || 'local'))
    .map(meta => ({ meta, title: titleFor(meta) }))
    .filter(row => !query || row.title.toLocaleLowerCase().includes(query))
    .sort((a, b) => b.meta.updatedAt - a.meta.updatedAt)
})

async function createSession() {
  if (creating.value)
    return

  creating.value = true
  try {
    const id = await sessionsStore.createSession(activeCardId.value || 'default', { setActive: false })
    await sessionsStore.setActiveSession(id)
  }
  finally {
    creating.value = false
  }
}

async function toggleSearch() {
  searchOpen.value = !searchOpen.value

  if (!searchOpen.value) {
    searchQuery.value = ''
    return
  }

  await nextTick()
  searchInput.value?.focus()
}

function closeSearch() {
  searchOpen.value = false
  searchQuery.value = ''
}
</script>

<template>
  <div class="absolute inset-y-0 left-0 z-30 py-3 pl-3 hidden md:block">
    <aside
      :class="[
        'h-full w-[17.5rem] flex flex-col overflow-hidden rounded-2xl',
        'glass-tier-2 text-glass-primary animate-sidebarIn origin-left',
        'motion-reduce:animate-none',
      ]"
    >
      <header class="flex shrink-0 items-center gap-1 px-2 pb-1 pt-2">
        <BasicButton
          size="unset"
          :class="[
            'glass-focus-ring size-9 shrink-0 rounded-xl text-glass-secondary',
            'transition-colors hover:bg-primary-500/8 hover:text-primary-500',
          ]"
          :aria-label="t('stage.neko.collapseSidebar')"
          @click="$emit('collapse')"
        >
          <span class="i-solar:sidebar-minimalistic-bold-duotone size-5" />
        </BasicButton>

        <RouterLink class="flex items-center gap-2 rounded-xl px-2 no-underline glass-focus-ring" to="/">
          <img :src="yumeLogoUrl" alt="YumeAI" class="size-8 object-contain">
          <span class="text-2xl text-glass-primary font-semibold leading-8 tracking-tight">YumeAI</span>
        </RouterLink>
      </header>

      <nav class="flex flex-col gap-0.5 p-2" :aria-label="t('stage.neko.primaryNavigation')">
        <BasicButton
          size="unset"
          :loading="creating"
          class="w-full justify-start gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm text-glass-primary glass-focus-ring transition-colors duration-150 hover:bg-primary-500/8"
          @click="createSession"
        >
          <span class="i-solar:add-circle-bold-duotone size-4.5 shrink-0 text-glass-secondary" />
          <span class="flex-1 truncate">{{ t('stage.chat.sessions.new') }}</span>
        </BasicButton>

        <BasicButton
          size="unset"
          class="w-full justify-start gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm text-glass-primary glass-focus-ring transition-colors duration-150 hover:bg-primary-500/8"
          :aria-expanded="searchOpen"
          @click="toggleSearch"
        >
          <span class="i-solar:magnifer-linear size-4.5 shrink-0 text-glass-secondary" />
          <span class="flex-1 truncate">{{ t('stage.neko.searchConversations') }}</span>
        </BasicButton>

        <RouterLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          class="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm text-glass-primary no-underline glass-focus-ring transition-colors duration-150 hover:bg-primary-500/8"
        >
          <span :class="[item.icon, 'size-4.5 shrink-0 text-glass-secondary']" />
          <span class="flex-1 truncate">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <Transition name="fade">
        <div v-if="searchOpen" class="px-2 pb-2">
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            class="w-full glass-tier-1 rounded-xl px-3 py-1.5 text-sm text-glass-primary glass-focus-ring outline-none transition-all duration-200 ease-in-out focus:border-primary-400 placeholder:text-glass-muted"
            :placeholder="t('stage.neko.searchConversations')"
            :aria-label="t('stage.neko.searchConversations')"
            @keydown.esc="closeSearch"
          >
        </div>
      </Transition>

      <div class="px-3 pb-1 pt-2 text-[0.6875rem] text-glass-muted font-medium">
        {{ t('stage.neko.recent') }}
      </div>

      <section class="scrollbar-glass min-h-0 flex-1 overflow-y-auto px-2 pb-2" :aria-label="t('stage.neko.recent')">
        <ul class="grid m-0 list-none gap-0.5 p-0">
          <li
            v-for="row in sessions"
            :key="row.meta.sessionId"
            :class="[
              'group relative w-full rounded-xl transition-colors',
              row.meta.sessionId === activeSessionId
                ? 'bg-primary-500/12'
                : 'hover:bg-primary-500/8',
            ]"
          >
            <BasicButton
              size="unset"
              class="w-full flex-col items-start gap-0.5 rounded-xl px-2.5 py-2 pr-10 text-left glass-focus-ring"
              @click="sessionsStore.setActiveSession(row.meta.sessionId)"
            >
              <strong class="block w-full truncate text-[0.8125rem] font-500">{{ row.title }}</strong>
              <small class="block w-full truncate text-[0.625rem] text-glass-muted">{{ relativeTime(row.meta.updatedAt) }}</small>
            </BasicButton>

            <BasicButton
              size="unset"
              :class="[
                'glass-focus-ring absolute right-1.5 top-1.5 size-6 rounded-lg opacity-0',
                'text-glass-muted transition-opacity duration-150 hover:bg-red-500/10 hover:text-red-500',
                'group-hover:opacity-100 focus:opacity-100',
              ]"
              :aria-label="t('stage.neko.deleteConversation', { title: row.title })"
              @click.stop="chatStore.deleteSession(row.meta.sessionId)"
            >
              <span class="i-solar:trash-bin-trash-outline size-4" />
            </BasicButton>
          </li>
        </ul>

        <p v-if="sessions.length === 0" class="px-3 py-5 text-center text-xs text-glass-muted">
          {{ t('stage.neko.noConversationsFound') }}
        </p>
      </section>

      <div class="border-t border-[var(--color-glass-border-2)] p-2">
        <RouterLink
          class="w-full flex items-center gap-2.5 rounded-xl p-1.5 text-glass-primary no-underline glass-focus-ring transition-colors hover:bg-primary-500/8"
          to="/settings"
        >
          <span class="size-8 flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-500/15 text-glass-secondary">
            <span class="i-solar:user-rounded-bold-duotone size-4.5" />
          </span>
          <span class="min-w-0 flex flex-1 flex-col">
            <strong class="truncate text-[0.8125rem] font-500">ReLU</strong>
            <small class="truncate text-[0.6875rem] text-glass-muted">{{ t('stage.neko.localOnly') }}</small>
          </span>
          <span class="i-solar:settings-minimalistic-bold-duotone size-4 shrink-0 text-glass-muted" />
        </RouterLink>
      </div>
    </aside>
  </div>
</template>
