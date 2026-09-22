import i18n from '@/i18n'

// Nest returns { message: string | string[], statusCode } on errors (validation
// errors arrive as an array). Show the server's own words when it sent any -
// e.g. "This doctor is already booked at that time" - else the caller's fallback.
export function apiErrorMessage(error: unknown, fallback: string): string {
  // Rate limited: the server text is English-only, so use the localized one.
  if ((error as { response?: { status?: number } })?.response?.status === 429) {
    return i18n.global.t('common.tooManyRequests')
  }
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message
  const text = Array.isArray(message) ? message[0] : message
  return typeof text === 'string' && text.trim() ? text : fallback
}
