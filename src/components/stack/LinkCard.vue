<script setup lang="ts">
import { ArrowUpRight, Check } from 'lucide-vue-next'
import { ref } from 'vue'
import { Badge } from '@/components/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/card'
import { outboundUrl } from '@/lib/links'
import { markSeen, seen } from '@/lib/seen'
import type { StackLink } from '@/types'

defineProps<{
  link: StackLink
  /** Position in the week, shown in the presentation view so people can call out "number 7". */
  number?: number
}>()

// Covers are hot-linked from other sites, so some will 404 over the years.
const coverBroken = ref(false)
</script>

<template>
  <a
    :href="outboundUrl(link)"
    target="_blank"
    rel="noopener noreferrer"
    class="group block h-full rounded-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    @click="markSeen(link.id)"
    @auxclick="markSeen(link.id)"
  >
    <Card
      class="relative h-full gap-0 overflow-hidden bg-secondary-background py-0 transition-all group-hover:translate-x-boxShadowX group-hover:translate-y-boxShadowY group-hover:shadow-none"
      :class="{ 'opacity-45': number !== undefined && seen.has(link.id) }"
    >
      <span
        v-if="number"
        class="absolute top-2 left-2 z-10 flex size-9 items-center justify-center rounded-base border-2 border-border bg-accent font-heading text-black"
      >
        <Check v-if="seen.has(link.id)" class="size-5" aria-label="Opened" />
        <template v-else>{{ number }}</template>
      </span>
      <img
        v-if="link.cover && !coverBroken"
        :src="link.cover"
        alt=""
        loading="lazy"
        class="aspect-video w-full border-b-2 border-border object-cover"
        @error="coverBroken = true"
      />
      <CardHeader class="gap-3 px-4 pt-4" :class="{ 'pt-14': number !== undefined && (!link.cover || coverBroken) }">
        <div class="flex items-center justify-between gap-2">
          <Badge :variant="link.type === 'video' ? 'default' : 'neutral'" class="uppercase">
            {{ link.type }}
          </Badge>
          <span class="min-w-0 truncate text-xs">{{ link.domain }}</span>
        </div>
        <CardTitle class="line-clamp-4 font-title text-lg leading-snug font-heading break-words" :title="link.title">
          {{ link.title }}
          <ArrowUpRight class="inline size-4 align-baseline" aria-hidden="true" />
        </CardTitle>
      </CardHeader>
      <CardContent class="px-4 pt-2 pb-4 text-sm">
        <p v-if="link.note" class="border-l-4 border-main pl-2 font-heading">{{ link.note }}</p>
        <p v-else-if="link.excerpt" class="line-clamp-2 opacity-80">{{ link.excerpt }}</p>
      </CardContent>
    </Card>
  </a>
</template>
