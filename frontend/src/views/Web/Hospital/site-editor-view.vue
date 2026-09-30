<script setup lang="ts">
import { ArrowDownIcon, ArrowUpIcon, ExternalLinkIcon, LockIcon } from '@lucide/vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

import DashboardLayout from '@/components/layouts/dashboard-layout.vue'
import { hospitalNavItems } from '@/components/layouts/dashboard-nav'
import {
  FONTS,
  PREMIUM_SECTIONS,
  PREMIUM_TEMPLATES,
  RADII,
  SECTIONS,
  TEMPLATES,
  type PublicSite,
  type SiteSection,
  type SiteTemplate,
  type SiteTheme
} from '@/components/site/catalog'
import SiteRenderer from '@/components/site/site-renderer.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import SectionHeading from '@/components/ui/section-heading.vue'
import { siteUrl } from '@/lib/tenant'
import axiosInstance from '@/plugins/axios'
import { apiErrorMessage } from '@/lib/api-error'
import { useAuthStore } from '@/stores/auth-store'

interface EditorSite {
  hospitalId: number | string
  slug: string | null
  suggestedSlug: string
  logo: string | null
  entitled: boolean
  template: SiteTemplate
  theme: SiteTheme
  sections: SiteSection[]
  heroImage: string | null
  heroTitle: string | null
  heroSubtitle: string | null
  seoTitle: string | null
  seoDescription: string | null
  published: boolean
}

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const hospitalId = computed<number | null>(() => {
  const h = auth.hospital as { id?: number } | string | undefined
  return h && typeof h === 'object' && h.id ? Number(h.id) : null
})

const loading = ref(true)
const saving = ref(false)
const entitled = ref(false)
const content = ref<PublicSite | null>(null)
const slugMessage = ref<{ ok: boolean; text: string } | null>(null)

const draft = reactive({
  slug: '',
  template: 'classic' as SiteTemplate,
  theme: { primary: '#176b5b', accent: '#c98a2b', radius: 'md', font: 'sans' } as SiteTheme,
  sections: [] as SiteSection[],
  logo: null as string | null,
  heroImage: null as string | null,
  heroTitle: '',
  heroSubtitle: '',
  seoTitle: '',
  seoDescription: '',
  published: false
})

// The editor always lists every section type: stored order first, then any
// type the hospital hasn't touched yet (disabled).
const withAllSections = (stored: SiteSection[]): SiteSection[] => {
  const known = new Set(stored.map((s) => s.type))
  return [
    ...stored,
    ...SECTIONS.filter((type) => !known.has(type)).map((type) => ({ type, enabled: false }) as SiteSection)
  ]
}

const apply = (s: EditorSite) => {
  entitled.value = s.entitled
  draft.slug = s.slug ?? s.suggestedSlug
  draft.template = s.template
  draft.theme = { ...s.theme }
  draft.sections = withAllSections(s.sections.map((x) => ({ ...x })))
  draft.logo = s.logo
  draft.heroImage = s.heroImage
  draft.heroTitle = s.heroTitle ?? ''
  draft.heroSubtitle = s.heroSubtitle ?? ''
  draft.seoTitle = s.seoTitle ?? ''
  draft.seoDescription = s.seoDescription ?? ''
  draft.published = s.published
}

onMounted(async () => {
  if (!hospitalId.value) {
    loading.value = false
    return
  }
  try {
    const [editor, preview] = await Promise.all([
      axiosInstance.get<EditorSite>(`/hospitals/${hospitalId.value}/site`),
      axiosInstance.get<PublicSite>(`/hospitals/${hospitalId.value}/site/preview`)
    ])
    apply(editor.data)
    content.value = preview.data
  } catch {
    toast.error(t('siteEditor.loadFailed'))
  } finally {
    loading.value = false
  }
})

