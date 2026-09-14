import { errorMessageFrom } from '@moeru/std'

export interface SpeechPlaygroundErrorMessages {
  invalidApiKey: string
  unknown: string
}

/**
 * Normalizes provider failures for the speech playground.
 *
 * @example
 * normalizeSpeechPlaygroundError(new Error('HTTP 401'), {
 *   invalidApiKey: 'Check the API key.',
 *   unknown: 'The voice test failed.',
 * })
 * // => 'Check the API key.'
 */
export function normalizeSpeechPlaygroundError(
  error: unknown,
  messages: SpeechPlaygroundErrorMessages,
) {
  const message = errorMessageFrom(error) ?? ''
  if (/\b401\b|invalid api key|authentication_error|unauthorized/i.test(message))
    return messages.invalidApiKey

  return message || messages.unknown
}
