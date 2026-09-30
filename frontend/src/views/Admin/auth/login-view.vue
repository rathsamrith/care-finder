<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import WebLayout from '@/components/layouts/web-layout.vue'
import Card from '@/components/ui/card.vue'
import UiButton from '@/components/ui/button.vue'
import FormField from '@/components/ui/form-field.vue'
import { LockIcon, UserCircleIcon } from '@lucide/vue'
import { Avatar, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import axiosInstance from '@/plugins/axios'
import { apiErrorMessage } from '@/lib/api-error'
import { loginSchema, signupSchema } from '@/validation/validation-schema'
import linkedinLogo from '@/assets/image/linkeding.png'
import facebookLogo from '@/assets/image/fb_logo.jpg'
import xLogo from '@/assets/image/x-logo.webp'
import googleLogo from '@/assets/image/google.png'

const { t, locale } = useI18n()
const router = useRouter()
const mode = ref<'signin' | 'signup'>('signin')

// Validate a field when the user leaves it; once it shows an error, re-check on
// every keystroke so the message disappears the moment it is fixed. (No
// validate-on-change: browsers fire it on blur anyway, and it would nag mid-typing
// for anything that dispatches it early.)
const eager = (state: { errors: string[] }) => ({
  validateOnBlur: true,
  validateOnChange: false,
  validateOnInput: false,
  validateOnModelUpdate: state.errors.length > 0
})

// ---- sign in ---------------------------------------------------------------
const login = useForm({ validationSchema: toTypedSchema(loginSchema), initialValues: { email: '', password: '' } })
const [loginEmail, loginEmailAttrs] = login.defineField('email', eager)
const [loginPassword, loginPasswordAttrs] = login.defineField('password', eager)
const loginError = ref('')

// ---- sign up ---------------------------------------------------------------
// Field names match the API's RegisterDto (camelCase, `role`). The backend builds
// the display name itself and never sees the confirmation.
const signup = useForm({
  validationSchema: toTypedSchema(signupSchema),
  initialValues: { firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '', role: '' }
})
const [firstName, firstNameAttrs] = signup.defineField('firstName', eager)
const [lastName, lastNameAttrs] = signup.defineField('lastName', eager)
const [signupEmail, signupEmailAttrs] = signup.defineField('email', eager)
const [phone, phoneAttrs] = signup.defineField('phone', eager)
const [password, passwordAttrs] = signup.defineField('password', eager)
const [confirmPassword, confirmPasswordAttrs] = signup.defineField('confirmPassword', eager)
const [role, roleAttrs] = signup.defineField('role', eager)
const signupError = ref('')

// Typing again clears a stale server message ("wrong password" etc.).
watch([loginEmail, loginPassword], () => (loginError.value = ''))
watch([firstName, lastName, signupEmail, phone, password, confirmPassword, role], () => (signupError.value = ''))

// Messages are looked up at validation time; redo them when the language changes.
watch(locale, () => {
  if (Object.keys(login.errors.value).length) void login.validate()
  if (Object.keys(signup.errors.value).length) void signup.validate()
})

// After a failed submit, put the cursor on the first field (in page order) that
// needs fixing.
const focusFirstInvalid = async () => {
  await nextTick()
  document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus()
}

const socials = [
  { name: 'LinkedIn', img: linkedinLogo },
  { name: 'Facebook', img: facebookLogo },
  { name: 'X', img: xLogo },
  { name: 'Google', img: googleLogo }
]

const inputClass = (invalid: boolean, extra = '') =>
  [
    'mt-1 w-full rounded-xl border bg-white text-sm text-slate-700 outline-none transition',
    invalid ? 'border-danger focus:border-danger' : 'border-slate-200 focus:border-accent',
    extra || 'px-4 py-3'
  ].join(' ')

const onLogin = login.handleSubmit(async (values) => {
  loginError.value = ''
  try {
    const { data } = await axiosInstance.post('/login', values)
    localStorage.setItem('access_token', data.accessToken)
    const { data: me } = await axiosInstance.get('/me')
    const roles: string[] = me.roles ?? []
    if (roles.includes('hospital')) {
      await router.push('/hospital/dashboard')
    } else if (roles.includes('admin')) {
      await router.push('/admin/dashboard')
    } else if (roles.includes('doctor')) {
      await router.push('/doctor/dashboard')
    } else {
      await router.push('/')
    }
  } catch (error) {
    // Stay on the page and say why (wrong password, too many attempts...).
    loginError.value = apiErrorMessage(error, t('auth.login.invalid'))
  }
}, focusFirstInvalid)

const onSignup = signup.handleSubmit(async (values) => {
  signupError.value = ''
  try {
    const { data } = await axiosInstance.post('/register', {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone || undefined,
      password: values.password,
      role: values.role
    })
    localStorage.setItem('access_token', data.accessToken)
    await router.push(values.role === 'hospital' ? '/hospital/dashboard' : '/')
  } catch (error) {
    signupError.value = apiErrorMessage(error, t('auth.login.registerFailed'))
  }
}, focusFirstInvalid)

// handleSubmit allows overlapping submits; one request at a time is enough.
const submitLogin = () => {
  if (!login.isSubmitting.value) void onLogin()
}
const submitSignup = () => {
  if (!signup.isSubmitting.value) void onSignup()
}
</script>
<template>
  <WebLayout>
    <div class="mx-auto max-w-5xl py-10">
      <Card padding="p-0" class="overflow-hidden lg:grid lg:grid-cols-[0.85fr_1.15fr]">
        <div class="hidden flex-col justify-center bg-navy px-10 py-14 text-white lg:flex">
          <p class="font-mono text-xs font-medium uppercase tracking-[0.14em] text-white/70">Care Finder</p>
          <h3 class="mt-2 text-3xl font-semibold tracking-tight">
            {{ mode === 'signin' ? t('auth.login.welcomeBack') : t('auth.login.join') }}
          </h3>
          <p class="mt-4 text-sm leading-6 text-white/80">
            {{ mode === 'signin' ? t('auth.login.signinIntro') : t('auth.login.signupIntro') }}
          </p>
          <UiButton
            variant="inverted"
            class="mt-8 w-fit"
            @click="mode = mode === 'signin' ? 'signup' : 'signin'"
          >
            {{ mode === 'signin' ? t('auth.login.createAccount') : t('auth.login.signinInstead') }}
          </UiButton>
        </div>

        <div class="px-6 py-10 sm:px-10 lg:py-14">
          <!-- Sign in form -->
          <form v-if="mode === 'signin'" class="mx-auto max-w-sm" novalidate @submit.prevent="submitLogin">
            <h2 class="text-2xl font-semibold tracking-tight text-ink">{{ t('auth.login.signin') }}</h2>
            <div class="mt-6 space-y-4">
              <FormField id="login-email" :label="t('auth.email')" :error="login.errors.value.email" v-slot="{ id, describedby, invalid }">
                <div class="relative">
                  <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 pt-1 text-slate-400">
                    <UserCircleIcon class="size-4" />
                  </span>
                  <input
                    :id="id"
                    v-model="loginEmail"
                    v-bind="loginEmailAttrs"
                    type="email"
                    autocomplete="email"
                    inputmode="email"
                    :aria-invalid="invalid"
                    :aria-describedby="describedby"
                    aria-required="true"
                    :class="inputClass(invalid, 'py-3 pl-10 pr-4')"
                  />
                </div>
              </FormField>
              <FormField id="login-password" :label="t('auth.password')" :error="login.errors.value.password" v-slot="{ id, describedby, invalid }">
                <div class="relative">
                  <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 pt-1 text-slate-400">
                    <LockIcon class="size-4" />
                  </span>
                  <input
                    :id="id"
                    v-model="loginPassword"
                    v-bind="loginPasswordAttrs"
                    type="password"
                    autocomplete="current-password"
                    :aria-invalid="invalid"
                    :aria-describedby="describedby"
                    aria-required="true"
                    :class="inputClass(invalid, 'py-3 pl-10 pr-4')"
                  />
                </div>
              </FormField>
            </div>
            <p class="mt-3 text-right text-sm">
              <router-link to="/forgot-password" class="text-accent hover:text-accent-dark">{{ t('auth.forgot.title') }}</router-link>
            </p>

            <p v-if="loginError" role="alert" class="mt-4 rounded-lg bg-danger-light p-3 text-sm text-danger">{{ loginError }}</p>

            <p class="mt-6 text-center text-xs uppercase tracking-[0.08em] text-slate-400">{{ t('auth.login.orSigninWith') }}</p>
            <div class="mt-4 flex justify-center gap-3">
              <TooltipProvider v-for="social in socials" :key="social.name">
                <Tooltip>
                  <TooltipTrigger as-child>
                    <Avatar class="size-9">
                      <AvatarImage :src="social.img" />
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>{{ social.name }}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <UiButton type="submit" variant="primary" class="mt-8 w-full justify-center" :disabled="login.isSubmitting.value">
              {{ login.isSubmitting.value ? t('auth.login.signingIn') : t('auth.login.logIn') }}
            </UiButton>

            <p class="mt-6 text-center text-sm text-slate-600 lg:hidden">
              {{ t('auth.noAccount') }}
              <button type="button" class="font-semibold text-accent hover:text-accent-dark" @click="mode = 'signup'">{{ t('auth.login.signupLink') }}</button>
            </p>
          </form>

          <!-- Sign up form -->
          <form v-else class="mx-auto max-w-sm" novalidate @submit.prevent="submitSignup">
            <h2 class="text-2xl font-semibold tracking-tight text-ink">{{ t('auth.login.signup') }}</h2>
            <div class="mt-6 space-y-4">
              <div class="grid grid-cols-2 gap-3">
                <FormField id="signup-firstName" :label="t('auth.firstName')" :error="signup.errors.value.firstName" v-slot="{ id, describedby, invalid }">
                  <input
                    :id="id"
                    v-model="firstName"
                    v-bind="firstNameAttrs"
                    type="text"
                    autocomplete="given-name"
                    :aria-invalid="invalid"
                    :aria-describedby="describedby"
                    aria-required="true"
                    :class="inputClass(invalid)"
                  />
                </FormField>
                <FormField id="signup-lastName" :label="t('auth.lastName')" :error="signup.errors.value.lastName" v-slot="{ id, describedby, invalid }">
                  <input
                    :id="id"
                    v-model="lastName"
                    v-bind="lastNameAttrs"
                    type="text"
                    autocomplete="family-name"
                    :aria-invalid="invalid"
                    :aria-describedby="describedby"
                    aria-required="true"
                    :class="inputClass(invalid)"
                  />
                </FormField>
              </div>
              <FormField id="signup-email" :label="t('auth.email')" :error="signup.errors.value.email" v-slot="{ id, describedby, invalid }">
                <input
                  :id="id"
                  v-model="signupEmail"
                  v-bind="signupEmailAttrs"
                  type="email"
                  autocomplete="email"
                  inputmode="email"
                  :aria-invalid="invalid"
                  :aria-describedby="describedby"
                  aria-required="true"
                  :class="inputClass(invalid)"
                />
              </FormField>
              <FormField
                id="signup-phone"
                :label="`${t('profile.phone')} (${t('common.optional')})`"
                :error="signup.errors.value.phone"
                v-slot="{ id, describedby, invalid }"
              >
                <input
                  :id="id"
                  v-model="phone"
                  v-bind="phoneAttrs"
                  type="tel"
                  autocomplete="tel"
                  inputmode="tel"
                  :aria-invalid="invalid"
                  :aria-describedby="describedby"
                  :class="inputClass(invalid)"
                />
              </FormField>
              <div class="grid grid-cols-2 gap-3">
                <FormField
                  id="signup-password"
                  :label="t('auth.password')"
                  :error="signup.errors.value.password"
                  :hint="t('auth.passwordHint')"
                  v-slot="{ id, describedby, invalid }"
                >
                  <input
                    :id="id"
                    v-model="password"
                    v-bind="passwordAttrs"
                    type="password"
                    autocomplete="new-password"
                    :aria-invalid="invalid"
                    :aria-describedby="describedby"
                    aria-required="true"
                    :class="inputClass(invalid)"
                  />
                </FormField>
                <FormField
                  id="signup-confirmPassword"
                  :label="t('auth.confirmPassword')"
                  :error="signup.errors.value.confirmPassword"
                  v-slot="{ id, describedby, invalid }"
                >
                  <input
                    :id="id"
                    v-model="confirmPassword"
                    v-bind="confirmPasswordAttrs"
                    type="password"
                    autocomplete="new-password"
                    :aria-invalid="invalid"
                    :aria-describedby="describedby"
                    aria-required="true"
                    :class="inputClass(invalid)"
                  />
                </FormField>
              </div>
              <FormField id="signup-role" :label="t('auth.login.whoAreYou')" :error="signup.errors.value.role" v-slot="{ id, describedby, invalid }">
                <select
                  :id="id"
                  v-model="role"
                  v-bind="roleAttrs"
                  :aria-invalid="invalid"
                  :aria-describedby="describedby"
                  aria-required="true"
                  :class="inputClass(invalid)"
                >
                  <option value="" disabled>{{ t('auth.login.whoAreYou') }}</option>
                  <option value="user">{{ t('auth.login.normalUser') }}</option>
                  <option value="hospital">{{ t('auth.login.hospitalOwner') }}</option>
                </select>
              </FormField>
            </div>

            <p v-if="signupError" role="alert" class="mt-4 rounded-lg bg-danger-light p-3 text-sm text-danger">{{ signupError }}</p>

            <p class="mt-6 text-center text-xs uppercase tracking-[0.08em] text-slate-400">{{ t('auth.login.orSignupWith') }}</p>
            <div class="mt-4 flex justify-center gap-3">
              <TooltipProvider v-for="social in socials" :key="social.name">
                <Tooltip>
                  <TooltipTrigger as-child>
                    <Avatar class="size-9">
                      <AvatarImage :src="social.img" />
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>{{ social.name }}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <UiButton type="submit" variant="primary" class="mt-8 w-full justify-center" :disabled="signup.isSubmitting.value">
              {{ signup.isSubmitting.value ? t('auth.login.creating') : t('auth.login.signup') }}
            </UiButton>

            <p class="mt-6 text-center text-sm text-slate-600 lg:hidden">
              {{ t('auth.login.haveAccount') }}
              <button type="button" class="font-semibold text-accent hover:text-accent-dark" @click="mode = 'signin'">{{ t('auth.login.signin') }}</button>
            </p>
          </form>
        </div>
      </Card>
    </div>
  </WebLayout>
</template>
