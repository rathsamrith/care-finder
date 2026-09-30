<script setup lang="ts">
import { Building2Icon, CheckIcon, ChevronsUpDownIcon, PlusIcon } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { getActiveHospitalId, setActiveHospitalId } from '@/lib/active-hospital'
import { useAuthStore } from '@/stores/auth-store'

// Branch switcher for hospital accounts. Shown only when the account manages at
// least one hospital; with a single one it still offers "Add hospital".
const { t } = useI18n()
const router = useRouter()
const store = useAuthStore()

interface HospitalSummary {
  id: number | string
  name: string
  province?: string | null
}

const hospitals = computed<HospitalSummary[]>(() => store.hospitals ?? [])
const show = computed(() => (store.roles ?? []).includes('hospital') && hospitals.value.length > 0)
const currentId = computed(() => String(store.hospital?.id ?? getActiveHospitalId() ?? hospitals.value[0]?.id ?? ''))
const current = computed(() => hospitals.value.find((h) => String(h.id) === currentId.value) ?? hospitals.value[0])

const choose = (id: number | string) => {
  if (String(id) === currentId.value) return
  setActiveHospitalId(id)
  // Every dashboard store is scoped to the active hospital, so a full reload is
  // the simplest way to drop all cached per-hospital state.
  window.location.reload()
}
</script>

<template>
  <DropdownMenu v-if="show">
    <DropdownMenuTrigger as-child>
      <button
        type="button"
        class="flex w-full items-center gap-2 rounded-lg border border-sidebar-border px-2.5 py-2 text-left text-sm transition hover:bg-sidebar-accent"
        :aria-label="t('dashLayout.branch.label')"
      >
        <Building2Icon class="size-4 shrink-0 text-sidebar-foreground/70" />
        <span class="flex-1 truncate font-medium">{{ current?.name }}</span>
        <ChevronsUpDownIcon class="size-4 shrink-0 text-sidebar-foreground/50" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-64">
      <DropdownMenuLabel>{{ t('dashLayout.branch.label') }}</DropdownMenuLabel>
      <DropdownMenuItem v-for="h in hospitals" :key="h.id" @click="choose(h.id)">
        <CheckIcon :class="String(h.id) === currentId ? 'opacity-100' : 'opacity-0'" />
        <span class="truncate">{{ h.name }}</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem @click="router.push('/hospital/new')">
        <PlusIcon />
        {{ t('dashLayout.branch.add') }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
