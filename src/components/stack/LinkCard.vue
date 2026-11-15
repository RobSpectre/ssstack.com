<script setup lang="ts">
import { ArrowUpRight } from 'lucide-vue-next'
import { ref } from 'vue'
import { Badge } from '@/components/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/card'
import type { StackLink } from '@/types'

defineProps<{ link: StackLink }>()

// Covers are hot-linked from other sites, so some will 404 over six years.
const coverBroken = ref(false)
</script>

<template>
  <a
    :href="link.link"
    target="_blank"
    rel="noopener noreferrer"
    class="group block h-full rounded-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  >
    <Card
      class="h-full gap-0 overflow-hidden bg-secondary-background py-0 transition-all group-hover:translate-x-boxShadowX group-hover:translate-y-boxShadowY group-hover:shadow-none"
    >
      <img
        v-if="link.cover && !coverBroken"
        :src="link.cover"
        alt=""
        loading="lazy"
        class="aspect-video w-full border-b-2 border-border object-cover"
        @error="coverBroken = true"
      />
      <CardHeader class="gap-3 px-4 pt-4">
        <div class="flex items-center justify-between gap-2">
          <Badge :variant="link.type === 'video' ? 'default' : 'neutral'" class="uppercase">
            {{ link.type }}
          </Badge>
          <span class="min-w-0 truncate text-xs">{{ link.domain }}</span>
        </div>
        <CardTitle class="font-title text-lg leading-snug font-heading break-words">
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
