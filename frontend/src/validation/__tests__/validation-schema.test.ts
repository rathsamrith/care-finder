import { describe, expect, it } from 'vitest'

import {
  EMAIL_MAX,
  NAME_MAX,
  PASSWORD_MAX,
  PASSWORD_MIN,
  PHONE_PATTERN,
  loginSchema,
  signupSchema
} from '../validation-schema'

// The same cases as backend/src/core/auth/dto/auth-dto.spec.ts: if one side
// changes and the other does not, a test here or there fails.
describe('limits match the backend', () => {
  it('uses the same numbers', () => {
    expect([NAME_MAX, EMAIL_MAX, PASSWORD_MIN, PASSWORD_MAX]).toEqual([50, 254, 8, 72])
  })

  it.each(['012 345 678', '+855 12 345 678', '(023) 123-456', '0123456', '+85512345678'])('phone accepts %s', (p) =>
    expect(PHONE_PATTERN.test(p)).toBe(true)
  )
  it.each(['', 'abc', '12345', '+', '012-', '1'.repeat(16), '012 345 678 x', '<script>', '--1234567--'])(
    'phone rejects "%s"',
    (p) => expect(PHONE_PATTERN.test(p)).toBe(false)
  )
})

const validSignup = {
  firstName: 'Dara',
  lastName: 'Sok',
  email: 'dara@example.com',
  phone: '',
  password: 'longenough1',
  confirmPassword: 'longenough1',
  role: 'user'
}
const errorsFor = async (schema: typeof signupSchema | typeof loginSchema, values: object) => {
  try {
    await schema.validate(values, { abortEarly: false })
    return []
  } catch (e) {
    // a field can fail several rules at once; what matters is which fields fail
    return [...new Set((e as { inner: { path: string }[] }).inner.map((i) => i.path))].sort()
  }
}

describe('signupSchema', () => {
  it('accepts a valid sign-up, with the phone left empty or filled', async () => {
    expect(await errorsFor(signupSchema, validSignup)).toEqual([])
    expect(await errorsFor(signupSchema, { ...validSignup, phone: '012 345 678' })).toEqual([])
  })

  it('requires the six mandatory fields but not the phone', async () => {
    const empty = { firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '', role: '' }
    expect(await errorsFor(signupSchema, empty)).toEqual(['confirmPassword', 'email', 'firstName', 'lastName', 'password', 'role'])
  })

  it('treats whitespace-only names as empty, and caps lengths', async () => {
    expect(await errorsFor(signupSchema, { ...validSignup, firstName: '   ' })).toEqual(['firstName'])
    expect(await errorsFor(signupSchema, { ...validSignup, lastName: 'x'.repeat(51) })).toEqual(['lastName'])
    expect(await errorsFor(signupSchema, { ...validSignup, email: `${'a'.repeat(250)}@b.co` })).toEqual(['email'])
  })

  it('password 8-72 characters, and the confirmation has to match', async () => {
    expect(await errorsFor(signupSchema, { ...validSignup, password: 'short', confirmPassword: 'short' })).toEqual(['password'])
    expect(await errorsFor(signupSchema, { ...validSignup, password: 'x'.repeat(73), confirmPassword: 'x'.repeat(73) })).toEqual(['password'])
    expect(await errorsFor(signupSchema, { ...validSignup, password: 'x'.repeat(72), confirmPassword: 'x'.repeat(72) })).toEqual([])
    expect(await errorsFor(signupSchema, { ...validSignup, confirmPassword: 'different123' })).toEqual(['confirmPassword'])
  })

  it('only the two real roles are allowed', async () => {
    expect(await errorsFor(signupSchema, { ...validSignup, role: 'hospital' })).toEqual([])
    expect(await errorsFor(signupSchema, { ...validSignup, role: 'admin' })).toEqual(['role'])
  })
})

describe('loginSchema', () => {
  it('needs an email and a password, but no minimum length', async () => {
    expect(await errorsFor(loginSchema, { email: 'a@b.co', password: 'abc' })).toEqual([])
    expect(await errorsFor(loginSchema, { email: '', password: '' })).toEqual(['email', 'password'])
    expect(await errorsFor(loginSchema, { email: 'nope', password: 'x' })).toEqual(['email'])
  })

  it('ignores surrounding spaces in the email', async () => {
    expect(await errorsFor(loginSchema, { email: '  a@b.co ', password: 'x' })).toEqual([])
  })
})
