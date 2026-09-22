<template>
  <div>
    <SectionHeading :kicker="t('hospitalDetail.doctors.kicker')">
      <template #title>{{ t('hospitalDetail.doctors.heading') }}</template>
    </SectionHeading>
    <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <Card v-for="doctor in doctors" :key="doctor.id" padding="p-6" class="text-center">
        <Avatar class="mx-auto size-[88px]">
          <AvatarImage
            :src="doctor.profile !== 'No profile' ? doctor.profile : 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'"
          />
          <AvatarFallback>{{ doctor.first_name?.[0] }}{{ doctor.last_name?.[0] }}</AvatarFallback>
        </Avatar>
        <h4 class="mt-4 text-base font-semibold text-ink">{{ doctor.first_name }} {{ doctor.last_name }}</h4>
        <p class="text-sm text-slate-500">{{ doctor.role }}</p>
        <TooltipProvider>
          <div class="mt-4 flex justify-center gap-3">
            <Tooltip>
              <TooltipTrigger as-child>
                <Avatar class="size-[30px]">
                  <AvatarImage src="https://cdn1.iconfinder.com/data/icons/logotypes/32/circle-linkedin-512.png" />
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>LinkedIn</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger as-child>
                <Avatar class="size-[30px]">
                  <AvatarImage src="https://cdn-icons-png.freepik.com/512/6711/6711567.png" />
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>Gmail</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger as-child>
                <Avatar class="size-[30px]">
                  <AvatarImage src="https://banner2.cleanpng.com/20200525/hhx/transparent-instagram-logo-icon-5ecc25c4860dd5.0946990115904373165491.jpg" />
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>Instagram</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SectionHeading from '@/components/ui/section-heading.vue'
import Card from '@/components/ui/card.vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const { t } = useI18n()

defineProps<{ doctors: any[] }>()
</script>
