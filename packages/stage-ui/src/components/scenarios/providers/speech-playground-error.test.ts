import { describe, expect, it } from 'vitest'

import { normalizeSpeechPlaygroundError } from './speech-playground-error'

const messages = {
  invalidApiKey: 'Check the API key.',
  unknown: 'The voice test failed.',
}

describe('normalizeSpeechPlaygroundError', () => {
  it('replaces a raw ElevenLabs 401 response with a clear message', () => {
    // ROOT CAUSE:
    //
    // The provider proxy includes its complete JSON response in the error.
    // The playground displayed that response without an authentication mapping.
    // We now map the stable 401 and authentication markers to one clear message.
    const error = new Error('Remote sent 401 response: {"type":"authentication_error","message":"Invalid API key"}')

    expect(normalizeSpeechPlaygroundError(error, messages)).toBe('Check the API key.')
  })

  it('keeps a useful provider error', () => {
    expect(normalizeSpeechPlaygroundError(new Error('Voice ID was not found.'), messages)).toBe('Voice ID was not found.')
  })

  it('uses the fallback when the error has no message', () => {
    expect(normalizeSpeechPlaygroundError(undefined, messages)).toBe('The voice test failed.')
  })
})
