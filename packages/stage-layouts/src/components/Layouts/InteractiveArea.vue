<script setup lang="ts">
import type { ChatHistoryItem } from '@proj-airi/stage-ui/types/chat'

import { ChatHistory } from '@proj-airi/stage-ui/components'
import { useChatComposer } from '@proj-airi/stage-ui/components/scenarios/chat'
import { useAnalytics } from '@proj-airi/stage-ui/composables/use-analytics'
import { extractMessageText } from '@proj-airi/stage-ui/libs/chat-sync'
import { useChatStore } from '@proj-airi/stage-ui/stores/chat'
import { useChatSessionStore } from '@proj-airi/stage-ui/stores/chat/session-store'
import { useChatStreamStore } from '@proj-airi/stage-ui/stores/chat/stream-store'
import { useContextBridgeStore } from '@proj-airi/stage-ui/stores/mods/api/context-bridge'
import { BasicButton, useDeferredMount } from '@proj-airi/ui'
import { storeToRefs } from 'pinia'
import { computed, nextTick, shallowRef, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

import ChatArea from '../Widgets/ChatArea.vue'

import { useChatToolCallRerun } from '../../composables/useChatToolCallRerun'

const { isReady } = useDeferredMount()
const { t } = useI18n()
const chatOrchestrator = useChatStore()
const { activeSendSessionId, activeStreamingMessage, sending }
  = storeToRefs(chatOrchestrator)
const { activeSessionId, messages } = storeToRefs(useChatSessionStore())
const { streamingMessage } = storeToRefs(useChatStreamStore())
const { isReceivingRemoteStream } = storeToRefs(useContextBridgeStore())

const isLoading = shallowRef(true)
const chatArea = useTemplateRef<InstanceType<typeof ChatArea>>('chatArea')
const composer = useChatComposer({
  activeSessionId,
  send: submission =>
    chatOrchestrator.send({
      sessionId: submission.sessionId,
      text: submission.text,
      replyToMessageId: submission.replyToMessageId,
    }),
})
const { clearReplyForMessage, selectReply } = composer
const historyMessages = computed(
  () => messages.value as unknown as ChatHistoryItem[],
)
const isActiveSessionSending = computed(
  () =>
    (sending.value && activeSendSessionId.value === activeSessionId.value)
    || isReceivingRemoteStream.value,
)
const visibleStreamingMessage = computed(() =>
  activeSendSessionId.value === activeSessionId.value
    ? activeStreamingMessage.value
    : streamingMessage.value,
)
const hasConversationMessages = computed(() =>
  historyMessages.value.some(message => message.role !== 'system'),
)
const hasStreamingContent = computed(() => {
  const message = visibleStreamingMessage.value

  return message ? extractMessageText(message).trim().length > 0 : false
})
const { trackChatMessageDeleted } = useAnalytics()
const { rerunToolCall } = useChatToolCallRerun()

const promptBank = [
  { icon: 'i-solar:cup-hot-bold-duotone', key: 'company' },
  { icon: 'i-solar:user-heart-rounded-bold-duotone', key: 'about' },
  { icon: 'i-solar:pen-new-square-bold-duotone', key: 'write' },
  { icon: 'i-solar:lightbulb-bolt-bold-duotone', key: 'brainstorm' },
  { icon: 'i-solar:magic-stick-3-bold-duotone', key: 'surprise' },
  { icon: 'i-solar:book-bookmark-bold-duotone', key: 'explain' },
  { icon: 'i-solar:checklist-minimalistic-bold-duotone', key: 'plan' },
  { icon: 'i-solar:stars-bold-duotone', key: 'cheer' },
] as const
const selectedPromptKeys = shallowRef([...promptBank]
  .sort(() => Math.random() - 0.5)
  .slice(0, 5))
const suggestedPrompts = computed(() => selectedPromptKeys.value.map(prompt => ({
  icon: prompt.icon,
  label: t(`stage.neko.prompts.${prompt.key}`),
})))
const welcomeSubtitleKey = shallowRef([
  'mind',
  'start',
  'listen',
  'new',
  'company',
][Math.floor(Math.random() * 5)] ?? 'mind')
const welcomeTitleKey = shallowRef((() => {
  const hour = new Date().getHours()
  if (hour < 5 || hour >= 23)
    return 'late'
  if (hour < 12)
    return 'morning'
  if (hour < 18)
    return 'afternoon'
  return 'evening'
})())
const showWelcome = computed(
  () => !hasConversationMessages.value && !hasStreamingContent.value,
)

async function choosePrompt(text: string) {
  composer.draft.value = text
  await nextTick()
  chatArea.value?.focus()
}

async function handleDeleteMessage(payload: {
  message: ChatHistoryItem
  index: number
}) {
  const { index, message } = payload
  await useChatSessionStore().deleteMessage({
    sessionId: activeSessionId.value,
    messageId: message?.id,
    index,
  })
  trackChatMessageDeleted({
    source: 'history',
    message_role: message?.role ?? 'unknown',
  })
  clearReplyForMessage(message)
}
</script>

<template>
  <div
    :class="[
      'pointer-events-none relative isolate h-full w-full grid overflow-hidden rounded-2xl text-glass-primary transition-[grid-template-rows] duration-400 ease-out-expo motion-reduce:transition-none',
      showWelcome
        ? 'grid-rows-[minmax(0,1fr)_auto_minmax(0,1fr)]'
        : 'grid-rows-[minmax(0,1fr)_auto_0fr]',
    ]"
  >
    <Transition name="fade" mode="out-in">
      <section
        v-if="showWelcome"
        key="welcome"
        class="relative w-full"
      >
        <div class="pointer-events-auto absolute inset-x-0 bottom-0 w-full flex flex-col items-center gap-3 pb-5">
          <div class="flex flex-col items-center gap-0.5 text-center">
            <h1 class="text-halo m-0 text-2xl text-glass-primary font-semibold leading-tight">
              {{ t(`stage.neko.welcome.title.${welcomeTitleKey}`) }}
            </h1>
            <p class="text-halo m-0 text-sm text-glass-secondary leading-tight">
              {{ t(`stage.neko.welcome.subtitle.${welcomeSubtitleKey}`) }}
            </p>
          </div>
          <div class="flex flex-wrap items-center justify-center gap-1.5">
            <BasicButton
              v-for="prompt in suggestedPrompts"
              :key="prompt.label"
              size="unset"
              :class="[
                'glass-focus-ring flex items-center gap-1.5 rounded-full border border-solid border-[var(--color-glass-border-2)] px-3 py-1.5 outline-none',
                'text-halo text-xs text-glass-secondary transition-colors hover:bg-primary-500/10 hover:text-primary-500',
              ]"
              @click="choosePrompt(prompt.label)"
            >
              <span :class="[prompt.icon, 'size-3.5 shrink-0']" />
              <span>{{ prompt.label }}</span>
            </BasicButton>
          </div>
        </div>
      </section>
      <section v-else key="history" class="min-h-0 overflow-hidden pt-14 [&>div]:h-full">
        <span
          v-if="isLoading"
          class="i-svg-spinners:3-dots-move absolute left-1/2 top-4 size-5 text-[var(--color-accent)] -translate-x-1/2"
        />
        <ChatHistory
          v-if="isReady"
          :messages="historyMessages"
          :sending="isActiveSessionSending"
          :streaming-message="visibleStreamingMessage"
          variant="desktop"
          @delete-message="handleDeleteMessage"
          @reply-message="selectReply"
          @tool-call-rerun="rerunToolCall"
          @vue:mounted="isLoading = false"
        />
      </section>
    </Transition>
    <ChatArea ref="chatArea" :composer="composer" />
    <div aria-hidden="true" />
  </div>
</template>
