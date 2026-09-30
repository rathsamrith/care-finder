<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SearchIcon, UserIcon, XIcon } from '@lucide/vue'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import { hospitalAppointmentListStore } from '@/stores/hospital-appointment-list'
import { toast } from 'vue-sonner'
import { apiErrorMessage } from '@/lib/api-error'

type Patient = { id: string | number; first_name?: string; last_name?: string; name?: string; phone?: string }

const props = defineProps<{
  open: boolean
  prefillDate?: string
  prefillTime?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  created: []
}>()

const { t } = useI18n()
const store = hospitalAppointmentListStore()

const title = ref('')
const date = ref('')
const time = ref('')
const endTime = ref('')
const submitting = ref(false)

const patientQuery = ref('')
const patientResults = ref<Patient[]>([])
const selectedPatient = ref<Patient | null>(null)
const searching = ref(false)
let searchToken = 0

const patientLabel = (p: Patient) => p.name || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()

const resetForm = () => {
  title.value = ''
  date.value = props.prefillDate ?? ''
  time.value = props.prefillTime ?? ''
  endTime.value = ''
  patientQuery.value = ''
  patientResults.value = []
  selectedPatient.value = null
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) resetForm()
  }
)

watch(patientQuery, (q) => {
  if (selectedPatient.value) return // typing again after picking someone clears the pick below
  const token = ++searchToken
  if (q.trim().length < 2) {
    patientResults.value = []
    return
  }
  searching.value = true
  setTimeout(async () => {
    if (token !== searchToken) return
    try {
      patientResults.value = await store.searchPatients(q)
    } catch (error) {
      console.error(error)
    } finally {
      if (token === searchToken) searching.value = false
    }
  }, 300)
})

const pickPatient = (patient: Patient) => {
  selectedPatient.value = patient
  patientQuery.value = patientLabel(patient)
  patientResults.value = []
}

const clearPatient = () => {
  selectedPatient.value = null
  patientQuery.value = ''
}

const close = () => emit('update:open', false)

const submit = async () => {
  if (!selectedPatient.value) return toast.error(t('appointment.newDialog.selectPatientFirst'))
  if (!title.value.trim()) return toast.error(t('appointment.newDialog.titleRequired'))
  if (!date.value) return toast.error(t('appointment.newDialog.pickDate'))
  if (!time.value) return toast.error(t('appointment.newDialog.pickTime'))

  submitting.value = true
  try {
    await store.createAppointment({
      title: title.value.trim(),
      userId: String(selectedPatient.value.id),
      appointmentDate: date.value,
      appointmentTime: time.value,
      appointmentEnd: endTime.value || undefined
    })
    toast.success(t('appointment.newDialog.created'))
    emit('created')
    close()
  } catch (error) {
    console.error(error)
    toast.error(apiErrorMessage(error, t('appointment.newDialog.createFailed')))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(value) => emit('update:open', value)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ t('appointment.newDialog.title') }}</DialogTitle>
      </DialogHeader>

      <div class="space-y-4">
        <div class="space-y-2">
          <Label>{{ t('appointment.newDialog.patient') }}</Label>
          <div class="relative">
            <div class="relative">
              <SearchIcon class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                v-model="patientQuery"
                :placeholder="t('appointment.newDialog.searchPatient')"
                class="pl-8"
                :class="{ 'pr-8': selectedPatient }"
                @input="selectedPatient = null"
              />
              <button
                v-if="selectedPatient"
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                @click="clearPatient"
              >
                <XIcon class="size-4" />
              </button>
            </div>
            <div
              v-if="!selectedPatient && (patientResults.length || searching)"
              class="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover p-1 text-sm shadow-md"
            >
              <p v-if="searching" class="px-2 py-1.5 text-muted-foreground">{{ t('appointment.newDialog.searching') }}</p>
              <button
                v-for="patient in patientResults"
                :key="patient.id"
                type="button"
                class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent-tint"
                @mousedown.prevent="pickPatient(patient)"
              >
                <UserIcon class="size-4 text-muted-foreground" />
                <span class="text-foreground">{{ patientLabel(patient) }}</span>
                <span v-if="patient.phone" class="ml-auto text-xs text-muted-foreground">{{ patient.phone }}</span>
              </button>
              <p v-if="!searching && !patientResults.length" class="px-2 py-1.5 text-muted-foreground">{{ t('appointment.newDialog.noPatients') }}</p>
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <Label>{{ t('appointment.newDialog.appointmentTitle') }}</Label>
          <Input v-model="title" :placeholder="t('appointment.newDialog.titlePlaceholder')" />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label>{{ t('appointment.newDialog.date') }}</Label>
            <DatePicker v-model="date" />
          </div>
          <div class="space-y-2">
            <Label>{{ t('appointment.newDialog.time') }}</Label>
            <Input v-model="time" type="time" />
          </div>
        </div>

        <div class="space-y-2">
          <Label>{{ t('appointment.newDialog.endTime') }}</Label>
          <Input v-model="endTime" type="time" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="close">{{ t('appointment.newDialog.cancel') }}</Button>
        <Button :disabled="submitting" @click="submit">{{ submitting ? t('appointment.newDialog.creating') : t('appointment.newDialog.create') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
