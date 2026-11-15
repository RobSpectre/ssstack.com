<script setup lang="ts">
import { Layers } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue'
import { Button } from '@/components/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/empty'
import { Skeleton } from '@/components/skeleton'
import WeekNav from '@/components/stack/WeekNav.vue'
import WeekSection from '@/components/stack/WeekSection.vue'
import { go, route } from '@/lib/route'
import { clearSeen, seen } from '@/lib/seen'
import { currentServiceSunday, groupByWeek } from '@/lib/weeks'
import type { StackData, StackWeek } from '@/types'

const weeks = ref<StackWeek[]>([])
const status = ref<'loading' | 'ready' | 'missing'>('loading')
const thisSunday = currentServiceSunday()

onMounted(async () => {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}stack.json`)
    // Vite's dev server answers unknown paths with index.html, so check the type too.
    if (!res.ok || !res.headers.get('content-type')?.includes('json')) throw new Error('no data')
    const data: StackData = await res.json()
    weeks.value = groupByWeek(data.links)
    status.value = 'ready'
  } catch {
    status.value = 'missing'
  }
})

// The week on show: the Sunday in the URL, or the newest one.
const selected = computed(() => weeks.value.find((w) => w.sunday === route.sunday) ?? weeks.value[0])
const selectedIndex = computed(() => weeks.value.indexOf(selected.value!))
const archive = computed(() => weeks.value.filter((w) => w !== selected.value))
const years = computed(() => [...new Set(archive.value.map((w) => w.sunday.slice(0, 4)))])
const pickedYear = ref<string>()
const year = computed(() => pickedYear.value ?? selected.value?.sunday.slice(0, 4) ?? years.value[0])
const archiveForYear = computed(() => archive.value.filter((w) => w.sunday.startsWith(year.value ?? '')))
const totalLinks = computed(() => weeks.value.reduce((n, w) => n + w.links.length, 0))
const seenThisWeek = computed(() => selected.value?.links.filter((l) => seen.has(l.id)) ?? [])

// Picking a Sunday starts you at the top of it, and the archive follows to its year.
watch(
  () => route.sunday,
  () => {
    pickedYear.value = undefined
    window.scrollTo({ top: 0 })
  },
)

// The presentation view scales the whole page from the root font size (see style.css).
watchEffect(() => document.documentElement.classList.toggle('present', route.present))

function onKey(e: KeyboardEvent) {
  if (!route.present || e.metaKey || e.ctrlKey || e.altKey) return
  // Leave arrow keys alone while the Sunday picker (or any control) has focus.
  if (e.target instanceof Element && e.target.closest('[role=listbox], [role=combobox], input')) return
  if (e.key === 'ArrowLeft') go(weeks.value[selectedIndex.value + 1]?.sunday ?? selected.value?.sunday)
  else if (e.key === 'ArrowRight') go(weeks.value[selectedIndex.value - 1]?.sunday ?? selected.value?.sunday)
  else if (e.key === 'Escape') go(selected.value?.sunday, false)
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="mx-auto px-4 py-8" :class="route.present ? 'max-w-none sm:px-8' : 'max-w-6xl sm:py-12'">
    <header class="flex flex-wrap items-end justify-between gap-4" :class="route.present ? 'mb-6' : 'mb-10'">
      <div>
        <p v-if="!route.present" class="mb-2 text-sm font-heading tracking-widest uppercase">
          Sunday Service presents
        </p>
        <h1
          class="inline-block -rotate-1 rounded-base border-2 border-border bg-main text-main-foreground uppercase shadow-shadow"
          :class="route.present ? 'px-3 py-1 text-3xl' : 'px-5 py-2 text-5xl sm:text-7xl'"
        >
          The Stack
        </h1>
      </div>
      <p v-if="status === 'ready' && !route.present" class="text-sm">
        {{ totalLinks }} links across {{ weeks.length }} {{ weeks.length === 1 ? 'Sunday' : 'Sundays' }}
      </p>
      <p v-else-if="route.present && selected" class="flex items-center gap-3 text-sm">
        {{ seenThisWeek.length }} of {{ selected.links.length }} opened
        <Button v-if="seenThisWeek.length" size="sm" variant="neutral" @click="clearSeen(seenThisWeek.map((l) => l.id))">
          Reset
        </Button>
      </p>
    </header>

    <main>
      <div v-if="status === 'loading'" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        <Skeleton v-for="n in 6" :key="n" class="h-56" />
      </div>

      <Empty v-else-if="status === 'missing' || !selected" class="border-2 border-border bg-secondary-background shadow-shadow">
        <EmptyHeader>
          <EmptyMedia variant="icon"><Layers /></EmptyMedia>
          <EmptyTitle>The stack is empty</EmptyTitle>
          <EmptyDescription>
            No links have been synced yet. Run <code class="font-heading">npm run sync</code> to pull
            them from Raindrop.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>

      <template v-else>
        <WeekNav :weeks="weeks" :selected="selected" class="mb-8" />
        <WeekSection :week="selected" featured :current="selected.sunday === thisSunday" :present="route.present" />

        <section v-if="archive.length && !route.present" class="mt-20" aria-labelledby="archive-heading">
          <div class="mb-10 flex flex-wrap items-center gap-3">
            <h2 id="archive-heading" class="mr-2 text-3xl uppercase">More Sundays</h2>
            <Button
              v-for="y in years"
              :key="y"
              size="sm"
              :variant="y === year ? 'default' : 'neutral'"
              :aria-pressed="y === year"
              @click="pickedYear = y"
            >
              {{ y }}
            </Button>
          </div>
          <div class="space-y-14">
            <WeekSection v-for="week in archiveForYear" :key="week.sunday" :week="week" />
          </div>
        </section>
      </template>
    </main>
  </div>
</template>
