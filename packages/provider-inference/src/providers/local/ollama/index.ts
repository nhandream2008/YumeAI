import type { ChatRequestOptions } from '../../../types'

import { createOllama, createOllamaCloud } from '@xsai-ext/providers/create'
import { z } from 'zod'

import { ProviderValidationCheck } from '../../../types'
import { createOpenAICompatibleValidators } from '../../../validators'
import { defineProvider } from '../../registry'

type OllamaReasoningEffort = 'high' | 'low' | 'medium' | 'none'
type OllamaThinkingMode = 'auto' | 'disable' | 'enable' | 'high' | 'low' | 'medium'
type OllamaConnectionMode = 'local' | 'web'

const OLLAMA_WEB_BASE_URL = 'https://ollama.com/v1'

const ollamaConfigSchema = z.object({
  connectionMode: z.enum(['local', 'web'])
    .default('local'),
  apiKey: z.string()
    .optional(),
  baseUrl: z.string()
    .default('http://localhost:11434/v1/'),
  thinkingMode: z.enum(['auto', 'disable', 'enable', 'low', 'medium', 'high'])
    .default('auto'),
  headers: z.record(z.string(), z.string())
    .optional(),
})

type OllamaConfig = z.input<typeof ollamaConfigSchema>

interface OllamaConnection {
  apiKey: string
  baseUrl: string
  mode: OllamaConnectionMode
}

function normalizeOllamaConnectionMode(value: unknown): OllamaConnectionMode {
  if (typeof value === 'string' && value.trim().toLowerCase().includes('web'))
    return 'web'

  return 'local'
}

/**
 * Resolves the endpoint and credentials used by an Ollama configuration.
 *
 * @example
 * resolveOllamaConnection({ connectionMode: 'web', apiKey: 'token' })
 * // => { mode: 'web', apiKey: 'token', baseUrl: 'https://ollama.com/v1' }
 */
export function resolveOllamaConnection(config: OllamaConfig): OllamaConnection {
  const mode = normalizeOllamaConnectionMode(config.connectionMode)

  return {
    mode,
    apiKey: config.apiKey?.trim() ?? '',
    baseUrl: mode === 'web'
      ? OLLAMA_WEB_BASE_URL
      : config.baseUrl?.trim() || 'http://localhost:11434/v1/',
  }
}

function normalizeOllamaThinkingMode(value: unknown): OllamaThinkingMode {
  switch (value) {
    case 'auto':
    case 'disable':
    case 'enable':
    case 'high':
    case 'low':
    case 'medium':
      return value
    default:
      return 'auto'
  }
}

/**
 * Maps the persisted Ollama setting to its OpenAI-compatible effort value.
 *
 * @example
 * resolveOllamaReasoningEffort('disable')
 * // => 'none'
 */
export function resolveOllamaReasoningEffort(modeRaw: unknown): OllamaReasoningEffort | undefined {
  const mode = normalizeOllamaThinkingMode(modeRaw)

  switch (mode) {
    case 'auto':
      return undefined
    case 'disable':
      return 'none'
    case 'enable':
      return 'medium'
    case 'low':
    case 'medium':
    case 'high':
      return mode
    default:
      return undefined
  }
}

