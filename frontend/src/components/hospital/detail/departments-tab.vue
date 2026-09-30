<template>
  <div>
    <SectionHeading :kicker="t('hospitalDetail.departments.kicker')">
      <template #title>{{ t('hospitalDetail.departments.heading') }}</template>
    </SectionHeading>
    <Card padding="p-2" class="mt-6">
      <div class="max-h-80 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-[180px]">{{ t('hospitalDetail.departments.colId') }}</TableHead>
              <TableHead>{{ t('hospitalDetail.departments.colName') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="dept in department" :key="dept.id">
              <TableCell>{{ dept.id }}</TableCell>
              <TableCell>{{ dept.name }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SectionHeading from '@/components/ui/section-heading.vue'
import Card from '@/components/ui/card.vue'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const { t } = useI18n()

defineProps<{ department: any[] }>()
</script>
