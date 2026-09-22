<script setup lang="ts">
import WebLayout from '@/components/layouts/web-layout.vue'
import SectionHeading from '@/components/ui/section-heading.vue'
import Card from '@/components/ui/card.vue'
import IconChip from '@/components/ui/icon-chip.vue'
import UiButton from '@/components/ui/button.vue'
import { LifeBuoyIcon, UserIcon } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import missionPhotoLarge from '@/assets/image/phys-patient-split-width-hero-1920x1280.png'
import missionPhotoSmall1 from '@/assets/image/value_image.png'
import missionPhotoSmall2 from '@/assets/image/large-smile-guy-web.jpg'
import { team } from '@/lib/team'

const { t } = useI18n()

const whatWeDo = [
  {
    icon: LifeBuoyIcon,
    title: 'about.whatWeDo.hospital.title',
    body: 'about.whatWeDo.hospital.body'
  },
  {
    icon: UserIcon,
    title: 'about.whatWeDo.customer.title',
    body: 'about.whatWeDo.customer.body'
  }
]

</script>

<template>
  <WebLayout>
    <section class="overflow-hidden rounded-[1.25rem] bg-navy shadow-soft">
      <div
        class="relative flex min-h-[22rem] flex-col justify-center bg-cover bg-center px-6 py-14 sm:px-10 lg:px-12"
        style="background-image: linear-gradient(rgba(21, 43, 58, 0.75), rgba(21, 43, 58, 0.75)), url('https://healthnewshub.org/wp-content/uploads/2019/03/doctors-day.jpg')"
      >
        <p class="font-mono text-xs font-medium uppercase tracking-[0.14em] text-white/70">
          {{ t('about.kicker') }}
        </p>
        <h1 class="mt-2 max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          {{ t('about.heroTitle') }}
        </h1>
        <div class="mt-8">
          <UiButton variant="inverted" :to="{ name: 'contact' }">{{ t('about.contactUs') }}</UiButton>
        </div>
      </div>
    </section>

    <section class="mt-10 grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
      <div class="grid grid-cols-2 gap-4">
        <img
          :src="missionPhotoLarge"
          :alt="t('about.photoAlt1')"
          class="col-span-2 h-56 w-full rounded-3xl object-cover shadow-soft sm:h-72"
        />
        <img
          :src="missionPhotoSmall1"
          :alt="t('about.photoAlt2')"
          class="h-32 w-full rounded-3xl object-cover shadow-soft sm:h-40"
        />
        <img
          :src="missionPhotoSmall2"
          :alt="t('about.photoAlt3')"
          class="h-32 w-full rounded-3xl object-cover shadow-soft sm:h-40"
        />
      </div>
      <div>
        <p class="font-mono text-xs font-medium uppercase tracking-[0.14em] text-accent-dark">
          {{ t('about.mission.kicker') }}
        </p>
        <h3 class="mt-2 text-3xl font-semibold tracking-tight text-ink">
          {{ t('about.mission.title') }}
        </h3>
        <p class="mt-4 text-sm leading-6 text-slate-600">
          {{ t('about.mission.body') }}
        </p>
      </div>
    </section>

    <section class="mt-10">
      <SectionHeading :kicker="t('about.whatWeDo.kicker')">
        <template #title>{{ t('about.whatWeDo.title') }}</template>
      </SectionHeading>
      <div class="mt-6 grid gap-6 sm:grid-cols-2">
        <Card v-for="item in whatWeDo" :key="item.title" padding="p-6">
          <IconChip>
            <component :is="item.icon" class="size-[22px]" />
          </IconChip>
          <h3 class="mt-4 text-xl font-semibold text-ink">{{ t(item.title) }}</h3>
          <p class="mt-2 text-sm leading-6 text-slate-600">{{ t(item.body) }}</p>
        </Card>
      </div>
    </section>

    <section class="mt-10">
      <SectionHeading :kicker="t('about.team.kicker')">
        <template #title>{{ t('about.team.title') }}</template>
        <template #subtitle>{{ t('about.team.subtitle') }}</template>
      </SectionHeading>
      <div class="mt-6 grid gap-6 sm:grid-cols-3 lg:grid-cols-6">
        <Card v-for="member in team" :key="member.name" padding="p-5" class="text-center">
          <img
            :src="member.photo"
            :alt="member.name"
            class="mx-auto h-20 w-20 rounded-full object-cover ring-4 ring-accent-tint"
          />
          <h3 class="mt-4 text-sm font-semibold text-ink">{{ member.name }}</h3>
          <p class="mt-1 text-xs font-medium uppercase tracking-wide text-accent">{{ t('about.team.contributor') }}</p>
        </Card>
      </div>
    </section>

    <section class="mt-10 overflow-hidden rounded-[1.25rem] bg-navy px-6 py-14 text-center shadow-soft sm:px-10">
      <h3 class="mx-auto max-w-2xl text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        {{ t('about.cta') }}
      </h3>
      <div class="mt-6">
        <UiButton variant="inverted" :to="{ name: 'contact' }">{{ t('about.contactUs') }}</UiButton>
      </div>
    </section>
  </WebLayout>
</template>
