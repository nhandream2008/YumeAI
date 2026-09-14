import type { ChatProviderWithExtraOptions } from '@xsai-ext/providers/utils'

import type { ChatRequestOptions, ProviderInstance, ProviderTranslator } from '../../../types'

import { describe, expect, it } from 'vitest'

import { providerOllama, resolveOllamaConnection, resolveOllamaReasoningEffort } from './index'

const translate = ((key: string) => key) as unknown as ProviderTranslator

type OllamaChatProvider = ChatProviderWithExtraOptions<string, ChatRequestOptions>

function isOllamaChatProvider(provider: ProviderInstance): provider is OllamaChatProvider {
  return 'chat' in provider && typeof provider.chat === 'function'
}

async function createOllamaChatProvider(thinkingMode: 'auto' | 'disable' | 'enable'): Promise<OllamaChatProvider> {
  const provider = await providerOllama.createProvider({
    baseUrl: 'http://localhost:11434/v1/',
    thinkingMode,
  })
  if (!isOllamaChatProvider(provider))
    throw new Error('Ollama provider must support chat')

  return provider
}

describe('providerOllama.resolveOllamaReasoningEffort', () => {
  it('should return undefined for auto mode', () => {
    expect(resolveOllamaReasoningEffort('auto')).toBeUndefined()
  })

  it('should map disable/enable to OpenAI-compatible effort values', () => {
    expect(resolveOllamaReasoningEffort('disable')).toBe('none')
    expect(resolveOllamaReasoningEffort('enable')).toBe('medium')
  })

  it('should pass level modes through unchanged', () => {
    expect(resolveOllamaReasoningEffort('low')).toBe('low')
    expect(resolveOllamaReasoningEffort('medium')).toBe('medium')
    expect(resolveOllamaReasoningEffort('high')).toBe('high')
  })

  it('should fallback invalid values to auto mode', () => {
    expect(resolveOllamaReasoningEffort('invalid')).toBeUndefined()
  })
})

describe('providerOllama.resolveOllamaConnection', () => {
  it('uses the local endpoint without credentials by default', () => {
    expect(resolveOllamaConnection({
      baseUrl: 'http://localhost:11434/v1/',
      thinkingMode: 'auto',
    })).toEqual({
      apiKey: '',
      baseUrl: 'http://localhost:11434/v1/',
      mode: 'local',
    })
  })

  it('uses the hosted Ollama endpoint and API key in web mode', () => {
    expect(resolveOllamaConnection({
      apiKey: ' ollama-key ',
      baseUrl: 'http://localhost:11434/v1/',
      connectionMode: 'web',
      thinkingMode: 'auto',
    })).toEqual({
      apiKey: 'ollama-key',
      baseUrl: 'https://ollama.com/v1',
      mode: 'web',
    })
  })

  it('recognizes a persisted Web display label', () => {
    expect(resolveOllamaConnection({
      apiKey: 'web-key',
      baseUrl: 'not-a-url',
      connectionMode: 'Ollama Web' as unknown as 'web',
      thinkingMode: 'auto',
    })).toEqual({
      apiKey: 'web-key',
      baseUrl: 'https://ollama.com/v1',
      mode: 'web',
    })
  })

  it('does not validate the stale local URL in Web mode', async () => {
    const createValidator = providerOllama.validators?.validateConfig?.[0]
    if (!createValidator)
      throw new Error('Ollama config validator is missing')

    const validator = await createValidator({ t: translate })
    const result = await validator.validator({
      apiKey: 'web-key',
      baseUrl: 'not-a-url',
      connectionMode: 'Ollama Web' as unknown as 'web',
      thinkingMode: 'auto',
    }, { t: translate })

    expect(result.valid).toBe(true)
  })
})

describe('providerOllama.createProvider chat options', () => {
  it('uses Ollama Web credentials and endpoint in web mode', async () => {
    const provider = await providerOllama.createProvider({
      apiKey: 'web-key',
      connectionMode: 'web',
      thinkingMode: 'auto',
    })
    if (!isOllamaChatProvider(provider))
      throw new Error('Ollama provider must support chat')

    expect(provider.chat('gpt-oss:20b')).toMatchObject({
      apiKey: 'web-key',
      baseURL: 'https://ollama.com/v1',
    })
  })

  it('should not set reasoning effort when thinkingMode is auto', async () => {
    const provider = await createOllamaChatProvider('auto')

    expect(provider.chat('qwen3:8b')).not.toHaveProperty('reasoningEffort')
  })

  it('should set reasoning effort to none for non gpt-oss when thinkingMode is disable', async () => {
    const provider = await createOllamaChatProvider('disable')

    expect(provider.chat('qwen3:8b')).toMatchObject({ reasoningEffort: 'none' })
  })

  it('should set reasoning effort to medium when thinkingMode is enable', async () => {
    const provider = await createOllamaChatProvider('enable')

    expect(provider.chat('gpt-oss:20b')).toMatchObject({ reasoningEffort: 'medium' })
  })

  it('should set reasoning effort to none when thinkingMode is disable', async () => {
    const provider = await createOllamaChatProvider('disable')

    expect(provider.chat('gpt-oss:20b')).toMatchObject({ reasoningEffort: 'none' })
  })

  it('should apply request reasoning without checking the model name', async () => {
    const provider = await createOllamaChatProvider('auto')

    expect(provider.chat('llama3.2', { reasoning: 'disabled' })).toMatchObject({ reasoningEffort: 'none' })
    expect(provider.chat('gpt-oss:20b', { reasoning: 'enabled' })).toMatchObject({ reasoningEffort: 'medium' })
  })
})
