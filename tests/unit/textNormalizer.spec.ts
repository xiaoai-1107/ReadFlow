import { describe, it, expect } from 'vitest'
import { splitSentences, standardizeText } from '../../src/utils/textNormalizer'

describe('textNormalizer', () => {
  it('should standardize text', () => {
    expect(standardizeText('Hello   world.\nHow are you?')).toBe('Hello world. How are you?')
  })

  it('should split sentences properly', () => {
    const text = 'This is sentence one. And this is two! What about three?'
    const sentences = splitSentences('p1', text)
    expect(sentences.length).toBe(3)
    expect(sentences[0].text).toBe('This is sentence one.')
    expect(sentences[1].text).toBe('And this is two!')
    expect(sentences[2].text).toBe('What about three?')
    expect(sentences[0].id).toBe('p1-s0')
    expect(sentences[1].id).toBe('p1-s1')
  })
})