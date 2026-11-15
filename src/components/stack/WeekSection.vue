<script setup lang="ts">
import { Badge } from '@/components/badge'
import { formatSunday } from '@/lib/weeks'
import type { StackWeek } from '@/types'
import LinkCard from './LinkCard.vue'

defineProps<{ week: StackWeek; current?: boolean }>()
</script>

<template>
  <section :aria-labelledby="`week-${week.sunday}`">
    <header class="mb-5 flex flex-wrap items-center gap-3 border-b-2 border-border pb-3">
      <span
        v-if="current"
        class="rounded-base border-2 border-border bg-accent px-3 py-1 text-sm font-heading text-black uppercase shadow-shadow"
      >
        This week
      </span>
      <h2 :id="`week-${week.sunday}`" :class="current ? 'text-3xl sm:text-4xl' : 'text-2xl'">
        {{ formatSunday(week.sunday) }}
      </h2>
      <Badge variant="neutral" class="ml-auto">
        {{ week.links.length }} {{ week.links.length === 1 ? 'link' : 'links' }}
      </Badge>
    </header>
    <ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="link in week.links" :key="link.id">
        <LinkCard :link="link" />
      </li>
    </ul>
  </section>
</template>