// Live preview = the real renderer fed with the unsaved draft over the saved content.
const previewData = computed<PublicSite | null>(() =>
  content.value
    ? {
        ...content.value,
        logo: draft.logo,
        site: {
          template: draft.template,
          theme: draft.theme,
          sections: draft.sections,
          heroImage: draft.heroImage,
          heroTitle: draft.heroTitle || null,
          heroSubtitle: draft.heroSubtitle || null,
          seoTitle: draft.seoTitle || null,
          seoDescription: draft.seoDescription || null
        }
      }
    : null
)

const isPremiumTemplate = (tpl: string) => (PREMIUM_TEMPLATES as readonly string[]).includes(tpl)
const isPremiumSection = (type: string) => (PREMIUM_SECTIONS as readonly string[]).includes(type)
const locked = (premium: boolean) => premium && !entitled.value

const move = (index: number, delta: number) => {
  const target = index + delta
  if (target < 0 || target >= draft.sections.length) return
  const next = [...draft.sections]
  ;[next[index], next[target]] = [next[target], next[index]]
  draft.sections = next
}

const checkSlug = async () => {
  try {
    const { data } = await axiosInstance.get('/sites/slug-available', {
      params: { slug: draft.slug, hospitalId: hospitalId.value }
    })
    draft.slug = data.slug
    slugMessage.value = data.available
      ? { ok: true, text: t('siteEditor.address.available') }
      : { ok: false, text: data.reason }
  } catch {
    slugMessage.value = null
  }
}

const save = async () => {
  saving.value = true
  try {
    const { data } = await axiosInstance.put<EditorSite>(`/hospitals/${hospitalId.value}/site`, {
      slug: draft.slug || undefined,
      template: draft.template,
      theme: draft.theme,
      sections: draft.sections.map(({ type, enabled, title, subtitle }) => ({ type, enabled, title, subtitle })),
      heroTitle: draft.heroTitle,
      heroSubtitle: draft.heroSubtitle,
      seoTitle: draft.seoTitle,
      seoDescription: draft.seoDescription,
      published: draft.published
    })
    apply(data)
    slugMessage.value = null
    toast.success(t('siteEditor.saved'))
  } catch (e) {
    toast.error(apiErrorMessage(e, t('siteEditor.saveFailed')))
  } finally {
    saving.value = false
  }
}

const upload = async (kind: 'logo' | 'hero', event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const body = new FormData()
  body.append('file', file)
  try {
    const path = kind === 'logo' ? 'uploadLogo' : 'site/hero'
    const { data } = await axiosInstance.post(`/hospitals/${hospitalId.value}/${path}`, body)
    if (kind === 'logo') draft.logo = data.logo
    else draft.heroImage = data.heroImage
  } catch (e) {
    toast.error(apiErrorMessage(e, t('siteEditor.branding.uploadFailed')))
  } finally {
    input.value = ''
  }
}

const liveUrl = computed(() => (draft.slug ? siteUrl(draft.slug) : ''))
const fieldClass = 'mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'
const labelClass = 'block text-sm font-medium text-slate-700'
</script>

