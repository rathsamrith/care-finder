<script setup lang="ts">
import { ArrowLeftIcon } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

import DashboardLayout from '@/components/layouts/dashboard-layout.vue'
import { hospitalNavItems } from '@/components/layouts/dashboard-nav'
import NoHospitalSet from '@/components/hospitals/no-hospital-set.vue'
import SectionHeading from '@/components/ui/section-heading.vue'

// Adds another hospital to the account's organization. Reuses the first-time
// setup form; it selects the new hospital and lands on its page when done.
const { t } = useI18n()
</script>

<template>
  <DashboardLayout :nav-items="hospitalNavItems" :portal-label="t('hospitalDash.portal')">
    <RouterLink to="/myHospital" class="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-accent">
      <ArrowLeftIcon class="size-4" /> {{ t('hospitalDash.newHospital.back') }}
    </RouterLink>
    <SectionHeading :kicker="t('hospitalDash.newHospital.kicker')">
      <template #title>{{ t('hospitalDash.newHospital.title') }}</template>
    </SectionHeading>
    <NoHospitalSet />
  </DashboardLayout>
</template>
