<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import ScheduleEditor from '@/components/doctor/schedule-editor.vue'
import DashboardLayout from '@/components/layouts/dashboard-layout.vue'
import { doctorNavItems } from '@/components/layouts/dashboard-nav'
import { Card, CardContent } from '@/components/ui/card'
import SectionHeading from '@/components/ui/section-heading.vue'
import { useAuthStore } from '@/stores/auth-store'

// A doctor sets their own weekly hours; patients can then only book inside them.
const { t } = useI18n()
const auth = useAuthStore()
const doctorId = computed(() => auth.user?.doctor?.id as number | string | undefined)
</script>

<template>
  <DashboardLayout :nav-items="doctorNavItems" :portal-label="t('doctorDash.portal')">
    <SectionHeading :kicker="t('schedule.kicker')">
      <template #title>{{ t('schedule.title') }}</template>
    </SectionHeading>
    <p class="mt-2 max-w-2xl text-sm text-slate-600">{{ t('schedule.subtitle') }}</p>

    <Card class="mt-6 max-w-2xl">
      <CardContent>
        <ScheduleEditor v-if="doctorId" :doctor-id="doctorId" />
        <p v-else class="text-sm text-slate-600">{{ t('schedule.noDoctorProfile') }}</p>
      </CardContent>
    </Card>
  </DashboardLayout>
</template>
