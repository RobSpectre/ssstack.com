<script setup lang="ts">
import { ChevronLeft, ChevronRight, CopyPlus, Presentation, X } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/select'
import { outboundUrl } from '@/lib/links'
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

// Opens every link of the week in its own tab. Browsers allow only one new tab per
// click until pop-ups are allowed for the site, and that one tab steals focus, hiding
// any warning here. So it is all or nothing: if any tab is refused, close the ones
// that did open and stay on this page with instructions.
const blocked = ref(0)
function openAll() {
  const links = props.selected.links
  const tabs = links.map((link) => window.open(outboundUrl(link), '_blank'))
  blocked.value = tabs.filter((tab) => !tab).length
  if (blocked.value) {
    for (const tab of tabs) tab?.close()
    return
  }
  tabs.forEach((tab, i) => {
    tab!.opener = null // same protection as rel="noopener" on the cards
    markSeen(links[i]!.id)
  })
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

    <div v-if="blocked" role="alert" class="w-full rounded-base border-2 border-border bg-accent px-4 py-3 text-black shadow-shadow">
      <p class="font-heading">Your browser blocked the tabs, so none were opened.</p>
      <p class="text-sm">
        Browsers allow one new tab per click until you allow pop-ups for this site. Click the
        blocked pop-up icon at the right end of the address bar, choose to always allow pop-ups
        from this site, then press Open all again.
      </p>
    </div>
  </nav>
</template>
