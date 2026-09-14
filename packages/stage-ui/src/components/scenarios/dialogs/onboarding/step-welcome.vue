<script setup lang="ts">
import type { OnboardingStepNextHandler } from './types'

import { all } from '@proj-airi/i18n'
import { AnimatedContent, BasicButton, Button } from '@proj-airi/ui'
import { useLocalStorage } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import {
  CheckboxIndicator,
  CheckboxRoot,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from 'reka-ui'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import onboardingLogo from '../../../../assets/onboarding.avif'

import { useAuthStore } from '../../../../stores/auth'
import { useOnboardingStore } from '../../../../stores/onboarding'
import { useSettingsGeneral } from '../../../../stores/settings'

interface Props {
  customProviderSetupEnabled: boolean
  onNext: OnboardingStepNextHandler
  onSkipPreferenceChange: (value: boolean) => void
}

const props = defineProps<Props>()
const { t } = useI18n()
const authStore = useAuthStore()
const onboardingStore = useOnboardingStore()
const settingsStore = useSettingsGeneral()
const { language } = storeToRefs(settingsStore)
const dontShowAgain = useLocalStorage('onboarding/skipped', false)

watch(dontShowAgain, value => props.onSkipPreferenceChange(value), { immediate: true })

const languages = computed(() => {
  return Object.entries(all).map(([value, label]) => ({ value, label }))
})

function handleLogin() {
  onboardingStore.showingSetup = false
  authStore.needsLogin = true
}

function handleLocalSetup() {
  props.onNext()
}
</script>

<template>
  <div class="relative h-full flex flex-col text-[#f5f5ff]">
    <div class="absolute right-0 top-0 z-10">
      <DropdownMenuRoot>
        <DropdownMenuTrigger as-child>
          <BasicButton
            size="unset"
            :class="[
              'glass-focus-ring size-10 rounded-[10px] border-2 border-white/90 text-white',
              'hover:bg-white/8 hover:text-white',
              'data-[state=open]:bg-[var(--color-glass-highlight)]',
            ]"
            :aria-label="t('settings.language.title')"
          >
            <span aria-hidden="true" class="i-lucide:globe size-5" />
          </BasicButton>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent
            as-child
            align="end"
            side="bottom"
            :side-offset="6"
            :class="[
              'glass-tier-3 z-10000 min-w-36 rounded-xl p-1 outline-none',
              'text-glass-primary',
            ]"
          >
            <AnimatedContent>
              <DropdownMenuItem
                v-for="lang in languages"
                :key="lang.value"
                :class="[
                  'flex cursor-pointer select-none items-center rounded-lg px-3 py-2',
                  'text-sm leading-none outline-none',
                  'data-[highlighted]:bg-[var(--color-glass-highlight)]',
                  'transition-colors duration-150 ease-in-out',
                  lang.value === language ? 'bg-[var(--color-accent-surface)] text-[var(--color-on-accent-surface)]' : '',
                ]"
                @select="() => language = lang.value"
              >
                {{ lang.label }}
              </DropdownMenuItem>
            </AnimatedContent>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>
    </div>
    <div
      :class="[
        'mb-3 flex flex-1 flex-col items-center justify-center text-center',
        'md:mb-0 md:flex-row md:gap-12 md:px-6 md:text-left',
      ]"
    >
      <div
        v-motion
        :initial="{ opacity: 0, scale: 0.5 }"
        :enter="{ opacity: 1, scale: 1 }"
        :duration="500"
        :class="['mb-2 flex justify-center', 'md:mb-0 md:shrink-0']"
      >
        <img
          :src="onboardingLogo"
          alt=""
          width="112"
          height="112"
          :class="[
            'aspect-square max-h-44 w-auto select-none object-contain',
            'md:max-h-28',
          ]"
        >
      </div>
      <div>
        <h2
          v-motion
          :initial="{ opacity: 0, y: 10 }"
          :enter="{ opacity: 1, y: 0 }"
          :duration="500"
          :class="[
            'text-halo mb-1 text-3xl font-700 tracking-tight text-balance',
            'md:mb-2',
          ]"
        >
          {{ t('settings.dialogs.onboarding.title') }}
        </h2>
        <p
          v-motion
          :initial="{ opacity: 0, y: 10 }"
          :enter="{ opacity: 1, y: 0 }"
          :duration="500"
          :delay="100"
          :class="['m-0 max-w-lg text-sm text-[#b6b6c9] text-pretty', 'md:text-base']"
        >
          {{ t('settings.dialogs.onboarding.description') }}
        </p>
        <p :class="['mb-0 mt-1 max-w-lg text-xs text-[#818198]']">
          {{ t('settings.dialogs.onboarding.copyright') }}
        </p>
      </div>
    </div>

    <div :class="['m-2 flex flex-col gap-3', 'md:flex-row md:items-center']">
      <label :class="['mx-2 flex cursor-pointer items-center justify-center gap-2 text-sm text-[#b6b6c9]', 'md:mr-auto']">
        <CheckboxRoot
          v-model="dontShowAgain"
          :class="[
            'glass-focus-ring size-5 flex items-center justify-center rounded-md',
            'border border-solid border-[var(--color-outline)] bg-transparent',
            'data-[state=checked]:border-[var(--color-accent)] data-[state=checked]:bg-[var(--color-accent)]',
          ]"
        >
          <CheckboxIndicator class="text-[var(--color-on-accent)]">
            <span aria-hidden="true" class="i-ph:check-bold block size-3.5" />
          </CheckboxIndicator>
        </CheckboxRoot>
        {{ t('settings.dialogs.onboarding.dontShowAgain') }}
      </label>

      <div :class="['flex flex-1 flex-col gap-3', 'md:flex-none md:flex-row']">
        <Button
          v-motion="{
            initial: { opacity: 0 },
            enter: { opacity: 1 },
            duration: 500,
            delay: 200,
          }"
          color="neutral"
          variant="secondary"
          :label="t('settings.dialogs.onboarding.loginAction')"
          :class="['flex-1 rounded-lg!', 'md:flex-none']"
          @click="handleLogin"
        />
        <Button
          v-if="props.customProviderSetupEnabled"
          v-motion="{
            initial: { opacity: 0 },
            enter: { opacity: 1 },
            duration: 500,
            delay: 250,
          }"
          color="primary"
          variant="primary"
          :label="t('settings.dialogs.onboarding.setupWithoutSigningIn')"
          :class="['flex-1 rounded-lg!', 'md:flex-none']"
          @click="handleLocalSetup"
        />
      </div>
    </div>
  </div>
</template>
