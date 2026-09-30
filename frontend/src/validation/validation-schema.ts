//==================
// Form validation (yup), used through vee-validate's useForm().
//
// These mirror the backend DTO rules (backend/src/common/validation.ts +
// core/auth/dto/*): the server stays the authority, these just put the problem
// next to the field. Messages are functions so they are looked up when the
// validation runs and follow the language switcher.
//==================
import * as yup from 'yup'

import i18n from '@/i18n'

export const NAME_MAX = 50
export const EMAIL_MAX = 254
export const PASSWORD_MIN = 8
// bcrypt ignores everything past 72 bytes, so longer passwords are refused.
export const PASSWORD_MAX = 72

// 7-15 digits, optional leading +, spaces, dashes and parentheses.
export const PHONE_PATTERN = /^(?=(?:\D*\d){7,15}\D*$)\+?[0-9(][0-9 ()-]*[0-9]$/

const msg = (key: string, params: Record<string, unknown> = {}) => () => i18n.global.t(key, params)

const email = yup
  .string()
  .trim()
  .required(msg('validation.emailRequired'))
  .max(EMAIL_MAX, msg('validation.emailInvalid'))
  .email(msg('validation.emailInvalid'))

const personName = (required: string) =>
  yup.string().trim().required(msg(required)).max(NAME_MAX, msg('validation.nameTooLong', { max: NAME_MAX }))

// Sign in: only "is there something to send". No length rule on purpose -
// existing accounts may have shorter passwords than new ones need.
export const loginSchema = yup.object({
  email,
  password: yup.string().required(msg('validation.passwordRequired'))
})

export const signupSchema = yup.object({
  firstName: personName('validation.firstNameRequired'),
  lastName: personName('validation.lastNameRequired'),
  email,
  phone: yup
    .string()
    .trim()
    .test('phone', msg('validation.phoneInvalid'), (value) => !value || PHONE_PATTERN.test(value)),
  password: yup
    .string()
    .required(msg('validation.passwordInput'))
    .min(PASSWORD_MIN, msg('validation.passwordMin', { min: PASSWORD_MIN }))
    .max(PASSWORD_MAX, msg('validation.passwordMax', { max: PASSWORD_MAX })),
  confirmPassword: yup
    .string()
    .required(msg('validation.passwordConfirmRequired'))
    .oneOf([yup.ref('password')], msg('validation.passwordMismatch')),
  role: yup.string().required(msg('validation.roleRequired')).oneOf(['user', 'hospital'], msg('validation.roleRequired'))
})

export type LoginValues = yup.InferType<typeof loginSchema>
export type SignupValues = yup.InferType<typeof signupSchema>
