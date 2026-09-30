import { describe, expect, it } from 'vitest'

import { apiErrorMessage } from '../api-error'

const err = (message: unknown) => ({ response: { data: { message } } })

describe('apiErrorMessage', () => {
  it('uses the server message, the first of a validation array, or the fallback', () => {
    expect(apiErrorMessage(err('This doctor is already booked'), 'fallback')).toBe('This doctor is already booked')
    expect(apiErrorMessage(err(['appointmentTime must be HH:mm', 'other']), 'fallback')).toBe('appointmentTime must be HH:mm')
    expect(apiErrorMessage(err(''), 'fallback')).toBe('fallback')
    expect(apiErrorMessage(err(undefined), 'fallback')).toBe('fallback')
    expect(apiErrorMessage(new Error('Network Error'), 'fallback')).toBe('fallback')
    expect(apiErrorMessage(undefined, 'fallback')).toBe('fallback')
  })

  it('rate limits (429) get the localized message, whatever the server said', () => {
    const limited = { response: { status: 429, data: { message: 'ThrottlerException: Too Many Requests' } } }
    expect(apiErrorMessage(limited, 'fallback')).toBe('Too many attempts. Please wait a few minutes and try again.')
  })
})
