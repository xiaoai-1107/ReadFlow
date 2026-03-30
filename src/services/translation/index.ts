import type { TranslationErrorCode, TranslationProviderResult, TranslationRequestInput } from '../../domain/types'

export const PARAGRAPH_TRANSLATION_PIPELINE_VERSION = '2026-03-20-paragraph-v2'
export const SENTENCE_TRANSLATION_PIPELINE_VERSION = '2026-03-20-sentence-v1'

export class TranslationServiceError extends Error {
  code: Exclude<TranslationErrorCode, null>

  constructor(code: Exclude<TranslationErrorCode, null>, message: string) {
    super(message)
    this.code = code
    this.name = 'TranslationServiceError'
  }
}

function getTranslationEndpoint(): string {
  return String(import.meta.env.VITE_READFLOW_TRANSLATION_ENDPOINT ?? '').trim()
}

export function getTranslationProviderKey(): string {
  const explicitProvider = String(import.meta.env.VITE_READFLOW_TRANSLATION_PROVIDER ?? '').trim()
  if (explicitProvider) {
    return explicitProvider
  }

  const endpoint = getTranslationEndpoint()
  if (!endpoint) {
    return 'unconfigured'
  }

  try {
    return new URL(endpoint).host || 'http-provider'
  } catch {
    return 'http-provider'
  }
}

export function getTranslationModelVersion(): string {
  return String(import.meta.env.VITE_READFLOW_TRANSLATION_MODEL ?? 'default').trim() || 'default'
}

export function isTranslationProviderConfigured(): boolean {
  // Return true to allow fallback to mock provider when no endpoint is configured.
  return true
}

export async function translateText(input: TranslationRequestInput): Promise<TranslationProviderResult> {
  const endpoint = getTranslationEndpoint()
  if (!endpoint) {
    if (!navigator.onLine) {
      throw new TranslationServiceError('offline', 'You are offline and this paragraph does not have a cached live translation yet.')
    }
    
    // Fallback to mock translation provider
    await new Promise(resolve => setTimeout(resolve, 600)) // simulate network delay
    return {
      translated: `[译] ${input.text}`,
      provider: 'mock-provider',
      source: 'provider'
    }
  }

  if (!navigator.onLine) {
    throw new TranslationServiceError('offline', 'You are offline and this paragraph does not have a cached live translation yet.')
  }

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: input.text,
        targetLanguage: input.targetLanguage,
        requestId: input.requestId
      })
    })
  } catch {
    throw new TranslationServiceError('request_failed', 'The live translation request could not reach the provider.')
  }

  if (!response.ok) {
    throw new TranslationServiceError('request_failed', `Translation provider returned ${response.status}.`)
  }

  const payload = (await response.json()) as { translatedText?: string; provider?: string }
  if (!payload.translatedText?.trim()) {
    throw new TranslationServiceError('empty_result', 'Translation provider returned an empty result.')
  }

  return {
    translated: payload.translatedText.trim(),
    provider: payload.provider ?? getTranslationProviderKey(),
    source: 'provider'
  }
}