<template>
  <DashboardLayout :nav-items="hospitalNavItems" :portal-label="t('hospitalDash.portal')">
    <SectionHeading :kicker="t('siteEditor.title')">
      <template #title>{{ t('siteEditor.subtitle') }}</template>
    </SectionHeading>

    <p v-if="loading" class="mt-6 text-sm text-slate-500">{{ t('site.loading') }}</p>

    <p v-else-if="!hospitalId" class="mt-6 text-sm text-slate-600">
      {{ t('siteEditor.noHospital') }}
      <button type="button" class="font-semibold text-accent underline" @click="router.push('/myHospital')">
        {{ t('nav.hospital') }}
      </button>
    </p>

    <div v-else class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div class="space-y-5">
        <Card>
          <CardContent class="space-y-3">
            <h3 class="font-semibold text-ink">{{ t('siteEditor.address.title') }}</h3>
            <p class="text-xs text-slate-500">{{ t('siteEditor.address.help') }}</p>
            <div class="flex gap-2">
              <input
                v-model="draft.slug"
                type="text"
                maxlength="40"
                :placeholder="t('siteEditor.address.placeholder')"
                :class="fieldClass"
                @input="slugMessage = null"
              />
              <Button type="button" variant="outline" @click="checkSlug">{{ t('siteEditor.address.check') }}</Button>
            </div>
            <p v-if="slugMessage" class="text-sm" :class="slugMessage.ok ? 'text-success' : 'text-danger'">
              {{ slugMessage.text }}
            </p>
            <label class="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input v-model="draft.published" type="checkbox" class="size-4" />
              {{ t('siteEditor.publish') }}
            </label>
            <p class="text-xs text-slate-500">{{ t('siteEditor.publishHelp') }}</p>
            <a
              v-if="draft.published && liveUrl"
              :href="liveUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 text-sm font-semibold text-accent underline"
            >
              {{ t('siteEditor.viewSite') }} <ExternalLinkIcon class="size-4" />
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardContent class="space-y-3">
            <h3 class="font-semibold text-ink">{{ t('siteEditor.template.title') }}</h3>
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="tpl in TEMPLATES"
                :key="tpl"
                type="button"
                class="relative rounded-lg border p-3 text-left text-sm font-medium transition"
                :class="[
                  draft.template === tpl ? 'border-accent bg-accent-tint' : 'border-slate-200 hover:border-accent',
                  locked(isPremiumTemplate(tpl)) ? 'cursor-not-allowed opacity-60' : ''
                ]"
                :disabled="locked(isPremiumTemplate(tpl))"
                @click="draft.template = tpl"
              >
                {{ t(`siteEditor.template.${tpl}`) }}
                <span v-if="isPremiumTemplate(tpl)" class="mt-1 flex items-center gap-1 text-xs text-gold">
                  <LockIcon v-if="!entitled" class="size-3" /> {{ t('siteEditor.premium.badge') }}
                </span>
              </button>
            </div>
            <p v-if="!entitled" class="text-xs text-slate-500">
              {{ t('siteEditor.premium.locked') }} —
              <button type="button" class="font-semibold text-accent underline" @click="router.push('/hospital/service')">
                {{ t('siteEditor.premium.upgrade') }}
              </button>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent class="space-y-3">
            <h3 class="font-semibold text-ink">{{ t('siteEditor.theme.title') }}</h3>
            <div class="grid grid-cols-2 gap-3">
              <label :class="labelClass">
                {{ t('siteEditor.theme.primary') }}
                <input v-model="draft.theme.primary" type="color" class="mt-1 block h-10 w-full rounded-lg border border-slate-200" />
              </label>
              <label :class="labelClass">
                {{ t('siteEditor.theme.accent') }}
                <input v-model="draft.theme.accent" type="color" class="mt-1 block h-10 w-full rounded-lg border border-slate-200" />
              </label>
              <label :class="labelClass">
                {{ t('siteEditor.theme.radius') }}
                <select v-model="draft.theme.radius" :class="fieldClass">
                  <option v-for="r in RADII" :key="r" :value="r">{{ t(`siteEditor.theme.radii.${r}`) }}</option>
                </select>
              </label>
              <label :class="labelClass">
                {{ t('siteEditor.theme.font') }}
                <select v-model="draft.theme.font" :class="fieldClass">
                  <option v-for="f in FONTS" :key="f" :value="f">{{ t(`siteEditor.theme.fonts.${f}`) }}</option>
                </select>
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent class="space-y-3">
            <h3 class="font-semibold text-ink">{{ t('siteEditor.branding.title') }}</h3>
            <p class="text-xs text-slate-500">{{ t('siteEditor.branding.imageHelp') }}</p>
            <div class="flex items-center gap-3">
              <img v-if="draft.logo" :src="draft.logo" :alt="t('siteEditor.branding.logo')" class="h-12 w-auto rounded border border-slate-200" />
              <label :class="labelClass">
                {{ t('siteEditor.branding.uploadLogo') }}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="mt-1 block text-sm" @change="upload('logo', $event)" />
              </label>
            </div>
            <div class="flex items-center gap-3">
              <img v-if="draft.heroImage" :src="draft.heroImage" :alt="t('siteEditor.branding.heroImage')" class="h-12 w-20 rounded border border-slate-200 object-cover" />
              <label :class="labelClass">
                {{ t('siteEditor.branding.uploadHero') }}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="mt-1 block text-sm" @change="upload('hero', $event)" />
              </label>
            </div>
            <h3 class="pt-2 font-semibold text-ink">{{ t('siteEditor.hero.title') }}</h3>
            <label :class="labelClass">
              {{ t('siteEditor.hero.headline') }}
              <Input v-model="draft.heroTitle" maxlength="160" class="mt-1" />
            </label>
            <label :class="labelClass">
              {{ t('siteEditor.hero.subheadline') }}
              <Input v-model="draft.heroSubtitle" maxlength="160" class="mt-1" />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardContent class="space-y-3">
            <h3 class="font-semibold text-ink">{{ t('siteEditor.sectionsPanel.title') }}</h3>
            <p class="text-xs text-slate-500">{{ t('siteEditor.sectionsPanel.help') }}</p>
            <ul class="space-y-2">
              <li
                v-for="(s, i) in draft.sections"
                :key="s.type"
                class="rounded-lg border border-slate-200 p-3"
                :class="locked(isPremiumSection(s.type)) ? 'opacity-60' : ''"
              >
                <div class="flex items-center gap-2">
                  <input
                    v-model="s.enabled"
                    type="checkbox"
                    class="size-4"
                    :disabled="locked(isPremiumSection(s.type))"
                  />
                  <span class="flex-1 text-sm font-medium">{{ t(`site.sections.${s.type}`) }}</span>
                  <span v-if="isPremiumSection(s.type)" class="flex items-center gap-1 text-xs text-gold">
                    <LockIcon v-if="!entitled" class="size-3" /> {{ t('siteEditor.premium.badge') }}
                  </span>
                  <template v-if="s.type !== 'hero'">
                    <Button type="button" variant="ghost" size="icon-sm" :aria-label="t('siteEditor.sectionsPanel.moveUp')" @click="move(i, -1)">
                      <ArrowUpIcon />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" :aria-label="t('siteEditor.sectionsPanel.moveDown')" @click="move(i, 1)">
                      <ArrowDownIcon />
                    </Button>
                  </template>
                </div>
                <input
                  v-if="s.type !== 'hero' && s.enabled"
                  v-model="s.title"
                  type="text"
                  maxlength="80"
                  :placeholder="t('siteEditor.sectionsPanel.customTitle')"
                  :class="fieldClass"
                />
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent class="space-y-3">
            <h3 class="font-semibold text-ink">{{ t('siteEditor.seo.title') }}</h3>
            <label :class="labelClass">
              {{ t('siteEditor.seo.seoTitle') }}
              <Input v-model="draft.seoTitle" maxlength="160" class="mt-1" />
            </label>
            <label :class="labelClass">
              {{ t('siteEditor.seo.seoDescription') }}
              <textarea v-model="draft.seoDescription" maxlength="160" rows="3" :class="fieldClass" />
            </label>
          </CardContent>
        </Card>

        <Button type="button" class="w-full justify-center" :disabled="saving" @click="save">
          {{ saving ? t('siteEditor.saving') : t('siteEditor.save') }}
        </Button>
      </div>

      <div class="xl:sticky xl:top-24 xl:self-start">
        <p class="mb-2 text-sm font-semibold text-slate-600">{{ t('siteEditor.previewTitle') }}</p>
        <div class="h-[75vh] overflow-auto rounded-xl border border-slate-200 bg-white shadow-soft">
          <SiteRenderer v-if="previewData" :data="previewData" />
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>