export const providerOllama = defineProvider<OllamaConfig, 'ollama'>({
  id: 'ollama',
  order: 2,
  name: 'Ollama',
  nameLocalize: ({ t }) => t('settings.pages.providers.provider.ollama.title'),
  description: 'Local Ollama server for fast model iteration.',
  descriptionLocalize: ({ t }) => t('settings.pages.providers.provider.ollama.description'),
  tasks: ['chat'],
  capabilities: { chat: { reasoning: { modes: ['enabled', 'disabled'] } } },
  icon: 'i-lobe-icons:ollama',

  createProviderConfig: ({ t }) => ollamaConfigSchema.extend({
    connectionMode: ollamaConfigSchema.shape.connectionMode
      .meta({
        labelLocalized: t('settings.pages.providers.provider.ollama.fields.connection-mode.label'),
        descriptionLocalized: t('settings.pages.providers.provider.ollama.fields.connection-mode.description'),
        type: 'select',
        options: [
          {
            label: t('settings.pages.providers.provider.ollama.fields.connection-mode.options.local'),
            value: 'local',
          },
          {
            label: t('settings.pages.providers.provider.ollama.fields.connection-mode.options.web'),
            value: 'web',
          },
        ],
      }),
    apiKey: ollamaConfigSchema.shape.apiKey
      .meta({
        labelLocalized: t('settings.pages.providers.provider.ollama.fields.api-key.label'),
        descriptionLocalized: t('settings.pages.providers.provider.ollama.fields.api-key.description'),
        placeholderLocalized: t('settings.pages.providers.provider.ollama.fields.api-key.placeholder'),
        type: 'password',
      }),
    baseUrl: ollamaConfigSchema.shape.baseUrl
      .meta({
        labelLocalized: t('settings.pages.providers.provider.ollama.fields.base-url.label'),
        descriptionLocalized: t('settings.pages.providers.provider.ollama.fields.base-url.description'),
        placeholderLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.base-url.placeholder'),
        section: 'advanced',
      }),
    thinkingMode: ollamaConfigSchema.shape.thinkingMode
      .meta({
        labelLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.thinking-mode.label'),
        descriptionLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.thinking-mode.description'),
        section: 'advanced',
        type: 'select',
        options: [
          {
            label: t('settings.pages.providers.catalog.edit.config.common.fields.field.thinking-mode.options.auto'),
            value: 'auto',
          },
          {
            label: t('settings.pages.providers.catalog.edit.config.common.fields.field.thinking-mode.options.disable'),
            value: 'disable',
          },
          {
            label: t('settings.pages.providers.catalog.edit.config.common.fields.field.thinking-mode.options.enable'),
            value: 'enable',
          },
          {
            label: t('settings.pages.providers.catalog.edit.config.common.fields.field.thinking-mode.options.low'),
            value: 'low',
          },
          {
            label: t('settings.pages.providers.catalog.edit.config.common.fields.field.thinking-mode.options.medium'),
            value: 'medium',
          },
          {
            label: t('settings.pages.providers.catalog.edit.config.common.fields.field.thinking-mode.options.high'),
            value: 'high',
          },
        ],
      }),
    headers: ollamaConfigSchema.shape.headers
      .meta({
        labelLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.headers.label'),
        descriptionLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.headers.description'),
        section: 'advanced',
        type: 'key-values',
      }),
  }),
  createProvider(config) {
    const connection = resolveOllamaConnection(config)
    const baseProvider = connection.mode === 'web'
      ? createOllamaCloud(connection.apiKey, connection.baseUrl)
      : createOllama(connection.apiKey, connection.baseUrl)

    return {
      ...baseProvider,
      chat(model: string, options?: ChatRequestOptions) {
        const chatOptions = baseProvider.chat(model)
        if (options?.reasoning) {
          return {
            ...chatOptions,
            reasoningEffort: options.reasoning === 'enabled' ? 'medium' : 'none',
          }
        }

        const reasoningEffort = resolveOllamaReasoningEffort(config.thinkingMode)

        if (reasoningEffort === undefined)
          return chatOptions

        return { ...chatOptions, reasoningEffort }
      },
    }
  },
  validationRequiredWhen: () => true,
  validators: {
    validateConfig: [
      ({ t }) => ({
        id: 'ollama:check-config',
        name: t('settings.pages.providers.catalog.edit.validators.openai-compatible.check-config.title'),
        validator: async (config) => {
          const errors: Array<{ error: unknown }> = []
          const connection = resolveOllamaConnection(config)
          const baseUrl = connection.baseUrl

          if (connection.mode === 'web' && !connection.apiKey)
            errors.push({ error: new Error('Ollama API key is required for Ollama Web.') })

          if (baseUrl) {
            try {
              const parsed = new URL(baseUrl)
              if (!parsed.host)
                errors.push({ error: new Error('Base URL is not absolute. Check your input.') })
            }
            catch {
              errors.push({ error: new Error('Base URL is invalid. It must be an absolute URL.') })
            }
          }

          return {
            errors,
            reason: errors.length > 0 ? errors.map(item => (item.error as Error).message).join(', ') : '',
            reasonKey: '',
            valid: errors.length === 0,
          }
        },
      }),
    ],
    validateProvider: createOpenAICompatibleValidators<OllamaConfig>({
      checks: [ProviderValidationCheck.Connectivity, ProviderValidationCheck.ModelList, ProviderValidationCheck.ChatCompletions],
      schedule: {
        mode: 'interval',
        intervalMs: 15_000,
      },
      connectivityFailureReason: ({ config, errorMessage }) => resolveOllamaConnection(config).mode === 'web'
        ? `Failed to reach Ollama Web: ${errorMessage}`
        : `Failed to reach Ollama server, error: ${errorMessage} occurred.\n\nIf you are using Ollama locally, this is likely the CORS (Cross-Origin Resource Sharing) security issue, where you will need to set OLLAMA_ORIGINS=* or OLLAMA_ORIGINS=https://airi.moeru.ai,http://localhost environment variable before launching Ollama server to make this work.`,
      resolveConfig: (config) => {
        const connection = resolveOllamaConnection(config)
        return {
          ...config,
          apiKey: connection.apiKey,
          baseUrl: connection.baseUrl,
        }
      },
    })!.validateProvider,
  },
  business: ({ t }) => ({
    troubleshooting: {
      validators: {
        openaiCompatibleCheckConnectivity: {
          label: t('settings.pages.providers.catalog.edit.providers.provider.ollama.troubleshooting.validators.openai-compatible-check-connectivity.label'),
          content: t('settings.pages.providers.catalog.edit.providers.provider.ollama.troubleshooting.validators.openai-compatible-check-connectivity.content'),
        },
      },
    },
  }),
})
