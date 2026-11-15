<script setup lang="ts">
import { ChevronLeft, ChevronRight, CopyPlus, Presentation, X } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/select'
import { go, route } from '@/lib/route'
import { markSeen } from '@/lib/seen'
import { formatSunday } from '@/lib/weeks'
import type { StackWeek } from '@/types'

const props = defineProps<{ weeks: StackWeek[]; selected: StackWeek }>()

// Weeks are newest first, so "older" is the next index.
const index = computed(() => props.weeks.indexOf(props.selected))
const older = computed(() => props.weeks[index.value + 1])
const newer = computed(() => props.weeks[index.value - 1])

const byYear = computed(() => {
  const groups = new Map<string, StackWeek[]>()
  for (const week of props.weeks) {
    const year = week.sunday.slice(0, 4)
    groups.set(year, [...(groups.get(year) ?? []), week])
  }
  return [...groups]
})

// Opens every link of the week in its own tab. Browsers only allow one new tab per
// click unless pop-ups are allowed for the site, so count the ones that were refused.
const blocked = ref(0)
function openAll() {
  blocked.value = 0
  for (const link of props.selected.links) {
    const tab = window.open(link.link, '_blank')
    if (tab) {
      tab.opener = null // same protection as rel="noopener" on the cards
      markSeen(link.id)
    } else {
      blocked.value++
    }
  }
}
watch(() => props.selected, () => (blocked.value = 0))
</script>

<template>
  <nav class="flex flex-wrap items-center gap-3" aria-label="Choose a Sunday">
    <Button variant="neutral" :disabled="!older" aria-label="Older Sunday" @click="go(older?.sunday)">
      <ChevronLeft /> <span class="max-sm:hidden">Older</span>
    </Button>

    <Select :model-value="selected.sunday" @update:model-value="(v) => go(String(v))">
      <SelectTrigger class="w-auto min-w-52 shadow-shadow" aria-label="Sunday">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup v-for="[year, group] in byYear" :key="year">
          <SelectLabel>{{ year }}</SelectLabel>
          <SelectItem v-for="week in group" :key="week.sunday" :value="week.sunday">
            {{ formatSunday(week.sunday) }}
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>

    <Button variant="neutral" :disabled="!newer" aria-label="Newer Sunday" @click="go(newer?.sunday)">
      <span class="max-sm:hidden">Newer</span> <ChevronRight />
    </Button>

    <Button v-if="index > 0" variant="neutral" @click="go(undefined)">Latest</Button>

    <Button variant="neutral" class="ml-auto" @click="openAll">
      <CopyPlus /> Open all {{ selected.links.length }}
    </Button>
    <Button @click="go(selected.sunday, !route.present)">
      <template v-if="route.present"><X /> Exit</template>
      <template v-else><Presentation /> Present</template>
    </Button>

    <p v-if="blocked" role="alert" class="w-full rounded-base border-2 border-border bg-accent px-3 py-2 text-sm font-heading text-black">
      Your browser blocked {{ blocked }} of {{ selected.links.length }} tabs. Allow pop-ups for this
      site in the address bar, then press Open all again.
    </p>
  </nav>
</template>
