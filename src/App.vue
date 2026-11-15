<script setup lang="ts">
import { Layers } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { Button } from '@/components/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/empty'
import { Skeleton } from '@/components/skeleton'
import WeekSection from '@/components/stack/WeekSection.vue'
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

// Newest first; the first week is always the featured one.
const latest = computed(() => weeks.value[0])
const archive = computed(() => weeks.value.slice(1))
const years = computed(() => [...new Set(archive.value.map((w) => w.sunday.slice(0, 4)))])
const pickedYear = ref<string>()
const year = computed(() => pickedYear.value ?? years.value[0])
const archiveForYear = computed(() => archive.value.filter((w) => w.sunday.startsWith(year.value ?? '')))
const totalLinks = computed(() => weeks.value.reduce((n, w) => n + w.links.length, 0))
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:py-12">
    <header class="mb-12 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="mb-2 text-sm font-heading tracking-widest uppercase">Sunday Service presents</p>
        <h1
          class="inline-block -rotate-1 rounded-base border-2 border-border bg-main px-5 py-2 text-5xl text-main-foreground uppercase shadow-shadow sm:text-7xl"
        >
          The Stack
        </h1>
      </div>
      <p v-if="status === 'ready'" class="text-sm">
        {{ totalLinks }} links across {{ weeks.length }} {{ weeks.length === 1 ? 'Sunday' : 'Sundays' }}
      </p>
    </header>

    <main>
      <div v-if="status === 'loading'" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        <Skeleton v-for="n in 6" :key="n" class="h-56" />
      </div>

      <Empty v-else-if="status === 'missing' || !latest" class="border-2 border-border bg-secondary-background shadow-shadow">
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
        <WeekSection :week="latest" :current="latest.sunday === thisSunday" />

        <section v-if="archive.length" class="mt-20" aria-labelledby="archive-heading">
          <div class="mb-10 flex flex-wrap items-center gap-3">
            <h2 id="archive-heading" class="mr-2 text-3xl uppercase">Previously</h2>
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
